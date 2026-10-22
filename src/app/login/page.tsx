import { AppShell } from "@/components/layout/AppShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AppShell variant="bare">
      <LoginForm />
    </AppShell>
  );
}
