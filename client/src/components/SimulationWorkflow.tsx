import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export type StageKey = "graph" | "prepare" | "simulate" | "report";
export type StageStatus = "idle" | "active" | "complete";

export interface WorkflowState {
  graph: StageStatus;
  prepare: StageStatus;
  simulate: StageStatus;
  report: StageStatus;
  progress: number;
}

const STAGES: { key: StageKey; label: string }[] = [
  { key: "graph", label: "GRAPH" },
  { key: "prepare", label: "PREPARE" },
  { key: "simulate", label: "SIMULATE" },
  { key: "report", label: "REPORT" },
];

interface Props {
  workflow: WorkflowState;
}

export default function SimulationWorkflow({ workflow }: Props) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const target = workflow.progress;
    const step = target > displayProgress ? 1 : -1;
    if (displayProgress === target) return;
    const timer = setTimeout(() => {
      setDisplayProgress(p => {
        const next = p + step;
        if (step > 0 && next >= target) return target;
        if (step < 0 && next <= target) return target;
        return next;
      });
    }, 12);
    return () => clearTimeout(timer);
  }, [workflow.progress, displayProgress]);

  return (
    <div className="flex flex-col gap-3">
      {/* Stage pills row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STAGES.map((stage, idx) => {
          const status = workflow[stage.key];
          return (
            <div key={stage.key} className="flex items-center gap-1">
              <span
                className={`stage-pill ${
                  status === "active"
                    ? "stage-pill-active"
                    : status === "complete"
                    ? "stage-pill-complete"
                    : "stage-pill-inactive"
                }`}
              >
                {status === "active" && (
                  <Loader2 size={9} className="animate-spin flex-shrink-0" />
                )}
                {status === "complete" && (
                  <Check size={9} className="flex-shrink-0" />
                )}
                {stage.label}
              </span>
              {idx < STAGES.length - 1 && (
                <span className="workflow-arrow text-muted-foreground/50 text-xs font-mono">→</span>
              )}
            </div>
          );
        })}
        <span className="ml-2 font-mono-label text-xs font-semibold text-muted-foreground">
          {displayProgress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="confidence-bar w-full max-w-xs">
        <div
          className="confidence-fill"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}

export function createInitialWorkflow(): WorkflowState {
  return {
    graph: "idle",
    prepare: "idle",
    simulate: "idle",
    report: "idle",
    progress: 0,
  };
}
