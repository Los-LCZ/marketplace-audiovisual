import Link from "next/link";
import type { SpaceWithAmenities } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { formatCLP } from "@/lib/utils";
import { SpaceStatusBadge } from "@/components/ui/badge";
import { RatingSummary } from "@/components/ui/rating";
import { SpaceImage } from "@/components/spaces/space-image";
import { SpaceStatusControl } from "./space-status-control";

export function HostSpaceRow({ space }: { space: SpaceWithAmenities }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
      <SpaceImage src={space.images[0]} alt={space.title} sizes="160px" className="rounded-xl sm:w-40 sm:shrink-0" />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/espacios/${space.id}`} className="font-semibold hover:underline">
            {space.title}
          </Link>
          <SpaceStatusBadge status={space.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {SPACE_CATEGORY_LABELS[space.category]} · {space.commune}, {space.city}
        </p>
        <p className="text-sm">
          {formatCLP(space.price_per_hour)} / hora · mín. {space.min_hours} h
        </p>
        <RatingSummary avgRating={space.avg_rating} reviewCount={space.review_count} />
      </div>
      <SpaceStatusControl spaceId={space.id} status={space.status} />
    </li>
  );
}
