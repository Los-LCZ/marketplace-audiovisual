import Image from "next/image";
import Link from "next/link";
import type { SpaceWithAmenities } from "@/lib/queries/spaces";
import { formatCLP } from "@/lib/utils";
import { SpaceStatusBadge } from "@/components/ui/badge";
import { RatingPill } from "@/components/ui/rating";
import { SpaceStatusControl } from "./space-status-control";

export function HostSpaceRow({ space }: { space: SpaceWithAmenities }) {
  return (
    <li className="panel overflow-hidden">
      <Link href={`/espacios/${space.id}`} className="block no-underline">
        <div className="relative aspect-video bg-[var(--s2)]">
          {space.images[0] && <Image src={space.images[0]} alt={space.title} fill sizes="360px" className="object-cover" />}
        </div>
        <div className="flex items-center justify-between gap-2.5 p-3.5">
          <span className="min-w-0">
            <b className="block truncate">{space.title}</b>
            <span className="dim text-[13px]">{formatCLP(space.price_per_hour)} por hora</span>
          </span>
          <RatingPill rating={space.avg_rating} count={space.review_count} />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3.5 py-2.5">
        <SpaceStatusBadge status={space.status} />
        <SpaceStatusControl spaceId={space.id} status={space.status} />
      </div>
    </li>
  );
}
