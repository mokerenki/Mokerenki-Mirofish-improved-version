import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Download, Filter, ZoomIn, ZoomOut } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  type: string;
  color?: string;
  description?: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  strength: number;
  description?: string;
}

interface EntityRelationshipGraphProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntityClick?: (entity: Entity) => void;
  onRelationshipClick?: (rel: Relationship) => void;
  height?: number;
}

const ENTITY_COLORS: Record<string, string> = {
  Company: '#FF6B6B',
  Person: '#4ECDC4',
  Organization: '#45B7D1',
  MediaOutlet: '#FFA07A',
  Government: '#98D8C8',
  Institution: '#F7DC6F',
  Community: '#BB8FCE',
  TechExecutive: '#85C1E2',
  default: '#95A5A6',
};

export const EntityRelationshipGraph: React.FC<EntityRelationshipGraphProps> = ({
  entities,
  relationships,
  onEntityClick,
  onRelationshipClick,
  height = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>(entities);
  const [zoom, setZoom] = useState(1);

  // Filter entities based on search
  useEffect(() => {
    const filtered = entities.filter(e =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntities(filtered);
  }, [searchTerm, entities]);

  // Build graph data
  const graphData = {
    nodes: filteredEntities.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      color: e.color || ENTITY_COLORS[e.type] || ENTITY_COLORS.default,
      description: e.description,
    })),
    links: relationships
      .filter(r => 
        filteredEntities.some(e => e.id === r.source) &&
        filteredEntities.some(e => e.id === r.target)
      )
      .map(r => ({
        source: r.source,
        target: r.target,
        type: r.type,
        strength: r.strength,
        description: r.description,
      })),
  };

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links as any)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const links = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.strength) * 3)
      .attr('marker-end', 'url(#arrowhead)');

    // Create link labels
    const linkLabels = g.append('g')
      .selectAll('text')
      .data(graphData.links)
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.type);

    // Add arrow markers
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 25)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#999');

    // Create nodes
    const nodes = g.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter()
      .append('circle')
      .attr('r', 25)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => {
        setSelectedEntity(d);
        onEntityClick?.(d);
      })
      .call(drag(simulation) as any);

    // Create node labels
    const labels = g.append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .enter()
      .append('text')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('pointer-events', 'none')
      .text((d: any) => d.name.substring(0, 10));

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      nodes
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    return () => {
      simulation.stop();
    };
  }, [graphData, height, onEntityClick]);

  const drag = (simulation: d3.Simulation<any, undefined>) => {
    const dragstarted = (event: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    };

    const dragged = (event: any) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    };

    const dragended = (event: any) => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    };

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          placeholder="Search entities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const svg = svgRef.current;
            if (svg) {
              const svgData = new XMLSerializer().serializeToString(svg);
              const canvas = document.createElement('canvas');
              canvas.width = svg.clientWidth;
              canvas.height = svg.clientHeight;
              const ctx = canvas.getContext('2d');
              const img = new Image();
              img.onload = () => {
                ctx?.drawImage(img, 0, 0);
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = 'entity-graph.png';
                link.click();
              };
              img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
          }}
        >
          <Download className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600">Zoom: {zoom.toFixed(2)}x</span>
      </div>

      {/* Graph */}
      <Card className="p-4 bg-white">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
        />
      </Card>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
        {Object.entries(ENTITY_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-700">{type}</span>
          </div>
        ))}
      </div>

      {/* Entity Details Panel */}
      {selectedEntity && (
        <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-teal-600">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg">{selectedEntity.name}</h3>
              <p className="text-sm text-gray-600">{selectedEntity.type}</p>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedEntity.description && (
            <p className="text-sm text-gray-700 mb-3">{selectedEntity.description}</p>
          )}
          <div className="text-xs text-gray-500">
            {relationships.filter(r => r.source === selectedEntity.id || r.target === selectedEntity.id).length} connections
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="font-bold text-blue-900">{graphData.nodes.length}</div>
          <div className="text-blue-700">Entities</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="font-bold text-green-900">{graphData.links.length}</div>
          <div className="text-green-700">Relationships</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="font-bold text-purple-900">
            {new Set(graphData.links.map(l => l.type)).size}
          </div>
          <div className="text-purple-700">Rel. Types</div>
        </div>
      </div>
    </div>
  );
};

export default EntityRelationshipGraph;
