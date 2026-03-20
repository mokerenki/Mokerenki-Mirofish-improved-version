import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, BarChart3, Lightbulb, ArrowRight, Activity } from "lucide-react";
import type { SimulationResult } from "../../../drizzle/schema";

interface Props {
  result: SimulationResult;
  onFollowUp?: (question: string) => void;
}

const IMPACT_COLORS: Record<string, string> = {
  high: "oklch(0.55 0.22 25)",
  medium: "oklch(0.65 0.15 60)",
  low: "oklch(0.55 0.18 145)",
};

const IMPACT_BG: Record<string, string> = {
  high: "oklch(0.55 0.22 25 / 0.1)",
  medium: "oklch(0.65 0.15 60 / 0.1)",
  low: "oklch(0.55 0.18 145 / 0.1)",
};

export default function PredictionCard({ result, onFollowUp }: Props) {
  const [reportExpanded, setReportExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="prediction-card overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity size={13} style={{ color: "var(--miro-teal)" }} />
              <span className="font-mono-label text-xs font-semibold tracking-widest" style={{ color: "var(--miro-teal)" }}>
                PREDICTION RESULT
              </span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{result.question}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="font-mono-label text-xs text-muted-foreground">Confidence</span>
            <span className="font-serif-display text-2xl font-bold" style={{ color: "var(--miro-teal)" }}>
              {confidencePct}%
            </span>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 confidence-bar">
          <div className="confidence-fill" style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={13} style={{ color: "var(--miro-green)" }} />
          <span className="font-mono-label text-xs font-semibold tracking-widest text-muted-foreground">SUMMARY</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono-label text-xs text-muted-foreground">TIMEFRAME</span>
            <span className="text-xs font-semibold text-foreground">{result.timeframe}</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono-label text-xs text-muted-foreground">NODES</span>
            <span className="text-xs font-semibold text-foreground">{result.metadata.graphNodes}</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono-label text-xs text-muted-foreground">RUNS</span>
            <span className="text-xs font-semibold text-foreground">{result.metadata.simulationRuns.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Key Factors */}
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={13} style={{ color: "var(--miro-teal)" }} />
          <span className="font-mono-label text-xs font-semibold tracking-widest text-muted-foreground">KEY FACTORS</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.keyFactors.map((factor, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full border"
              style={{
                background: "oklch(0.22 0.06 185 / 0.06)",
                borderColor: "oklch(0.22 0.06 185 / 0.2)",
                color: "var(--miro-teal)",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {factor}
            </span>
          ))}
        </div>
      </div>

      {/* Scenarios */}
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={13} style={{ color: "var(--miro-teal)" }} />
          <span className="font-mono-label text-xs font-semibold tracking-widest text-muted-foreground">SCENARIOS</span>
        </div>
        <div className="flex flex-col gap-3">
          {result.scenarios.map((scenario, i) => (
            <div key={i} className="rounded-xl p-3.5 border border-border/60 bg-white/50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-foreground leading-snug">{scenario.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: IMPACT_BG[scenario.impact], color: IMPACT_COLORS[scenario.impact] }}
                  >
                    {scenario.impact}
                  </span>
                  <span className="font-mono-label text-sm font-bold" style={{ color: "var(--miro-teal)" }}>
                    {Math.round(scenario.probability * 100)}%
                  </span>
                </div>
              </div>
              {/* Probability bar */}
              <div className="confidence-bar mb-2">
                <div className="confidence-fill" style={{ width: `${Math.round(scenario.probability * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{scenario.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Report (expandable) */}
      <div className="border-b border-border/60">
        <button
          onClick={() => setReportExpanded(!reportExpanded)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} style={{ color: "var(--miro-orange)" }} />
            <span className="font-mono-label text-xs font-semibold tracking-widest text-muted-foreground">DETAILED REPORT</span>
            <span className="text-xs text-muted-foreground/60">({result.reportSections.length} sections)</span>
          </div>
          {reportExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>

        {reportExpanded && (
          <div className="px-5 pb-4 flex flex-col gap-2">
            {result.reportSections.map((section, i) => (
              <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{section.title}</span>
                  {expandedSection === i ? (
                    <ChevronUp size={13} className="text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedSection === i && (
                  <div className="px-4 pb-3 pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up questions */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight size={13} style={{ color: "var(--miro-green)" }} />
          <span className="font-mono-label text-xs font-semibold tracking-widest text-muted-foreground">FOLLOW-UP PATHS</span>
        </div>
        <div className="flex flex-col gap-2">
          {result.followUpQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp?.(q)}
              className="text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all duration-200 hover:border-opacity-60 group"
              style={{
                borderColor: "oklch(0.22 0.06 185 / 0.25)",
                background: "oklch(0.22 0.06 185 / 0.03)",
                color: "var(--miro-teal)",
              }}
            >
              <span className="group-hover:underline">{q}</span>
              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
