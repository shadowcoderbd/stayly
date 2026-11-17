"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { fieldStyles } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** Comma-separated amenities that turn into removable chips as you type (spec F-11). */
export function AmenitiesInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const next = [...value];
    for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean))
      if (!next.some((a) => a.toLowerCase() === part.toLowerCase())) next.push(part.slice(0, 40));
    onChange(next);
  };

  const onInput = (text: string) => {
    if (!text.includes(",")) return setDraft(text);
    const parts = text.split(",");
    add(parts.slice(0, -1).join(","));
    setDraft(parts.at(-1)!.trimStart());
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Amenities">
          {value.map((a) => (
            <li key={a} className="inline-flex h-7 items-center gap-1 rounded-full bg-subtle pr-1 pl-2.5 text-[13px]">
              {a}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== a))}
                className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
                aria-label={`Remove ${a}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="text"
        value={draft}
        placeholder="Wi-Fi, Breakfast, Pool"
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onInput(e.target.value)}
        onBlur={() => {
          if (draft.trim()) add(draft);
          setDraft("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) add(draft);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        className={cn(fieldStyles, "h-10")}
      />
      <p id={`${id}-hint`} className="text-[13px] text-muted">
        Separate with commas or press Enter.
      </p>
    </div>
  );
}
