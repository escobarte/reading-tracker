// Задаёт пароль входа существующему пользователю (ALLOWED_EMAIL) и закрывает его прежние входы.
//
//   npm run auth:set-password
//
// DATABASE_URL и ALLOWED_EMAIL берутся из .env.local (переменные окружения имеют приоритет).
// Пароль спрашивается с клавиатуры и не показывается: аргументом он остался бы в истории команд.
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

// Те же границы, что у Better Auth по умолчанию.
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

class UserError extends Error {}

async function askPasswordTwice(): Promise<string> {
  // Вывод в никуда: readline не повторяет набранное на экране.
  const muted = new Writable({ write: (_chunk, _encoding, done) => done() });
  const reader = createInterface({ input: process.stdin, output: muted, terminal: Boolean(process.stdin.isTTY) });
  reader.on("SIGINT", () => {
    reader.close();
    process.stdout.write("\n");
    process.exit(130);
  });
  const lines = reader[Symbol.asyncIterator]();
  const ask = async (question: string) => {
    process.stdout.write(question);
    const { value, done } = await lines.next();
    process.stdout.write("\n");
    if (done) throw new UserError("Пароль не введён.");
    return value;
  };

  try {
    const password = await ask(`Новый пароль (от ${MIN_LENGTH} знаков): `);
    if (password.length < MIN_LENGTH) throw new UserError(`Пароль короче ${MIN_LENGTH} знаков.`);
    if (password.length > MAX_LENGTH) throw new UserError(`Пароль длиннее ${MAX_LENGTH} знаков.`);
    if ((await ask("Ещё раз: ")) !== password) throw new UserError("Пароли не совпали.");
    return password;
  } finally {
    reader.close();
  }
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL;
  const email = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (!url) throw new UserError("DATABASE_URL не задан.");
  if (!email) throw new UserError("ALLOWED_EMAIL не задан.");

  const sql = postgres(url, { onnotice: () => {} });
  try {
    const [owner] = await sql`select id from "user" where lower(email) = ${email}`;
    if (!owner) throw new UserError(`В базе нет пользователя ${email}. Проверьте ALLOWED_EMAIL.`);
    console.log(`Пользователь: ${email}`);

    const hash = await hashPassword(await askPasswordTwice());

    await sql.begin(async (tx) => {
      // Вход по паролю в Better Auth — запись `credential`, где account_id равен id пользователя.
      const updated = await tx`
        update account set password = ${hash}, updated_at = now()
        where user_id = ${owner.id} and provider_id = 'credential'
        returning id`;
      if (updated.length === 0) {
        await tx`
          insert into account (user_id, provider_id, account_id, password)
          values (${owner.id}, 'credential', ${owner.id}, ${hash})`;
      }
      await tx`delete from session where user_id = ${owner.id}`;
    });
    console.log("Пароль задан. Прежние входы закрыты.");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  // Свои сообщения показываются как есть, у прочих ошибок — только текст, без строки подключения.
  console.error(error instanceof UserError ? error.message : `Ошибка: ${(error as Error).message}`);
  process.exitCode = 1;
});
