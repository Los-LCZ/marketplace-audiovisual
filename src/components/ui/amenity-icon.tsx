import { AudioLines, Lightbulb, Zap, type LucideProps } from "lucide-react";
import type { AmenityCategory } from "@/types/database";

const ICONS = { audio: AudioLines, video: Lightbulb, general: Zap } as const;

export function AmenityIcon({ category, ...props }: { category: AmenityCategory } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon aria-hidden {...props} />;
}
