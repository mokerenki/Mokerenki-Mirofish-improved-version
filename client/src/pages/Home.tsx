import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Sparkles, ArrowRight, Zap, Brain, Lightbulb, Github, BookOpen, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-4 pt-4 pb-2 backdrop-blur-sm bg-white/80 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Brain size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">Project 26</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <Github size={16} />
                GitHub
              </a>
              <a
                href="#"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <BookOpen size={16} />
                Docs
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
              <Zap size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">AI-Powered Scenario Engine</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight text-slate-900 mb-4">
                Predict the
                <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Unpredictable
                </span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Ask any question. Our AI simulation engine explores scenarios, analyzes relationships, and delivers structured predictions in real-time.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                <Lightbulb size={20} className="text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900">Multi-Agent</p>
                <p className="text-xs text-slate-600 mt-1">Parallel LLM analysis</p>
              </div>
              <div className="p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                <Brain size={20} className="text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-slate-900">Entity Graphs</p>
                <p className="text-xs text-slate-600 mt-1">Visualize relationships</p>
              </div>
            </div>
          </div>

          {/* Right: Input Section */}
          <div className="space-y-6">
            {/* Input Box */}
            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-all duration-300" />
                <div className="relative bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 hover:border-blue-400 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about any scenario..."
                    className="w-full bg-transparent text-lg font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleStart}
                  disabled={createConversation.isPending || !question.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  {createConversation.isPending ? "Starting..." : "Start Simulation"}
                </button>
              </div>
            </div>

            {/* Sample Questions */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-600">Try asking:</p>
              <div className="space-y-2">
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSample(q)}
                    className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <p className="text-sm text-slate-700 group-hover:text-slate-900 font-medium line-clamp-2">
                      {q}
                    </p>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 pt-16 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">4</div>
              <p className="text-slate-600 font-medium">Simulation Stages</p>
              <p className="text-sm text-slate-500 mt-1">GRAPH → PREPARE → SIMULATE → REPORT</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">∞</div>
              <p className="text-slate-600 font-medium">Scenario Branches</p>
              <p className="text-sm text-slate-500 mt-1">Explore all possibilities</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">Real-time</div>
              <p className="text-slate-600 font-medium">Streaming Results</p>
              <p className="text-sm text-slate-500 mt-1">Watch predictions unfold</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
