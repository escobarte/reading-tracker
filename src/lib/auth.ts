// Better Auth: вход по паролю и через Google для единственного владельца. Только для сервера.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { account, session, user, verification } from "@/db/schema";

const DAY_SECONDS = 60 * 60 * 24;

/** Cookie со способом последнего входа ("email" или "google") — для экрана настроек. */
export const LOGIN_METHOD_COOKIE = "better-auth.last_used_login_method";

function requireEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "ALLOWED_EMAIL"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Единственный владелец приложения. Без `ALLOWED_EMAIL` не подходит никто. */
export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase() === requireEnv("ALLOWED_EMAIL").toLowerCase();
}

/** Вход через Google настроен, только когда заданы обе переменные. */
function googleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function isGoogleEnabled(): boolean {
  return googleCredentials() !== null;
}

function createAuth() {
  requireEnv("ALLOWED_EMAIL");
  const google = googleCredentials();
  const db = getDb();

  return betterAuth({
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    // id — колонки uuid, значения выдаёт база.
    advanced: { database: { generateId: "uuid" } },
    emailAndPassword: { enabled: true, disableSignUp: true },
    // disableSignUp: незнакомый Google-аккаунт не создаёт пользователя. Свой аккаунт привязывается
    // к существующему пользователю по подтверждённому email при первом входе.
    socialProviders: google ? { google: { ...google, disableSignUp: true } } : {},
    // Пароль проверяется только через Server Action формы входа: там свой лимит попыток
    // (login-rate-limit.ts). Встроенный лимит HTTP-адреса считает по X-Forwarded-For и обходится.
    disabledPaths: ["/sign-in/email"],
    // Ошибки входа через Google показывает экран входа, а не страница Better Auth.
    onAPIError: { errorURL: "/login" },
    // Год с последнего захода: приложение личное и не должно просить вход заново.
    session: { expiresIn: 365 * DAY_SECONDS, updateAge: DAY_SECONDS },
    // Второй рубеж помимо закрытой регистрации: ни пользователя, ни входа для другого email,
    // даже если такая запись окажется в базе.
    databaseHooks: {
      user: {
        create: {
          before: async (data) => (isAllowedEmail(data.email) ? undefined : false),
        },
      },
      session: {
        create: {
          before: async (data) => {
            const [owner] = await db.select({ email: user.email }).from(user).where(eq(user.id, data.userId));
            return owner && isAllowedEmail(owner.email) ? undefined : false;
          },
        },
      },
    },
    telemetry: { enabled: false },
    plugins: [
      lastLoginMethod({ cookieName: LOGIN_METHOD_COOKIE, maxAge: 400 * DAY_SECONDS }),
      // Должен быть последним: переносит cookie из ответов Better Auth в Server Actions.
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Создаётся при первом обращении: сборке переменные входа не нужны. */
export function getAuth() {
  return (instance ??= createAuth());
}
