import { AppShell } from "@/components/layout/AppShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const errorValue = Array.isArray(error) ? error[0] : error;
  const googleError = errorValue === "google";

  return (
    <AppShell variant="bare">
      <LoginForm googleError={googleError} />
    </AppShell>
  );
}
