"use client";

import { useFormStatus } from "react-dom";
import { useLocale } from "@/i18n/LocaleProvider";
import { GoogleIcon } from "./GoogleIcon";

export function GoogleButton() {
  const { t } = useLocale();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text disabled:opacity-50"
    >
      <GoogleIcon />
      {pending ? t.login.googlePending : t.login.google}
    </button>
  );
}
