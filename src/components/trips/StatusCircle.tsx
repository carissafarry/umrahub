import { CheckIcon } from "@/components/ui/icons";
import type { StepStatus } from "@/lib/trips/checklist";

const circleClassName: Record<StepStatus, string> = {
  completed: "border-foreground bg-foreground text-background",
  in_progress: "border-accent bg-accent-soft",
  not_started: "border-border bg-surface-raised",
};

// Decorative status mark of a step row; the status text is always next to it.
export function StatusCircle({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 ${circleClassName[status]}`}
    >
      {status === "completed" && <CheckIcon className="size-3.5" />}
      {status === "in_progress" && (
        <span className="size-2 rounded-full bg-accent" />
      )}
    </span>
  );
}
