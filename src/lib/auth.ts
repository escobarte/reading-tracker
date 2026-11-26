// Better Auth: вход по паролю и через Google для единственного владельца. Только для сервера.
// Пока приложение входит через Supabase; сюда оно переключится на этапе 7.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { account, session, user, verification } from "@/db/schema";

const DAY_SECONDS = 60 * 60 * 24;

function requireEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "ALLOWED_EMAIL"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Google включается, только когда заданы обе переменные: одна без другой — ошибка настройки. */
function googleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId && !clientSecret) return {};
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together");
  // disableSignUp: незнакомый Google-аккаунт не создаёт пользователя. Свой аккаунт привязывается
  // к существующему пользователю по подтверждённому email при первом входе.
  return { google: { clientId, clientSecret, disableSignUp: true } };
}

function createAuth() {
  const allowedEmail = requireEnv("ALLOWED_EMAIL").toLowerCase();
  const isAllowed = (email: string) => email.toLowerCase() === allowedEmail;
  const db = getDb();

  return betterAuth({
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    // id — колонки uuid, значения выдаёт база.
    advanced: { database: { generateId: "uuid" } },
    emailAndPassword: { enabled: true, disableSignUp: true },
    socialProviders: googleProvider(),
    // Год с последнего захода: приложение личное и не должно просить вход заново.
    session: { expiresIn: 365 * DAY_SECONDS, updateAge: DAY_SECONDS },
    // Второй рубеж помимо закрытой регистрации: ни пользователя, ни входа для другого email,
    // даже если такая запись окажется в базе.
    databaseHooks: {
      user: {
        create: {
          before: async (data) => (isAllowed(data.email) ? undefined : false),
        },
      },
      session: {
        create: {
          before: async (data) => {
            const [owner] = await db.select({ email: user.email }).from(user).where(eq(user.id, data.userId));
            return owner && isAllowed(owner.email) ? undefined : false;
          },
        },
      },
    },
    telemetry: { enabled: false },
    // Должен быть последним: переносит cookie из ответов Better Auth в Server Actions.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Создаётся при первом обращении: сборке переменные входа не нужны. */
export function getAuth() {
  return (instance ??= createAuth());
}
