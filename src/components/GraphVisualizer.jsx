import React, { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GraphVisualizer = ({ data }) => {
  const fgRef = useRef();

  useEffect(() => {
    // Optional: play with the charge/forces
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-200);
      fgRef.current.d3Force('link').distance(40);
    }
  }, []);

  const getNodeColor = (node) => {
    switch(node.status) {
      case 'malicious': return '#ff003c';
      case 'compromised': return '#f59e0b';
      case 'safe':
      default: return '#0ef'; // Neon cyan for neutral/safe
    }
  };

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      width={400}
      height={300}
      backgroundColor="rgba(0,0,0,0)"
      
      // Node Styling
      nodeRelSize={6}
      nodeColor={getNodeColor}
      
      // Paint custom glowing nodes
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.label || node.id;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px JetBrains Mono`;
        
        ctx.fillStyle = getNodeColor(node);
        
        // Add neon glow
        ctx.shadowColor = getNodeColor(node);
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
        ctx.fill();
        
        // Reset shadow for text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e6edf3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y + 8 + fontSize);
      }}

      // Link Styling
      linkColor={(link) => 'rgba(6, 182, 212, 0.4)'}
      linkWidth={1.5}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleColor={(link) => 'rgba(6, 182, 212, 1)'}
      
      // Disable dragging for a "display" look, or keep it true
      enableNodeDrag={true}
      enableZoomPanInteraction={true}
    />
  );
};

export default GraphVisualizer;
