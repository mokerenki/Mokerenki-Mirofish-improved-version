import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Sparkles, ArrowRight, Paperclip, ChevronRight, Layers, MessageSquare, BarChart3, Github, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const SAMPLE_QUESTIONS = [
  "If a product raises its price next quarter, how will customer sentiment and narrative spread evolve?",
  "If a brand suddenly changes its spokesperson, how might public opinion move?",
  "If a policy enters public debate, which groups are likely to support or oppose it first?",
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: (conv) => {
      navigate(`/chat/${conv.id}?q=${encodeURIComponent(question)}`);
    },
    onError: () => {
      toast.error("Failed to start conversation");
    },
  });

  const handleStart = () => {
    const q = question.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    createConversation.mutate({ title: q.slice(0, 100) });
  };

  const handleSample = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--miro-cream)", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <div className="max-w-6xl mx-auto">
          <div className="nav-pill flex items-center justify-between px-5 py-3">
            <span className="font-mono-label font-bold text-sm tracking-widest" style={{ color: "var(--miro-teal)" }}>
              MIROFISH
            </span>
            <div className="flex items-center gap-1">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github size={14} />
                GitHub
              </a>
              <a
                href="#"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <BookOpen size={14} />
                Docs
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left: Hero content */}
          <div className="animate-fade-in-up">
            {/* Badge pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="badge-pill badge-pill-teal">
                <Sparkles size={10} className="mr-1" />
                MiroFish Prediction Engine
              </span>
              <span className="badge-pill badge-pill-neutral">Text-First</span>
              <span className="badge-pill badge-pill-neutral">Optional Attachments</span>
            </div>

            {/* Headline */}
            <h1
              className="font-serif-display text-5xl lg:text-6xl font-bold leading-[1.08] mb-5"
              style={{ color: "var(--miro-teal)", letterSpacing: "-0.02em" }}
            >
              Predict Anything,<br />
              <span style={{ color: "oklch(0.15 0.02 250)" }}>but talk to it<br />like ChatGPT.</span>
            </h1>

            {/* Subheadline */}
            <p className="font-mono-label text-xs font-semibold tracking-widest mb-3" style={{ color: "var(--miro-teal)" }}>
              AI SIMULATION CHAT FOR SCENARIO PREDICTION
            </p>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-md">
              Ask a question directly and let the system handle{" "}
              <span className="inline-flex items-center gap-1 mx-0.5">
                <span className="stage-pill stage-pill-active" style={{ fontSize: "0.65rem", padding: "0.15rem 0.6rem" }}>seed</span>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="stage-pill stage-pill-active" style={{ fontSize: "0.65rem", padding: "0.15rem 0.6rem" }}>simulation</span>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="stage-pill" style={{ fontSize: "0.65rem", padding: "0.15rem 0.6rem", background: "oklch(0.72 0.18 45 / 0.15)", color: "oklch(0.45 0.12 45)", border: "1px solid oklch(0.72 0.18 45 / 0.3)" }}>report</span>
              </span>{" "}
              as one continuous prediction workflow.
            </p>

            {/* Input box */}
            <div className="dashed-input-border mb-3 bg-white/60">
              <div className="px-4 pt-4 pb-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or drop a PDF / MD / TXT file"
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 text-sm outline-none"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              <div className="px-4 pb-3">
                <p className="text-xs text-muted-foreground/60 italic">
                  Example: If a product raises its price next quarter, how will customer sentiment and narrative spread change?
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleStart}
                disabled={createConversation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ background: "var(--miro-teal)", color: "oklch(0.95 0.02 185)" }}
              >
                {createConversation.isPending ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                Start Chat
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border bg-white/70 text-foreground hover:bg-white transition-all duration-200"
              >
                View Examples
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = getLoginUrl(); return; }
                  navigate("/chat/new");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border bg-white/70 text-foreground hover:bg-white transition-all duration-200"
              >
                <Paperclip size={14} />
                Attach Files
              </button>
            </div>
          </div>

          {/* Right: Orchestration preview + features */}
          <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Orchestration card */}
            <div className="orchestration-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={14} style={{ color: "var(--miro-green)" }} />
                <span className="font-mono-label text-xs font-semibold tracking-widest" style={{ color: "var(--miro-green)" }}>
                  ORCHESTRATION PREVIEW
                </span>
              </div>
              <div id="examples" className="flex flex-col gap-2.5">
                {SAMPLE_QUESTIONS.map((q, i) => (
                  <button key={i} className="sample-q-btn" onClick={() => handleSample(q)}>
                    <span className="font-mono-label text-xs font-semibold tracking-wider block mb-1" style={{ color: "oklch(0.65 0.08 145)" }}>
                      SAMPLE {i + 1}
                    </span>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 gap-3">
              <FeatureCard
                icon={<MessageSquare size={16} />}
                title="Text-first"
                description="Start with a question, then decide whether supporting files are necessary without losing the speed of chat."
              />
              <FeatureCard
                icon={<Layers size={16} />}
                title="Multi-agent"
                description="Run graph building, simulation, and reporting behind the scenes while keeping the user inside a single conversation."
              />
              <FeatureCard
                icon={<BarChart3 size={16} />}
                title="Result cards"
                description="Drop a structured result card below each answer with a summary, report entry point, and follow-up path."
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono-label font-semibold tracking-widest" style={{ color: "var(--miro-teal)" }}>MIROFISH</span>
          <span>AI Simulation Chat for Scenario Prediction</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.22 0.06 185 / 0.08)", color: "var(--miro-teal)" }}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
