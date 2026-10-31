"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Amenity, AmenityCategory } from "@/types/database";
import { AMENITY_CATEGORY_LABELS } from "@/lib/labels";
import { AmenityIcon } from "@/components/ui/amenity-icon";

const ORDER: AmenityCategory[] = ["audio", "video", "general"];

// Equipamiento técnico agrupado (audio, video, general) en acordeón; los dos primeros abiertos.
export function GearAccordion({ amenities }: { amenities: Amenity[] }) {
  const groups = ORDER.map((c) => [c, amenities.filter((a) => a.category === c)] as const).filter(([, items]) => items.length);
  const [open, setOpen] = useState<AmenityCategory[]>(groups.slice(0, 2).map(([c]) => c));

  return (
    <div className="acc-list">
      {groups.map(([category, items]) => {
        const expanded = open.includes(category);
        return (
          <div key={category} className="acc-item">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen((list) => (expanded ? list.filter((c) => c !== category) : [...list, category]))}
            >
              <span className="ico">
                <AmenityIcon category={category} />
              </span>
              {AMENITY_CATEGORY_LABELS[category]}
              <span className="dim font-normal">{items.length}</span>
              <ChevronDown className="chev" aria-hidden />
            </button>
            <ul hidden={!expanded}>
              {items.map((a) => (
                <li key={a.id}>{a.name}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
