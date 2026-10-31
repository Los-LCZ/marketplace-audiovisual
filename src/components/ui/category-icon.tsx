import { Camera, Clapperboard, Drum, Mic, Trees, type LucideProps } from "lucide-react";
import type { SpaceCategory } from "@/types/database";

const ICONS = {
  filming_set: Clapperboard,
  photo_studio: Camera,
  outdoor_location: Trees,
  recording_studio: Mic,
  rehearsal_room: Drum,
} as const;

export function CategoryIcon({ category, ...props }: { category: SpaceCategory } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon aria-hidden {...props} />;
}
