import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Imagen de portada con relación 4:3 y placeholder cuando el espacio no tiene fotos.
export function SpaceImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
          <span className="sr-only">Sin fotos</span>
        </div>
      )}
    </div>
  );
}
