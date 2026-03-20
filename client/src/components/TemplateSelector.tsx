import { useState } from "react";
import { ChevronRight, Zap, TrendingUp, Users, AlertCircle, Heart } from "lucide-react";

export interface PredictionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  guidedPrompt: string;
  steps: Array<{
    title: string;
    placeholder: string;
  }>;
}

const INDUSTRY_TEMPLATES: PredictionTemplate[] = [
  {
    id: "pricing-strategy",
    name: "Pricing Strategy",
    description: "Analyze how price changes affect customer sentiment and market dynamics",
    category: "pricing",
    icon: <TrendingUp size={20} />,
    color: "oklch(0.72 0.18 45)",
    guidedPrompt: "I want to understand how a price change will affect my market position and customer behavior.",
    steps: [
      { title: "Current Price Point", placeholder: "e.g., $29.99 per month" },
      { title: "Proposed Price", placeholder: "e.g., $39.99 per month" },
      { title: "Target Market", placeholder: "e.g., SMB SaaS users" },
      { title: "Competitive Context", placeholder: "e.g., competitors charge $35-45" },
    ],
  },
  {
    id: "market-entry",
    name: "Market Entry",
    description: "Predict success factors and risks when entering a new market or geography",
    category: "market_entry",
    icon: <Zap size={20} />,
    color: "oklch(0.82 0.22 145)",
    guidedPrompt: "I'm planning to enter a new market and need to predict adoption and challenges.",
    steps: [
      { title: "Target Market", placeholder: "e.g., Southeast Asia" },
      { title: "Product/Service", placeholder: "e.g., AI-powered analytics platform" },
      { title: "Key Competitors", placeholder: "e.g., Tableau, Looker, Power BI" },
      { title: "Timeline", placeholder: "e.g., 12-18 months" },
    ],
  },
  {
    id: "competitive-response",
    name: "Competitive Response",
    description: "Predict how competitors will respond to your strategic moves",
    category: "competitive",
    icon: <Users size={20} />,
    color: "oklch(0.55 0.22 25)",
    guidedPrompt: "I need to predict how competitors will react to my strategic initiative.",
    steps: [
      { title: "Your Initiative", placeholder: "e.g., launching a free tier" },
      { title: "Key Competitors", placeholder: "e.g., Competitor A, B, C" },
      { title: "Their Strengths", placeholder: "e.g., larger customer base, more features" },
      { title: "Market Conditions", placeholder: "e.g., economic slowdown, rising demand" },
    ],
  },
  {
    id: "policy-impact",
    name: "Policy Impact",
    description: "Analyze how policy changes or regulations will affect your business",
    category: "policy",
    icon: <AlertCircle size={20} />,
    color: "oklch(0.65 0.15 60)",
    guidedPrompt: "I need to understand the potential impact of policy or regulatory changes.",
    steps: [
      { title: "Policy/Regulation", placeholder: "e.g., new data privacy law" },
      { title: "Your Industry", placeholder: "e.g., fintech" },
      { title: "Current Compliance", placeholder: "e.g., 80% compliant" },
      { title: "Implementation Timeline", placeholder: "e.g., 18 months" },
    ],
  },
  {
    id: "sentiment-tracking",
    name: "Sentiment Tracking",
    description: "Predict how public sentiment will evolve around your brand or product",
    category: "sentiment",
    icon: <Heart size={20} />,
    color: "oklch(0.55 0.18 145)",
    guidedPrompt: "I want to predict how public sentiment will change regarding my brand or initiative.",
    steps: [
      { title: "Current Sentiment", placeholder: "e.g., mixed, 60% positive" },
      { title: "Trigger Event", placeholder: "e.g., product launch, CEO announcement" },
      { title: "Key Stakeholders", placeholder: "e.g., customers, investors, media" },
      { title: "Historical Context", placeholder: "e.g., previous sentiment shifts" },
    ],
  },
];

interface Props {
  onSelectTemplate: (template: PredictionTemplate) => void;
  onCustom: () => void;
}

export default function TemplateSelector({ onSelectTemplate, onCustom }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? INDUSTRY_TEMPLATES.filter(t => t.category === selectedCategory)
    : INDUSTRY_TEMPLATES;

  const categories = Array.from(new Set(INDUSTRY_TEMPLATES.map(t => t.category)));

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif-display text-2xl font-bold text-foreground mb-2">
          Prediction Templates
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a template to get guided through a structured prediction workflow, or start with a custom question.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedCategory === null
              ? "bg-foreground text-background"
              : "border border-border bg-white text-foreground hover:bg-muted"
          }`}
        >
          All Templates
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
              selectedCategory === cat
                ? "bg-foreground text-background"
                : "border border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            {cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {filteredTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="text-left p-5 rounded-2xl border border-border hover:border-foreground/30 hover:shadow-md transition-all bg-white group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${template.color}20`, color: template.color }}
              >
                {template.icon}
              </div>
              <ChevronRight
                size={16}
                className="text-muted-foreground group-hover:text-foreground transition-colors"
              />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {template.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {template.steps.map((step, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {step.title}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Custom Question Option */}
      <div className="border-t border-border pt-6">
        <button
          onClick={onCustom}
          className="w-full px-5 py-4 rounded-2xl border-2 border-dashed border-border hover:border-foreground/50 hover:bg-muted/30 transition-all text-center"
        >
          <p className="font-semibold text-foreground mb-1">Custom Question</p>
          <p className="text-xs text-muted-foreground">
            Ask any prediction question without a template
          </p>
        </button>
      </div>
    </div>
  );
}
