import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

export interface ModelPrediction {
  modelName: string;
  confidence: number;
  summary: string;
  keyFactors: string[];
  scenarios: Array<{
    name: string;
    probability: number;
  }>;
}

export interface EnsembleResult {
  models: ModelPrediction[];
  consensusConfidence: number;
  agreementScore: number;
  variance: number;
  recommendation: string;
}

interface Props {
  ensemble: EnsembleResult;
  isLoading?: boolean;
}

export default function MultiModelEnsemble({ ensemble, isLoading }: Props) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  // Prepare data for agreement heatmap
  const agreementData = ensemble.models.map((model, idx) => ({
    model: model.modelName,
    confidence: model.confidence,
    index: idx,
  }));

  // Prepare scenario comparison data
  const scenarioComparison = ensemble.models[0]?.scenarios.map((scenario, idx) => {
    const row: any = { scenario: scenario.name };
    ensemble.models.forEach(model => {
      row[model.modelName] = model.scenarios[idx]?.probability || 0;
    });
    return row;
  }) || [];

  const getAgreementColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Consensus Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase">Consensus Confidence</span>
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900">
            {(ensemble.consensusConfidence * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-green-700 mt-1">Average across all models</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase">Model Agreement</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className={`text-3xl font-bold ${getAgreementColor(ensemble.agreementScore)}`}>
            {(ensemble.agreementScore * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-blue-700 mt-1">How well models agree</p>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700 uppercase">Variance</span>
            <AlertCircle size={16} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {(ensemble.variance * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-purple-700 mt-1">Prediction spread</p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-sm font-semibold text-amber-900 mb-1">Ensemble Recommendation</p>
        <p className="text-sm text-amber-800">{ensemble.recommendation}</p>
      </div>

      {/* Model Confidence Comparison */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <h3 className="font-semibold text-foreground mb-4">Model Confidence Comparison</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={agreementData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="model" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => `${(value as number * 100).toFixed(1)}%`}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
            <Bar dataKey="confidence" fill="oklch(0.72 0.18 45)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Probability Comparison */}
      {scenarioComparison.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-4">Scenario Probability Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scenarioComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="scenario" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => `${(value as number * 100).toFixed(1)}%`}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
              <Legend />
              {ensemble.models.map((model, idx) => {
                const colors = [
                  "oklch(0.72 0.18 45)",
                  "oklch(0.82 0.22 145)",
                  "oklch(0.55 0.22 25)",
                  "oklch(0.65 0.15 60)",
                ];
                return (
                  <Bar
                    key={model.modelName}
                    dataKey={model.modelName}
                    fill={colors[idx % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Individual Model Details */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Individual Model Predictions</h3>
        {ensemble.models.map(model => (
          <div
            key={model.modelName}
            className="p-4 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => setExpandedModel(expandedModel === model.modelName ? null : model.modelName)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{model.modelName}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">{model.summary}</p>
              </div>
              <div className="text-right ml-4">
                <div className="text-2xl font-bold text-foreground">
                  {(model.confidence * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedModel === model.modelName && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Key Factors</p>
                  <div className="flex flex-wrap gap-2">
                    {model.keyFactors.slice(0, 5).map((factor, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Top Scenarios</p>
                  <div className="space-y-1">
                    {model.scenarios.slice(0, 3).map((scenario, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{scenario.name}</span>
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full"
                            style={{ width: `${scenario.probability * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {(scenario.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
