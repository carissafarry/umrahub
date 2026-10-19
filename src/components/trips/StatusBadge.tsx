import type { StepStatus } from "@/lib/trips/checklist";

const badgeClassName: Record<StepStatus, string> = {
  completed: "bg-tile-green text-tile-green-foreground",
  in_progress: "bg-tile-amber text-tile-amber-foreground",
  not_started: "border border-border text-muted",
};

// Step status pill, shared by the checklist accordion and the step detail page.
export function StatusBadge({
  status,
  label,
}: {
  status: StepStatus;
  label: string;
}) {
  return (
    <span
      className={`shrink-0 self-start rounded-full px-3 py-1 text-sm font-medium md:self-center ${badgeClassName[status]}`}
    >
      {label}
    </span>
  );
}
