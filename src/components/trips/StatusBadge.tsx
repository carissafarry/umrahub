import type { StepStatus } from "@/lib/trips/checklist";

const badgeClassName: Record<StepStatus, string> = {
  completed: "bg-success-soft text-success",
  in_progress: "bg-warning-soft text-warning",
  not_started: "border border-border bg-surface-raised text-muted",
};

// Step status pill, shared by the checklist rows and the step detail page.
export function StatusBadge({
  status,
  label,
}: {
  status: StepStatus;
  label: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClassName[status]}`}
    >
      {label}
    </span>
  );
}
