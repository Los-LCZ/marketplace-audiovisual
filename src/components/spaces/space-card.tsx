import Link from "next/link";
import { MapPin } from "lucide-react";
import type { SpaceWithAmenities } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RatingSummary } from "@/components/ui/rating";
import { SpaceImage } from "./space-image";

export function SpaceCard({ space, priority }: { space: SpaceWithAmenities; priority?: boolean }) {
  return (
    <Link
      href={`/espacios/${space.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative">
        <SpaceImage
          src={space.images[0]}
          alt={space.title}
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="transition-transform group-hover:scale-[1.02]"
        />
        <Badge className="absolute top-3 left-3 bg-surface/90 text-foreground backdrop-blur">
          {SPACE_CATEGORY_LABELS[space.category]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 font-semibold">{space.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {space.commune}, {space.city}
          </span>
        </p>
        <RatingSummary avgRating={space.avg_rating} reviewCount={space.review_count} />
        <p className="mt-auto pt-2 text-sm">
          <span className="text-base font-semibold">{formatCLP(space.price_per_hour)}</span>
          <span className="text-muted-foreground"> / hora</span>
          {space.min_hours > 1 && (
            <span className="text-muted-foreground"> · mín. {space.min_hours} h</span>
          )}
        </p>
      </div>
    </Link>
  );
}
