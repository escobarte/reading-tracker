import { AppShell } from "@/components/layout/AppShell";
import { isGoogleEnabled } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const googleEnabled = isGoogleEnabled();

  return (
    <AppShell variant="bare">
      {/* Параметр error ставит только неудачный вход через Google. */}
      <LoginForm googleEnabled={googleEnabled} googleError={googleEnabled && error !== undefined} />
    </AppShell>
  );
}
