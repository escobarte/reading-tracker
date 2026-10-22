"use client";

import { useActionState, useId, useState } from "react";
import { BookSpines } from "@/components/ui/BookSpines";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/i18n/LocaleProvider";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();

  const [brandLabel, ...brandTitleParts] = t.common.appName.split(" ");
  const brandTitle = brandTitleParts.join(" ");

  return (
    <div>
      <BookSpines />

      <div className="mt-5 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{brandLabel}</p>
        <p className="font-serif text-[36px] font-bold leading-[1.15] text-text">{brandTitle}</p>
        <p className="mt-1 font-serif text-lg italic text-muted">{t.login.tagline}</p>
      </div>

      <Card className="mt-6 flex flex-col gap-4 p-5 shadow-[var(--shadow-hero)] lg:p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            label={t.login.emailLabel}
            name="email"
            type="email"
            placeholder={t.login.emailPlaceholder}
            autoComplete="username"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordId} className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.login.passwordLabel}
            </label>
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="h-13 w-full rounded-md border-[1.5px] border-line bg-input px-4 pr-14 font-mono text-lg text-text outline-none focus:border-2 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} />
              </button>
            </div>
          </div>

          <Button type="submit" disabled={pending} className="h-14 w-full">
            {pending ? t.login.submitPending : t.login.submit}
          </Button>

          {state?.error && (
            <p className="text-center font-serif text-sm text-deadline">{t.login.error}</p>
          )}
        </form>
      </Card>

      <p className="mt-10 text-center font-mono text-xs text-muted lg:hidden">{t.common.appName}</p>
    </div>
  );
}
