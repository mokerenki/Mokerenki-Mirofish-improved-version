import { useState, useRef, useEffect } from "react";
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
import { Network, TrendingUp, Calendar, Info } from "lucide-react";
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
  }>;
}

interface Props {
  data: VisualizationData;
  viewMode?: "network" | "timeline" | "heatmap" | "all";
}

export default function AdvancedVisualization({ data, viewMode = "all" }: Props) {
  const [activeView, setActiveView] = useState<"network" | "timeline" | "heatmap">("network");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredFactor, setHoveredFactor] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Network Graph Visualization with Enhanced Interactivity
  useEffect(() => {
    if (activeView !== "network" || !svgRef.current || !data.relationships.length) return;

    const width = svgRef.current.clientWidth;
    const height = 400;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create nodes from factors
    const nodes = data.factors.map((factor, i) => ({
      id: factor,
      group: i % 3,
    }));

    // Create links from relationships
    const links = data.relationships.map((rel) => ({
      source: rel.source,
      target: rel.target,
      strength: rel.strength,
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25));

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

    // Add links with hover effects
    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 2)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)")
      .on("mouseenter", function (this: any, event: any, d: any) {
        d3.select(this).attr("stroke", "#3b82f6").attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 3);
      })
      .on("mouseleave", function (this: any) {
        d3.select(this).attr("stroke", "#cbd5e1").attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 2);
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
      .attr("r", 12)
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
        d3.select(event.target).attr("r", 16).attr("stroke-width", 3);
      })
      .on("mouseleave", (event: any) => {
        setHoveredFactor(null);
        d3.select(event.target).attr("r", 12).attr("stroke-width", 2);
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

    // Node labels
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .text((d: any) => d.id.substring(0, 3));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none");

    node.on("mousemove", (event: any, d: any) => {
      tooltip
        .style("display", "block")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px")
        .html(`<strong>${d.id}</strong><br/>Influence: ${Math.round(Math.random() * 100)}%`);
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
      </div>

      {/* Network Graph View */}
      {activeView === "network" && (
        <InteractiveVisualizationWrapper title="Factor Relationship Network">
          <div className="w-full bg-white/30">
            <svg ref={svgRef} className="w-full" />
            {selectedNode && (
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-border/60 rounded-lg p-3 text-sm max-w-xs">
                <div className="font-semibold text-foreground">{selectedNode}</div>
                <div className="text-foreground/70 text-xs mt-1">
                  Click to deselect • Drag nodes to reposition • Hover for details
                </div>
              </div>
            )}
          </div>
        </InteractiveVisualizationWrapper>
      )}

      {/* Timeline View */}
      {activeView === "timeline" && (
        <InteractiveVisualizationWrapper title="Scenario Probability Timeline">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={timelineData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                label={{ value: "Month", position: "insideBottomRight", offset: -5 }}
              />
              <YAxis label={{ value: "Probability", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "6px",
                  color: "white",
                }}
                cursor={{ stroke: "#3b82f6", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="probability"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProbability)"
              />
              <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="5 5" label="50%" />
            </AreaChart>
          </ResponsiveContainer>
        </InteractiveVisualizationWrapper>
      )}

      {/* Heatmap View */}
      {activeView === "heatmap" && (
        <InteractiveVisualizationWrapper title="Factor Impact Heatmap">
          <div className="space-y-4 p-4">
            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">Filter:</span>
              <button
                onClick={() => setFilterCategory(null)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  filterCategory === null
                    ? "bg-blue-500 text-white"
                    : "bg-white/50 text-foreground hover:bg-white/80"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterCategory === cat
                      ? "bg-blue-500 text-white"
                      : "bg-white/50 text-foreground hover:bg-white/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Heatmap Grid */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredHeatmapData} margin={{ top: 20, right: 30, left: 100, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="factor"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: "Impact Score", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                  }}
                  formatter={(value: any) => `${Math.round(value)}%`}
                />
                <Legend />
                <Bar dataKey="impact" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {filteredHeatmapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[Math.floor((entry.impact / 100) * (COLORS.length - 1))]}
                      opacity={hoveredFactor === entry.factor ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-2 text-xs text-foreground/70 mt-4">
              <Info className="h-3 w-3" />
              <span>Hover over bars to highlight • Click category filters to focus</span>
            </div>
          </div>
        </InteractiveVisualizationWrapper>
      )}
    </div>
  );
}
