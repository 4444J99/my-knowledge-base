/**
 * GraphTab Component
 * Knowledge graph visualization using D3.js
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { graphApi } from '../../api/client';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import type { GraphNode, GraphEdge } from '../../types';

export function GraphTab() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { graphFilters, setGraphFilters } = useDataStore();
  const { openModal } = useUIStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch graph data
  const { data: graphResponse, isLoading, refetch } = useQuery({
    queryKey: ['graph', graphFilters],
    queryFn: () => {
      if (graphFilters.focusId) {
        return graphApi.getNeighborhood(graphFilters.focusId, graphFilters.hops);
      }
      return graphApi.getVisualization({
        limit: graphFilters.limit,
        type: graphFilters.type || undefined,
        category: graphFilters.category || undefined,
      });
    },
    staleTime: 60000,
  });

  const graphData = graphResponse?.data;

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(400, window.innerHeight - 400),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render graph with D3
  useEffect(() => {
    if (!svgRef.current || !graphData || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Type colors
    const typeColors: Record<string, string> = {
      insight: '#2a9d8f',
      code: '#e9c46a',
      question: '#f4a261',
      reference: '#3a86ff',
      decision: '#e76f51',
    };

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(graphData.edges)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create edges
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .enter()
      .append('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.max(1, d.strength * 3));

    // Create edge labels
    const linkLabel = container.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.edges)
      .enter()
      .append('text')
      .attr('font-size', 10)
      .attr('fill', 'var(--ink-muted)')
      .attr('text-anchor', 'middle')
      .text((d) => d.relationship);

    // Create nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (_, d) => {
        openModal(d.id);
      });

    // Node circles
    node.append('circle')
      .attr('r', 15)
      .attr('fill', (d) => typeColors[d.type] || '#264653')
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', 'var(--ink)')
      .text((d) => d.label.slice(0, 20) + (d.label.length > 20 ? '...' : ''));

    // Node tooltips
    node.append('title')
      .text((d) => `${d.label}\nType: ${d.type}\nCategory: ${d.category}`);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, openModal]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <button
          onClick={() => refetch()}
          className="btn-secondary"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load Graph'}
        </button>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--ink-muted)]">Limit</span>
          <input
            type="number"
            value={graphFilters.limit}
            onChange={(e) => setGraphFilters({ limit: parseInt(e.target.value) })}
            min={10}
            max={200}
            step={10}
            className="input w-24"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--ink-muted)]">Type</span>
          <select
            value={graphFilters.type}
            onChange={(e) => setGraphFilters({ type: e.target.value })}
            className="input"
          >
            <option value="">All types</option>
            <option value="insight">Insight</option>
            <option value="code">Code</option>
            <option value="question">Question</option>
            <option value="reference">Reference</option>
            <option value="decision">Decision</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--ink-muted)]">Category</span>
          <select
            value={graphFilters.category}
            onChange={(e) => setGraphFilters({ category: e.target.value })}
            className="input"
          >
            <option value="">All categories</option>
            <option value="programming">Programming</option>
            <option value="writing">Writing</option>
            <option value="research">Research</option>
            <option value="design">Design</option>
            <option value="general">General</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--ink-muted)]">Focus ID</span>
          <input
            type="text"
            value={graphFilters.focusId}
            onChange={(e) => setGraphFilters({ focusId: e.target.value })}
            placeholder="unit-123"
            className="input w-32"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--ink-muted)]">Hops</span>
          <input
            type="number"
            value={graphFilters.hops}
            onChange={(e) => setGraphFilters({ hops: parseInt(e.target.value) })}
            min={1}
            max={3}
            className="input w-16"
          />
        </label>
      </div>

      {/* Graph container */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-2)] border-t-transparent rounded-full" />
          </div>
        ) : graphData && graphData.nodes.length > 0 ? (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="bg-[var(--bg)]"
          />
        ) : (
          <div className="flex items-center justify-center h-96 text-[var(--ink-muted)]">
            Click "Load Graph" to visualize knowledge connections
          </div>
        )}
      </div>

      {/* Legend */}
      {graphData && graphData.nodes.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2a9d8f]" /> Insight
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#e9c46a]" /> Code
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f4a261]" /> Question
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3a86ff]" /> Reference
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#e76f51]" /> Decision
          </span>
        </div>
      )}
    </div>
  );
}
