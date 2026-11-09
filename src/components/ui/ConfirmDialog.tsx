"use client";

import { useState } from "react";
import { Button, buttonBaseClass } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/i18n/LocaleProvider";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  titleId: string;
  title: string;
  description: string;
  confirmLabel: string;
};

/** Диалог подтверждения удаления: заголовок, пояснение, «Удалить» (цвет --deadline) и «Отмена». */
export function ConfirmDialog({ open, onClose, onConfirm, titleId, title, description, confirmLabel }: ConfirmDialogProps) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    await onConfirm();
  }

  return (
    <Modal open={open} onClose={onClose} titleId={titleId} title={title}>
      <p className="font-serif text-base text-muted">{description}</p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className={`${buttonBaseClass} h-14 w-full rounded-xl bg-deadline text-accent-on text-lg px-6 shadow-[var(--shadow-cta)]`}
        >
          {confirmLabel}
        </button>
        <Button variant="text" onClick={onClose} disabled={pending} className="w-full justify-center">
          {t.common.cancel}
        </Button>
      </div>
    </Modal>
  );
}
