import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_LABELS, SPACE_STATUS_LABELS } from "@/lib/labels";
import type { BookingStatus, SpaceStatus } from "@/types/database";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  primary: "bg-primary/10 text-primary",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const BOOKING_TONES: Record<BookingStatus, BadgeTone> = {
  requested: "warning",
  rejected: "neutral",
  expired: "neutral",
  pending_payment: "warning",
  confirmed: "primary",
  completed: "success",
  cancelled: "neutral",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_TONES[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>;
}

const SPACE_TONES: Record<SpaceStatus, BadgeTone> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

export function SpaceStatusBadge({ status }: { status: SpaceStatus }) {
  return <Badge tone={SPACE_TONES[status]}>{SPACE_STATUS_LABELS[status]}</Badge>;
}
