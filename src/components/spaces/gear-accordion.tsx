"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Lightbulb, Mic, SlidersHorizontal, Speaker } from "lucide-react";
import type { Amenity, AmenityCategory, GearGroup } from "@/types/database";
import { AMENITY_CATEGORY_LABELS, GEAR_CATEGORY_LABELS } from "@/lib/labels";
import { AmenityIcon } from "@/components/ui/amenity-icon";

const GEAR_ICONS = { microfonos: Mic, consolas: SlidersHorizontal, amplificacion: Speaker, iluminacion: Lightbulb };
const AMENITY_ORDER: AmenityCategory[] = ["audio", "video", "general"];

type Group = { key: string; label: string; icon: ReactNode; items: string[] };

/**
 * Equipamiento técnico en acordeón; los dos primeros grupos abiertos. Primero el
 * equipamiento detallado del espacio (`gear`) y después las amenities por categoría.
 */
export function GearAccordion({ gear, amenities }: { gear: GearGroup[]; amenities: Amenity[] }) {
  const groups: Group[] = [
    ...gear
      .filter((g) => g.items.length)
      .map((g) => {
        const Icon = GEAR_ICONS[g.category];
        return { key: g.category, label: GEAR_CATEGORY_LABELS[g.category], icon: <Icon aria-hidden />, items: g.items };
      }),
    ...AMENITY_ORDER.map((c) => ({
      key: c,
      label: AMENITY_CATEGORY_LABELS[c],
      icon: <AmenityIcon category={c} />,
      items: amenities.filter((a) => a.category === c).map((a) => a.name),
    })).filter((g) => g.items.length),
  ];
  const [open, setOpen] = useState<string[]>(groups.slice(0, 2).map((g) => g.key));

  return (
    <div className="acc-list">
      {groups.map(({ key, label, icon, items }) => {
        const expanded = open.includes(key);
        return (
          <div key={key} className="acc-item">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen((list) => (expanded ? list.filter((k) => k !== key) : [...list, key]))}
            >
              <span className="ico">{icon}</span>
              {label}
              <span className="dim font-normal">{items.length}</span>
              <ChevronDown className="chev" aria-hidden />
            </button>
            <ul hidden={!expanded}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
