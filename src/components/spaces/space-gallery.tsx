import Image from "next/image";
import { SpaceImage } from "./space-image";

// Foto principal + hasta 4 miniaturas (en pantallas grandes).
export function SpaceGallery({ images, title }: { images: string[]; title: string }) {
  const [main, ...rest] = images;
  const thumbs = rest.slice(0, 4);

  if (!thumbs.length) {
    return <SpaceImage src={main} alt={title} priority sizes="(min-width: 1024px) 1152px, 100vw" className="rounded-2xl" />;
  }

  return (
    <div className="grid gap-2 overflow-hidden rounded-2xl lg:grid-cols-4 lg:grid-rows-2">
      <SpaceImage
        src={main}
        alt={title}
        priority
        sizes="(min-width: 1024px) 576px, 100vw"
        className="lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:h-full"
      />
      {thumbs.map((src, i) => (
        <div key={src} className="relative hidden aspect-[4/3] bg-muted lg:block">
          <Image src={src} alt={`${title} — foto ${i + 2}`} fill sizes="288px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}
