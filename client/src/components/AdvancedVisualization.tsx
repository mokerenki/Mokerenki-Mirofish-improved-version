"use client";
import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { Network, TrendingUp, Calendar, Info, HelpCircle } from "lucide-react";
import * as d3 from "d3";
import InteractiveVisualizationWrapper from "./InteractiveVisualizationWrapper";

export interface VisualizationData {
  factors: string[];
  scenarios: Array<{
    name: string;
    probability: number;
    timeline: Array<{ month: number; probability: number }>;
  }>;
  factorImpact: Array<{
    factor: string;
    impact: number;
    category: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    strength: number;
    type?: "positive" | "negative" | "causal" | "correlated";
  }>;
}

interface Props {
  data: VisualizationData;
  viewMode?: "network" | "timeline" | "heatmap" | "all";
}

// Factor descriptions for tooltips
const FACTOR_DESCRIPTIONS: Record<string, string> = {
  "Customer Sentiment": "Overall perception and satisfaction level of customers",
  "Market Demand": "Level of customer interest and purchasing intent",
  "Competitor Response": "Actions and reactions from competing products/services",
  "Price Sensitivity": "How much customer demand changes with price variations",
  "Brand Loyalty": "Customer tendency to repeat purchases and recommend",
  "Product Quality": "Perceived and actual quality of the offering",
  "Market Share": "Percentage of total market controlled by the product",
  "Revenue": "Total income generated from sales",
  "Profitability": "Net profit margin after all costs",
  "Customer Acquisition": "Rate of new customer acquisition",
  "Customer Retention": "Percentage of customers retained over time",
  "Operational Cost": "Total cost to produce and deliver the product",
};

// Relationship type descriptions
const RELATIONSHIP_TYPES: Record<string, { label: string; symbol: string; color: string }> = {
  positive: { label: "Positive Correlation", symbol: "→", color: "#22c55e" },
  negative: { label: "Negative Correlation", symbol: "⊣", color: "#ef4444" },
  causal: { label: "Causal Relationship", symbol: "→→", color: "#3b82f6" },
  correlated: { label: "Correlated", symbol: "↔", color: "#f59e0b" },
};

export default function AdvancedVisualization({ data, viewMode = "all" }: Props) {
  const [activeView, setActiveView] = useState<"network" | "timeline" | "heatmap">("network");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredFactor, setHoveredFactor] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Network Graph Visualization with Enhanced Labels, Edges, Legend, and Tooltips
  useEffect(() => {
    if (activeView !== "network" || !svgRef.current || !data.relationships.length) return;

    const width = svgRef.current.clientWidth;
    const height = 500;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create nodes from factors
    const nodes = data.factors.map((factor, i) => ({
      id: factor,
      group: i % 3,
      description: FACTOR_DESCRIPTIONS[factor] || "Key factor in the scenario",
    }));

    // Create links from relationships with type information
    const links = data.relationships.map((rel) => ({
      source: rel.source,
      target: rel.target,
      strength: rel.strength,
      type: rel.type || "correlated",
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

    // Add arrow markers for directed edges
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("refX", 20)
      .attr("refY", 3)
      .attr("orient", "auto")
      .append("polygon")
      .attr("points", "0 0, 10 3, 0 6")
      .attr("fill", "#64748b");

    // Add links with hover effects and edge labels
    const linkGroup = svg.append("g").attr("class", "links");

    const link = linkGroup
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => {
        const typeInfo = RELATIONSHIP_TYPES[d.type] || RELATIONSHIP_TYPES.correlated;
        return typeInfo.color;
      })
      .attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 2)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)")
      .on("mouseenter", function (this: any, event: any, d: any) {
        d3.select(this)
          .attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 4)
          .attr("stroke-opacity", 1);
        setHoveredEdge(`${d.source}-${d.target}`);
      })
      .on("mouseleave", function (this: any, d: any) {
        d3.select(this)
          .attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 2)
          .attr("stroke-opacity", 0.6);
        setHoveredEdge(null);
      });

    // Add edge labels showing relationship type and strength
    const edgeLabels = linkGroup
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("dy", "-5px")
      .attr("pointer-events", "none")
      .text((d: any) => {
        const typeInfo = RELATIONSHIP_TYPES[d.type] || RELATIONSHIP_TYPES.correlated;
        return `${typeInfo.symbol} ${(d.strength * 100).toFixed(0)}%`;
      });

    // Add nodes with enhanced interactivity
    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes as any)
      .enter()
      .append("g")
      .attr("class", "node-group");

    // Node circles
    node
      .append("circle" as any)
      .attr("r", 16)
      .attr("fill", (d: any) => {
        const colors = ["oklch(0.72 0.18 45)", "oklch(0.82 0.22 145)", "oklch(0.55 0.22 25)"];
        return colors[d.group];
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "node-circle")
      .on("click", (event: any, d: any) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      })
      .on("mouseenter", (event: any, d: any) => {
        setHoveredFactor(d.id);
        d3.select(event.target).attr("r", 20).attr("stroke-width", 3);
      })
      .on("mouseleave", (event: any) => {
        setHoveredFactor(null);
        d3.select(event.target).attr("r", 16).attr("stroke-width", 2);
      })
      .call(
        d3
          .drag()
          .on("start", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node labels (full factor names)
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .text((d: any) => d.id);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(15, 23, 42, 0.95)")
      .style("color", "white")
      .style("padding", "12px 16px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("border", "1px solid rgba(148, 163, 184, 0.2)")
      .style("z-index", "1000");

    node.on("mousemove", (event: any, d: any) => {
      tooltip
        .style("display", "block")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(
          `<strong>${d.id}</strong><br/><span style="color: #cbd5e1; font-size: 11px;">${d.description}</span>`
        );
    });

    node.on("mouseleave", () => {
      tooltip.style("display", "none");
    });

    return () => {
      tooltip.remove();
    };
  }, [activeView, data, selectedNode]);

  // Timeline View with Interactive Legend
  const timelineData = data.scenarios[0]?.timeline || [];

  // Heatmap View with Interactive Cells
  const heatmapData = data.factorImpact;
  const categories = Array.from(new Set(heatmapData.map((d) => d.category)));

  const filteredHeatmapData = filterCategory
    ? heatmapData.filter((d) => d.category === filterCategory)
    : heatmapData;

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  return (
    <div className="space-y-4">
      {/* View Selector */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-lg border border-border/60">
        <button
          onClick={() => setActiveView("network")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === "network"
              ? "bg-blue-500 text-white"
              : "bg-white/50 text-foreground hover:bg-white/80"
          }`}
        >
          <Network className="h-4 w-4" />
          Network
        </button>
        <button
          onClick={() => setActiveView("timeline")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === "timeline"
              ? "bg-blue-500 text-white"
              : "bg-white/50 text-foreground hover:bg-white/80"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Timeline
        </button>
        <button
          onClick={() => setActiveView("heatmap")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === "heatmap"
              ? "bg-blue-500 text-white"
              : "bg-white/50 text-foreground hover:bg-white/80"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Heatmap
        </button>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white/50 text-foreground hover:bg-white/80 transition-all"
        >
          <HelpCircle className="h-4 w-4" />
          Legend
        </button>
      </div>

      {/* Legend - Phase 1 Improvement */}
      {showLegend && activeView === "network" && (
        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-border/60">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Network Legend
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Relationship Types:</p>
              {Object.entries(RELATIONSHIP_TYPES).map(([key, info]) => (
                <div key={key} className="flex items-center gap-2 text-xs mb-1">
                  <span
                    className="w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: info.color }}
                  ></span>
                  <span className="text-slate-700">{info.label}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Node Colors:</p>
              <div className="flex items-center gap-2 text-xs mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.72 0.18 45)" }}></div>
                <span className="text-slate-700">Primary Factors</span>
              </div>
              <div className="flex items-center gap-2 text-xs mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.82 0.22 145)" }}></div>
                <span className="text-slate-700">Secondary Factors</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.55 0.22 25)" }}></div>
                <span className="text-slate-700">Outcome Factors</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 italic">
            💡 Tip: Hover over nodes to see descriptions. Click nodes to select. Drag to reposition.
          </p>
        </div>
      )}

      {/* Network Visualization */}
      {activeView === "network" && (
        <InteractiveVisualizationWrapper>
          <svg
            ref={svgRef}
            className="w-full border border-border/60 rounded-lg bg-white"
            style={{ minHeight: "500px" }}
          />
        </InteractiveVisualizationWrapper>
      )}

      {/* Timeline Visualization */}
      {activeView === "timeline" && (
        <div className="p-4 bg-white rounded-lg border border-border/60">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottomRight", offset: -5 }} />
              <YAxis label={{ value: "Probability (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Area type="monotone" dataKey="probability" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProbability)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Heatmap Visualization */}
      {activeView === "heatmap" && (
        <div className="p-4 bg-white rounded-lg border border-border/60">
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                filterCategory === null
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-foreground hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  filterCategory === cat
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-foreground hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredHeatmapData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="factor" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: "Impact Score", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Bar dataKey="impact" fill="#3b82f6">
                {filteredHeatmapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[Math.floor((entry.impact / 100) * (COLORS.length - 1))]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Selected Node Details - Phase 1 Improvement */}
      {selectedNode && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-sm mb-2">{selectedNode}</h3>
          <p className="text-sm text-slate-700 mb-3">
            {FACTOR_DESCRIPTIONS[selectedNode] || "Key factor in the scenario"}
          </p>
          <div className="text-xs text-slate-600">
            <p>
              <strong>Connected Factors:</strong>{" "}
              {data.relationships
                .filter((r) => r.source === selectedNode || r.target === selectedNode)
                .map((r) => (r.source === selectedNode ? r.target : r.source))
                .join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
