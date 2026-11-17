import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hotel photo with a neutral placeholder when a hotel has none. Photos are pre-sized webp from the API. */
export function HotelImage({
  image,
  fallbackAlt,
  className,
  priority = false,
}: {
  image: { url: string; alt: string } | null;
  fallbackAlt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!image)
    return (
      <div role="img" aria-label={`${fallbackAlt}: no photo yet`} className={cn("flex items-center justify-center bg-line text-faint", className)}>
        <ImageOff className="size-6" aria-hidden />
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- API already serves resized webp
    <img
      src={image.url}
      alt={image.alt || fallbackAlt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("block w-full object-cover", className)}
    />
  );
}
