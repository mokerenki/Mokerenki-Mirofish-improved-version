import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Activity, AlertCircle, RefreshCw } from "lucide-react";

export interface DataSource {
  id: string;
  name: string;
  type: "financial" | "news" | "social" | "weather" | "custom";
  status: "connected" | "disconnected" | "error";
  lastUpdate: Date;
  data?: any[];
}

export interface RealTimeMetrics {
  sources: DataSource[];
  stockPrice?: number;
  priceChange?: number;
  sentiment?: number;
  newsCount?: number;
  weatherAlert?: string;
  trendingTopics?: string[];
}

interface Props {
  metrics: RealTimeMetrics;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function RealTimeDataIntegration({ metrics, isLoading, onRefresh }: Props) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Sample time-series data for visualization
  const timeSeriesData = [
    { time: "09:00", price: 145.2, sentiment: 0.65, volume: 1200 },
    { time: "10:00", price: 146.8, sentiment: 0.68, volume: 1500 },
    { time: "11:00", price: 145.5, sentiment: 0.62, volume: 1100 },
    { time: "12:00", price: 147.3, sentiment: 0.70, volume: 1800 },
    { time: "13:00", price: 148.1, sentiment: 0.72, volume: 2000 },
    { time: "14:00", price: 147.6, sentiment: 0.68, volume: 1600 },
  ];

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "financial":
        return <TrendingUp size={16} />;
      case "news":
        return <AlertCircle size={16} />;
      case "social":
        return <Activity size={16} />;
      default:
        return <RefreshCw size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-50";
      case "disconnected":
        return "text-gray-600 bg-gray-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.stockPrice !== undefined && (
          <div className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Stock Price</span>
              {metrics.priceChange && metrics.priceChange > 0 ? (
                <TrendingUp size={16} className="text-green-600" />
              ) : (
                <TrendingDown size={16} className="text-red-600" />
              )}
            </div>
            <div className="text-2xl font-bold text-foreground">${metrics.stockPrice.toFixed(2)}</div>
            <p className={`text-xs mt-1 ${metrics.priceChange && metrics.priceChange > 0 ? "text-green-600" : "text-red-600"}`}>
              {metrics.priceChange && metrics.priceChange > 0 ? "+" : ""}
              {metrics.priceChange?.toFixed(2)}%
            </p>
          </div>
        )}

        {metrics.sentiment !== undefined && (
          <div className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Sentiment</span>
              <Activity size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {(metrics.sentiment * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.sentiment > 0.7 ? "Very Positive" : metrics.sentiment > 0.5 ? "Positive" : "Neutral"}
            </p>
          </div>
        )}

        {metrics.newsCount !== undefined && (
          <div className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">News Articles</span>
              <AlertCircle size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.newsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </div>
        )}

        {metrics.weatherAlert && (
          <div className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Weather</span>
              <AlertCircle size={16} className="text-purple-600" />
            </div>
            <div className="text-sm font-semibold text-foreground truncate">{metrics.weatherAlert}</div>
            <p className="text-xs text-muted-foreground mt-1">Active alert</p>
          </div>
        )}
      </div>

      {/* Time Series Chart */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Price & Sentiment Trend</h3>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={16} className="text-muted-foreground" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timeSeriesData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.82 0.22 145)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="oklch(0.82 0.22 145)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 1]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              formatter={(value, name) => {
                if (name === "price") return `$${(value as number).toFixed(2)}`;
                if (name === "sentiment") return `${((value as number) * 100).toFixed(0)}%`;
                return value;
              }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="price"
              name="Stock Price ($)"
              stroke="oklch(0.72 0.18 45)"
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="sentiment"
              name="Sentiment Score"
              stroke="oklch(0.82 0.22 145)"
              fillOpacity={1}
              fill="url(#colorSentiment)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Data Sources Status */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <h3 className="font-semibold text-foreground mb-4">Connected Data Sources</h3>
        <div className="space-y-3">
          {metrics.sources.map(source => (
            <div
              key={source.id}
              className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{getSourceIcon(source.type)}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{source.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{source.type}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(source.status)}`}>
                  {source.status === "connected" ? "✓ Connected" : source.status === "error" ? "✗ Error" : "○ Disconnected"}
                </div>
              </div>

              {expandedSource === source.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Last updated: {source.lastUpdate.toLocaleTimeString()}
                  </p>
                  {source.data && source.data.length > 0 && (
                    <div className="text-xs space-y-1">
                      {source.data.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{item.label}</span>
                          <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      {metrics.trendingTopics && metrics.trendingTopics.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-3">Trending Topics</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.trendingTopics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                #{topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
