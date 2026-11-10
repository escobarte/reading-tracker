"use client";

import { useState } from "react";
import { StitchBar } from "@/components/ui/StitchBar";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { localDateKey } from "@/lib/time";
import { ZipBuilder } from "@/lib/export/zip";

function filenameFromResponse(res: Response, fallback: string): string {
  const match = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** arrayBuffer(), не text(): text() декодирует и снимает BOM у UTF-8, а CSV должен сохранить его как есть. */
async function fetchAsBytes(url: string, fallbackFilename: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; filename: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`export_failed:${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, filename: filenameFromResponse(res, fallbackFilename) };
}

type DownloadState = "idle" | "pending" | "error";

type SimpleDownloadButtonProps = {
  label: string;
  pendingLabel: string;
  errorLabel: string;
  url: string;
  fallbackFilename: string;
  className?: string;
};

function SimpleDownloadButton({ label, pendingLabel, errorLabel, url, fallbackFilename, className = "" }: SimpleDownloadButtonProps) {
  const [state, setState] = useState<DownloadState>("idle");

  async function handleClick() {
    setState("pending");
    try {
      const { bytes, filename } = await fetchAsBytes(url, fallbackFilename);
      triggerBlobDownload(new Blob([bytes]), filename);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "pending"}
        className="flex min-h-11 h-14 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch bg-surface px-4 text-center font-serif text-base text-text disabled:opacity-60"
      >
        {state === "pending" ? pendingLabel : label}
      </button>
      {state === "error" && <p className="mt-1.5 font-serif text-sm text-deadline">{errorLabel}</p>}
    </div>
  );
}

type ZipState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "photos"; current: number; total: number }
  | { phase: "done"; skipped: number }
  | { phase: "error" };

type PhotoRef = { noteId: string; url: string };

function buildReadme(today: string, skippedIds: string[]): string {
  const skippedBlock =
    skippedIds.length > 0
      ? `\nНе удалось скачать фото для заметок (пропущены): ${skippedIds.join(", ")}\nCouldn't download photos for these notes (skipped): ${skippedIds.join(", ")}\n`
      : "";

  return `Reading Tracker — полный бэкап / full backup
Версия формата / format version: 1
Дата / date: ${today}

Файлы в архиве / Files in this archive:
- reading-tracker-${today}.json — все данные целиком: книги, прочтения, сессии, заметки, цели, настройки.
  All data in one file: books, readings, sessions, notes, goals, settings.
- books-${today}.csv — книги в табличном виде. Books as a spreadsheet.
- sessions-${today}.csv — сессии чтения в табличном виде. Reading sessions as a spreadsheet.
- notes.md — все заметки в формате Markdown. All notes in Markdown.
- photos/ — фото заметок. Note photos.

Фото связаны с заметками по имени файла: photos/{note_id}.jpg, где note_id — это поле
"id" соответствующей заметки в JSON-файле; там же поле "photo_path" хранит исходный путь
в хранилище.
Photos are matched to notes by file name: photos/{note_id}.jpg, where note_id is the "id"
of the matching note in the JSON file; its "photo_path" field there is the original storage path.
${skippedBlock}`;
}

function BackupZipButton() {
  const { t } = useLocale();
  const [state, setState] = useState<ZipState>({ phase: "idle" });

  async function handleClick() {
    setState({ phase: "preparing" });
    try {
      const [jsonResult, booksCsvResult, sessionsCsvResult, notesMdResult, photosRes] = await Promise.all([
        fetchAsBytes("/api/export/json", "reading-tracker.json"),
        fetchAsBytes("/api/export/books.csv", "books.csv"),
        fetchAsBytes("/api/export/sessions.csv", "sessions.csv"),
        fetchAsBytes("/notes/export", "notes.md"),
        fetch("/api/export/photos", { cache: "no-store" }),
      ]);
      if (!photosRes.ok) throw new Error("export_failed:photos");
      const { photos } = (await photosRes.json()) as { photos: PhotoRef[] };

      const today = localDateKey(new Date());
      const encoder = new TextEncoder();
      const zip = new ZipBuilder();
      zip.addFile(`reading-tracker-${today}.json`, jsonResult.bytes);
      zip.addFile(`books-${today}.csv`, booksCsvResult.bytes);
      zip.addFile(`sessions-${today}.csv`, sessionsCsvResult.bytes);
      zip.addFile("notes.md", notesMdResult.bytes);

      const skippedIds: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setState({ phase: "photos", current: i + 1, total: photos.length });
        const photo = photos[i];
        try {
          const photoRes = await fetch(photo.url, { cache: "no-store" });
          if (!photoRes.ok) throw new Error();
          const bytes = new Uint8Array(await photoRes.arrayBuffer());
          zip.addFile(`photos/${photo.noteId}.jpg`, bytes);
        } catch {
          skippedIds.push(photo.noteId);
        }
      }

      zip.addFile("README.txt", encoder.encode(buildReadme(today, skippedIds)));

      const blob = zip.build();
      triggerBlobDownload(blob, `reading-tracker-backup-${today}.zip`);
      setState({ phase: "done", skipped: skippedIds.length });
    } catch {
      setState({ phase: "error" });
    }
  }

  const busy = state.phase === "preparing" || state.phase === "photos";
  const label =
    state.phase === "preparing"
      ? t.settings.dataPreparing
      : state.phase === "photos"
        ? formatTemplate(t.settings.dataZipPhotosProgress, { current: state.current, total: state.total })
        : t.settings.dataBackupZip;

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface px-4 py-2 text-center disabled:opacity-60"
      >
        <span className="font-serif text-base text-text">{label}</span>
        {state.phase === "idle" && <span className="font-mono text-xs text-muted">{t.settings.dataBackupZipHint}</span>}
      </button>
      {state.phase === "photos" && (
        <div className="mt-2">
          <StitchBar percent={Math.round((state.current / state.total) * 100)} />
        </div>
      )}
      {state.phase === "done" && state.skipped > 0 && (
        <p className="mt-1.5 font-serif text-sm text-deadline">
          {formatTemplate(t.settings.dataZipSkippedWarning, { count: state.skipped })}
        </p>
      )}
      {state.phase === "error" && <p className="mt-1.5 font-serif text-sm text-deadline">{t.settings.dataError}</p>}
    </div>
  );
}

export function DataSection() {
  const { t } = useLocale();

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.settings.dataTitle}</h2>
      <div className="flex flex-col gap-3">
        <SimpleDownloadButton
          label={t.settings.dataJson}
          pendingLabel={t.settings.dataPreparing}
          errorLabel={t.settings.dataError}
          url="/api/export/json"
          fallbackFilename="reading-tracker.json"
        />
        <div className="flex gap-3">
          <SimpleDownloadButton
            className="flex-1"
            label={t.settings.dataBooksCsv}
            pendingLabel={t.settings.dataPreparing}
            errorLabel={t.settings.dataError}
            url="/api/export/books.csv"
            fallbackFilename="books.csv"
          />
          <SimpleDownloadButton
            className="flex-1"
            label={t.settings.dataSessionsCsv}
            pendingLabel={t.settings.dataPreparing}
            errorLabel={t.settings.dataError}
            url="/api/export/sessions.csv"
            fallbackFilename="sessions.csv"
          />
        </div>
        <SimpleDownloadButton
          label={t.settings.dataNotesMarkdown}
          pendingLabel={t.settings.dataPreparing}
          errorLabel={t.settings.dataError}
          url="/notes/export"
          fallbackFilename="notes.md"
        />
        <BackupZipButton />
      </div>
      <p className="mt-3 font-serif text-sm text-muted">{t.settings.dataPhotosHint}</p>
    </section>
  );
}
