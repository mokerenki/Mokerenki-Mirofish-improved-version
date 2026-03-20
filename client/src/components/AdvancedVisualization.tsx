import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ComposedChart, Bar, BarChart } from "recharts";
import { Network, TrendingUp, Calendar } from "lucide-react";
import * as d3 from "d3";

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
  const svgRef = useRef<SVGSVGElement>(null);

  // Network Graph Visualization
  useEffect(() => {
    if (activeView !== "network" || !svgRef.current || !data.relationships.length) return;

    const width = svgRef.current.clientWidth;
    const height = 400;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create nodes from factors
    const nodes = data.factors.map(factor => ({
      id: factor,
      group: Math.floor(Math.random() * 3),
    }));

    // Create links from relationships
    const links = data.relationships.map(rel => ({
      source: rel.source,
      target: rel.target,
      strength: rel.strength,
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

    // Add links
    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", (d: any) => Math.sqrt(d.strength) * 2)
      .attr("stroke-opacity", 0.6);

    // Add nodes
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => {
        const colors = ["oklch(0.72 0.18 45)", "oklch(0.82 0.22 145)", "oklch(0.55 0.22 25)"];
        return colors[d.group];
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
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
          }) as any
      );

    // Add labels
    const labels = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#1f2937")
      .text((d: any) => d.id.substring(0, 12));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });
  }, [activeView, data]);

  // Timeline data preparation
  const timelineData = data.scenarios.map(scenario => {
    const points: any = { name: scenario.name };
    scenario.timeline.forEach(point => {
      points[`month_${point.month}`] = point.probability * 100;
    });
    return points;
  });

  // Heatmap data preparation
  const heatmapData = data.factors.map(factor => {
    const row: any = { factor };
    data.scenarios.forEach(scenario => {
      row[scenario.name] = scenario.probability * 100;
    });
    return row;
  });

  const showNetwork = viewMode === "all" || viewMode === "network";
  const showTimeline = viewMode === "all" || viewMode === "timeline";
  const showHeatmap = viewMode === "all" || viewMode === "heatmap";

  return (
    <div className="space-y-6">
      {viewMode === "all" && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView("network")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeView === "network"
                ? "bg-foreground text-background"
                : "border border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            <Network size={16} />
            Network
          </button>
          <button
            onClick={() => setActiveView("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeView === "timeline"
                ? "bg-foreground text-background"
                : "border border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            <Calendar size={16} />
            Timeline
          </button>
          <button
            onClick={() => setActiveView("heatmap")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeView === "heatmap"
                ? "bg-foreground text-background"
                : "border border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            <TrendingUp size={16} />
            Heatmap
          </button>
        </div>
      )}

      {/* Network Graph */}
      {(showNetwork || activeView === "network") && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Network size={18} />
            Factor Relationship Network
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Drag nodes to explore relationships between factors. Line thickness indicates relationship strength.
          </p>
          <svg ref={svgRef} className="w-full border border-border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100" />
        </div>
      )}

      {/* Timeline Visualization */}
      {(showTimeline || activeView === "timeline") && timelineData.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar size={18} />
            Scenario Evolution Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorScenario1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="oklch(0.72 0.18 45)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorScenario2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.82 0.22 145)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="oklch(0.82 0.22 145)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: "Probability (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                formatter={(value) => `${(value as number).toFixed(1)}%`}
              />
              <Legend />
              {data.scenarios.slice(0, 2).map((scenario, idx) => (
                <Area
                  key={scenario.name}
                  type="monotone"
                  dataKey={`month_${idx}`}
                  name={scenario.name}
                  stroke={idx === 0 ? "oklch(0.72 0.18 45)" : "oklch(0.82 0.22 145)"}
                  fillOpacity={1}
                  fill={idx === 0 ? "url(#colorScenario1)" : "url(#colorScenario2)"}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Heatmap */}
      {(showHeatmap || activeView === "heatmap") && heatmapData.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            Factor Impact Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold text-foreground">Factor</th>
                  {data.scenarios.map(scenario => (
                    <th key={scenario.name} className="text-center py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium text-foreground text-xs">{row.factor}</td>
                    {data.scenarios.map(scenario => {
                      const value = row[scenario.name] || 0;
                      const intensity = value / 100;
                      const hue = intensity > 0.7 ? 45 : intensity > 0.4 ? 145 : 25;
                      return (
                        <td
                          key={scenario.name}
                          className="text-center py-2 px-3 rounded transition-colors"
                          style={{
                            backgroundColor: `oklch(${0.5 + intensity * 0.3} ${0.1 + intensity * 0.15} ${hue} / 0.3)`,
                          }}
                        >
                          <span className="font-semibold text-foreground">{value.toFixed(0)}%</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Impact Distribution */}
      {data.factorImpact.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-white">
          <h3 className="font-semibold text-foreground mb-3">Factor Impact Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={data.factorImpact.sort((a, b) => b.impact - a.impact).slice(0, 8)}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="factor"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                formatter={(value) => `${(value as number * 100).toFixed(1)}%`}
              />
              <Bar dataKey="impact" fill="oklch(0.72 0.18 45)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
