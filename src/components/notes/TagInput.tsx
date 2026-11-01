"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatTemplate } from "@/i18n/format";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  label: string;
  placeholder: string;
  removeLabelTemplate: string;
};

/**
 * Теги через запятую/Enter с Chip-крестиком и подсказками. Зона удаления тега — 44px (правило 44×44),
 * выше обычного Chip (24px) из DESIGN.md: это новый интерактивный элемент, без макета.
 */
export function TagInput({ tags, onChange, suggestions, label, placeholder, removeLabelTemplate }: TagInputProps) {
  const baseId = useId();
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const value = raw.trim();
    if (!value) {
      setDraft("");
      return;
    }
    const exists = tags.some((tag) => tag.toLowerCase() === value.toLowerCase());
    onChange(exists ? tags : [...tags, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  const remainingSuggestions = suggestions.filter(
    (suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${baseId}-input`} className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
        {label}
      </label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={formatTemplate(removeLabelTemplate, { tag })}
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-dashed border-stitch px-3 font-mono text-xs text-muted"
            >
              {tag}
              <Icon name="close" width={12} height={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <input
        id={`${baseId}-input`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        list={remainingSuggestions.length > 0 ? `${baseId}-list` : undefined}
        placeholder={placeholder}
        className="h-12 rounded-md border-[1.5px] border-line bg-input px-4 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
      />
      {remainingSuggestions.length > 0 && (
        <datalist id={`${baseId}-list`}>
          {remainingSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  );
}
