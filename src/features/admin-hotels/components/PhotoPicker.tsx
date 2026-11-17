"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { toast } from "@/lib/toast";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES, MAX_UPLOAD_MB } from "@/lib/domain/hotel";

export type PendingPhoto = { key: string; file: File; alt: string; preview: string };

/** Checks type and size in the browser; the server re-checks the real format. */
export function acceptPhotos(files: FileList | null, room: number): File[] {
  const list = Array.from(files ?? []);
  const ok = list.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_UPLOAD_MB * 1024 * 1024);
  if (ok.length < list.length) toast.error(`Use JPG, PNG or WebP images up to ${MAX_UPLOAD_MB} MB.`);
  if (ok.length > room) toast.error(`A hotel can have at most ${MAX_IMAGES} photos.`);
  return ok.slice(0, Math.max(0, room));
}

/** Photos chosen for a hotel that doesn't exist yet. They upload right after it's created. */
export function PhotoPicker({ value, onChange }: { value: PendingPhoto[]; onChange: (next: PendingPhoto[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews] = useState(() => new Set<string>());

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (files: FileList | null) => {
    const accepted = acceptPhotos(files, MAX_IMAGES - value.length).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.add(preview);
      return { key: preview, file, alt: "", preview };
    });
    onChange([...value, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2.5">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {value.map((p, i) => (
            <li key={p.key} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.preview} alt="" className="size-14 flex-none rounded-lg object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs text-muted">{i === 0 ? "Cover" : `Photo ${i + 1}`}</span>
                <Input
                  aria-label={`Alt text for photo ${i + 1}`}
                  placeholder="Describe the photo"
                  maxLength={160}
                  value={p.alt}
                  onChange={(e) => onChange(value.map((x) => (x.key === p.key ? { ...x, alt: e.target.value } : x)))}
                  className="h-9"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.key !== p.key))}
                className="inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < MAX_IMAGES && (
        <label className={buttonStyles({ variant: "outline", size: "md", className: "self-start" })}>
          <ImagePlus className="size-4" aria-hidden /> Add photos
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(e) => add(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}
