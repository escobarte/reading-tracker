"use client";

import { Input } from "./Input";
import { Pill } from "./Pill";
import { useLocale } from "@/i18n/LocaleProvider";

const MAX_CHIPS = 12;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

type GenreFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
};

/** Text input for a book's genre with chips of previously used genres (replaces the datalist that Android Chrome can't open). */
export function GenreField({ label, value, onChange, suggestions }: GenreFieldProps) {
  const { t } = useLocale();
  const query = normalize(value);
  const visible = (query ? suggestions.filter((s) => normalize(s).includes(query)) : suggestions).slice(
    0,
    MAX_CHIPS,
  );

  return (
    <div className="flex flex-col gap-2">
      <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {visible.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.addbook.genreUsedLabel}</p>
          <div className="flex flex-wrap gap-2">
            {visible.map((suggestion) => (
              <Pill
                key={suggestion}
                type="button"
                active={normalize(suggestion) === query}
                onClick={() => onChange(suggestion)}
              >
                {suggestion}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
