"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { HotelImage, type HotelImageData } from "@/features/hotels";
import { cn } from "@/lib/utils";
import { usePhotoMutations } from "../hooks/useHotelMutations";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES } from "@/lib/domain/hotel";
import { acceptPhotos } from "./PhotoPicker";

/** Upload, reorder, set the cover, edit alt text and remove photos of a saved hotel (spec F-11). */
export function PhotoManager({ hotelId, images, isPublished }: { hotelId: string; images: HotelImageData[]; isPublished: boolean }) {
  const { uploadPhotos, isUploading, arrangePhotos, isArranging, removePhoto, isRemoving } = usePhotoMutations(hotelId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [alts, setAlts] = useState<Record<string, string>>({});
  const isBusy = isUploading || isArranging || isRemoving;

  const altOf = (img: HotelImageData) => alts[img.id] ?? img.alt;
  const save = (ordered: HotelImageData[]) => arrangePhotos(ordered.map((img) => ({ id: img.id, alt: altOf(img) })));
  const move = (from: number, to: number) => {
    const next = [...images];
    const [img] = next.splice(from, 1);
    next.splice(to, 0, img!);
    save(next);
  };

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4" aria-labelledby="photos-heading">
      <div className="flex items-center justify-between gap-3">
        <h3 id="photos-heading" className="text-sm font-semibold">
          Photos <span className="font-normal text-muted">· {images.length} of {MAX_IMAGES}</span>
        </h3>
        {images.length < MAX_IMAGES && (
          <label className={buttonStyles({ variant: "outline", size: "sm", className: cn(isBusy && "pointer-events-none opacity-50") })}>
            <ImagePlus className="size-3.5" aria-hidden /> {isUploading ? "Uploading…" : "Add photos"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              multiple
              disabled={isBusy}
              className="sr-only"
              onChange={(e) => {
                const files = acceptPhotos(e.target.files, MAX_IMAGES - images.length);
                if (files.length) uploadPhotos(files.map((file) => ({ file, alt: "" })));
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-center text-[13px] text-muted">
          No photos yet. Add at least one to publish this hotel.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={isBusy}>
          {images.map((img, i) => (
            <li key={img.id} className="flex gap-3">
              <HotelImage image={img} fallbackAlt="" className="size-16 flex-none rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  {i === 0 ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary px-2 text-[11px] font-semibold text-white">
                      <Star className="size-3" aria-hidden /> Cover
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={isBusy} onClick={() => move(i, 0)}>
                      Set as cover
                    </Button>
                  )}
                  <span className="ml-auto flex gap-1">
                    <IconButton label={`Move photo ${i + 1} earlier`} disabled={isBusy || i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowLeft className="size-3.5" aria-hidden />
                    </IconButton>
                    <IconButton label={`Move photo ${i + 1} later`} disabled={isBusy || i === images.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowRight className="size-3.5" aria-hidden />
                    </IconButton>
                    {confirmId === img.id ? (
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isBusy}
                        onClick={() => removePhoto(img.id, { onSettled: () => setConfirmId(null) })}
                        onBlur={() => setConfirmId(null)}
                      >
                        Remove?
                      </Button>
                    ) : (
                      <IconButton
                        label={`Remove photo ${i + 1}`}
                        disabled={isBusy || (isPublished && images.length === 1)}
                        onClick={() => setConfirmId(img.id)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </IconButton>
                    )}
                  </span>
                </div>
                <Input
                  aria-label={`Alt text for photo ${i + 1}`}
                  placeholder="Describe the photo"
                  maxLength={160}
                  value={altOf(img)}
                  onChange={(e) => setAlts({ ...alts, [img.id]: e.target.value })}
                  onBlur={() => {
                    if (altOf(img).trim() !== img.alt) save(images);
                  }}
                  className="h-8 text-[13px]"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {isPublished && images.length === 1 && (
        <p className="text-[13px] text-muted">A published hotel keeps at least one photo. Hide it first to remove this one.</p>
      )}
    </section>
  );
}

function IconButton({ label, children, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-surface text-muted hover:bg-hover hover:text-ink disabled:cursor-default disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}
