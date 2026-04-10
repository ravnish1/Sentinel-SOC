import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup } from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import './IndiaMap.css';

const INDIA_TOPO_URL = "/india.json";

// Comprehensive Edge and Node Map
const nodes = [
  // Major Data Centers
  { id: 'dc1', name: 'Delhi Data Center', coordinates: [77.2090, 28.6139], type: 'Data Center', status: 'safe', threats: 0, connected: 10 },
  { id: 'dc2', name: 'Mumbai Azure Zone', coordinates: [72.8777, 19.0760], type: 'Cloud Core', status: 'threat', threats: 14, connected: 12 },
  { id: 'dc3', name: 'Bangalore Cyber Command', coordinates: [77.5946, 12.9716], type: 'Gov Office', status: 'suspicious', threats: 3, connected: 11 },
  { id: 'dc4', name: 'Chennai Subsea Cable', coordinates: [80.2707, 13.0827], type: 'Infrastructure', status: 'safe', threats: 0, connected: 6 },
  { id: 'dc5', name: 'Hyderabad Server Farm', coordinates: [78.4867, 17.3850], type: 'Data Center', status: 'safe', threats: 1, connected: 5 },
  
  // States / Capitals
  { id: 's1', name: 'Srinagar (J&K)', coordinates: [74.7973, 34.0837], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's2', name: 'Shimla (HP)', coordinates: [77.1734, 31.1048], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's3', name: 'Chandigarh (PB/HR)', coordinates: [76.7794, 30.7333], type: 'State Node', status: 'suspicious', threats: 2, connected: 3 },
  { id: 's4', name: 'Dehradun (UK)', coordinates: [78.0322, 30.3165], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's5', name: 'Jaipur (RJ)', coordinates: [75.7873, 26.9124], type: 'State Node', status: 'safe', threats: 0, connected: 4 },
  { id: 's6', name: 'Lucknow (UP)', coordinates: [80.9462, 26.8467], type: 'State Node', status: 'threat', threats: 7, connected: 5 },
  { id: 's7', name: 'Patna (BR)', coordinates: [85.1376, 25.5941], type: 'State Node', status: 'safe', threats: 0, connected: 3 },
  { id: 's8', name: 'Kolkata (WB)', coordinates: [88.3639, 22.5726], type: 'State Node', status: 'threat', threats: 11, connected: 6 },
  { id: 's9', name: 'Bhubaneswar (OR)', coordinates: [85.8245, 20.2961], type: 'State Node', status: 'safe', threats: 0, connected: 3 },
  { id: 's10', name: 'Ranchi (JH)', coordinates: [85.3096, 23.3441], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's11', name: 'Raipur (CG)', coordinates: [81.6296, 21.2514], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's12', name: 'Bhopal (MP)', coordinates: [77.4126, 23.2599], type: 'State Node', status: 'safe', threats: 0, connected: 4 },
  { id: 's13', name: 'Gandhinagar (GJ)', coordinates: [72.6369, 23.2156], type: 'State Node', status: 'safe', threats: 0, connected: 3 },
  { id: 's14', name: 'Panaji (GA)', coordinates: [73.8278, 15.4909], type: 'State Node', status: 'safe', threats: 0, connected: 2 },
  { id: 's15', name: 'Trivandrum (KL)', coordinates: [76.9366, 8.5241], type: 'State Node', status: 'suspicious', threats: 4, connected: 3 },
  { id: 's16', name: 'Amaravati (AP)', coordinates: [80.5160, 16.5062], type: 'State Node', status: 'safe', threats: 0, connected: 3 },
  { id: 's17', name: 'Guwahati (AS)', coordinates: [91.7362, 26.1445], type: 'State Node', status: 'suspicious', threats: 3, connected: 5 },
  { id: 's18', name: 'Shillong (ML)', coordinates: [91.8933, 25.5788], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's19', name: 'Aizawl (MZ)', coordinates: [92.7176, 23.7271], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's20', name: 'Imphal (MN)', coordinates: [93.9368, 24.8170], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's21', name: 'Kohima (NL)', coordinates: [94.1086, 25.6751], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's22', name: 'Itanagar (AR)', coordinates: [93.6053, 27.0844], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's23', name: 'Gangtok (SK)', coordinates: [88.6139, 27.3389], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
  { id: 's24', name: 'Agartala (TR)', coordinates: [91.2868, 23.8315], type: 'State Node', status: 'safe', threats: 0, connected: 1 },
];

const links = [
  // Backbone Links (connecting Main DCs)
  { from: 'dc1', to: 'dc2', activeThreat: false },
  { from: 'dc2', to: 'dc3', activeThreat: true },
  { from: 'dc3', to: 'dc4', activeThreat: false },
  { from: 'dc4', to: 'dc5', activeThreat: false },
  { from: 'dc5', to: 'dc1', activeThreat: false },
  { from: 'dc1', to: 's8', activeThreat: true },
  
  // Hubs to Regional States
  { from: 'dc1', to: 's1', activeThreat: false },
  { from: 'dc1', to: 's2', activeThreat: false },
  { from: 'dc1', to: 's3', activeThreat: false },
  { from: 'dc1', to: 's4', activeThreat: false },
  { from: 'dc1', to: 's5', activeThreat: false },
  { from: 'dc1', to: 's6', activeThreat: true },
  
  { from: 'dc2', to: 's13', activeThreat: false },
  { from: 'dc2', to: 's12', activeThreat: false },
  { from: 'dc2', to: 's14', activeThreat: false },
  
  { from: 'dc3', to: 's15', activeThreat: true },
  { from: 'dc3', to: 's14', activeThreat: false },
  
  { from: 'dc4', to: 's16', activeThreat: false },
  { from: 'dc4', to: 's15', activeThreat: false },
  { from: 'dc4', to: 's9', activeThreat: false },
  
  { from: 's8', to: 's7', activeThreat: false },
  { from: 's8', to: 's9', activeThreat: false },
  { from: 's8', to: 's10', activeThreat: false },
  { from: 's8', to: 's17', activeThreat: true }, // Kolkata to NE Hub
  
  // Northeast Mesh
  { from: 's17', to: 's18', activeThreat: false },
  { from: 's17', to: 's19', activeThreat: false },
  { from: 's17', to: 's20', activeThreat: false },
  { from: 's17', to: 's21', activeThreat: false },
  { from: 's17', to: 's22', activeThreat: false },
  { from: 's17', to: 's23', activeThreat: false },
  { from: 's17', to: 's24', activeThreat: false },

  // Internal Central Mesh
  { from: 's12', to: 's11', activeThreat: false },
  { from: 's11', to: 's10', activeThreat: false },
  { from: 's6', to: 's7', activeThreat: true },
];

const getStatusColor = (status) => {
  switch(status) {
    case 'threat': return '#ff003c'; // Red
    case 'suspicious': return '#f59e0b'; // Yellow
    case 'safe':
    default: return '#10b981'; // Green
  }
};

const IndiaMap = () => {
  const [tooltipContent, setTooltipContent] = useState('');

  return (
    <div className="india-map-container" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1050,
          center: [82.5, 23] // Center on India
        }}
        width={800}
        height={600}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          {/* Base Map Layer */}
          <Geographies geography={INDIA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const colorMap = [
                  { hex: '#00eeee', fill: 'rgba(0, 238, 238, 0.15)' },
                  { hex: '#ff0055', fill: 'rgba(255, 0, 85, 0.15)' },
                  { hex: '#b026ff', fill: 'rgba(176, 38, 255, 0.15)' },
                  { hex: '#00ffaa', fill: 'rgba(0, 255, 170, 0.15)' },
                  { hex: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)' },
                  { hex: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)' }
                ];
                const hash = geo.properties.shapeName ? geo.properties.shapeName.length : Math.floor(Math.random() * 10);
                const theme = colorMap[hash % colorMap.length];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className="state-geography"
                    style={{
                      default: {
                        fill: '#010409',
                        stroke: theme.hex,
                        strokeWidth: 0.6,
                        outline: 'none',
                      },
                      hover: {
                        fill: theme.fill,
                        stroke: '#ffffff',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      pressed: {
                        fill: theme.fill,
                        outline: 'none'
                      }
                    }}
                  onMouseEnter={() => {
                    const { shapeName } = geo.properties;
                    setTooltipContent(
                      `<b>State:</b> ${shapeName || 'Unknown Region'}<br/>` +
                      `<b>Status:</b> Monitored`
                    );
                  }}
                  onMouseLeave={() => {
                    setTooltipContent('');
                  }}
                  data-tooltip-id="india-tooltip"
                  data-tooltip-html={tooltipContent}
                />
              );
              })
            }
          </Geographies>

          {/* Animated Connecting Lines */}
          {links.map((link, i) => {
            const startNode = nodes.find((n) => n.id === link.from);
            const endNode = nodes.find((n) => n.id === link.to);
            if (!startNode || !endNode) return null;

            return (
              <Line
                key={i}
                from={startNode.coordinates}
                to={endNode.coordinates}
                stroke={link.activeThreat ? '#ff003c' : '#0ef'}
                strokeWidth={link.activeThreat ? 2 : 1}
                className={link.activeThreat ? 'threat-line' : 'animated-line'}
                strokeLinecap="round"
              />
            );
          })}

          {/* Nodes Overlay */}
          {nodes.map((node) => {
            const color = getStatusColor(node.status);
            return (
              <Marker key={node.id} coordinates={node.coordinates}>
                <g 
                  className="node-marker"
                  data-tooltip-id="india-tooltip"
                  data-tooltip-html={tooltipContent}
                  onMouseEnter={() => {
                    const connectedNodes = links
                      .filter(l => l.from === node.id || l.to === node.id)
                      .map(l => {
                        const targetId = l.from === node.id ? l.to : l.from;
                        return nodes.find(n => n.id === targetId);
                      })
                      .filter(n => n);
                      
                    const infraNodes = connectedNodes.filter(n => n.type !== 'State Node');
                    let infraHtml = infraNodes.length > 0
                      ? infraNodes.map(n => `<span style="color:#0ef">${n.name}</span>`).join(', ')
                      : 'None';

                    setTooltipContent(
                      `<div class="tooltip-title">${node.name}</div>` +
                      `<b>Type:</b> ${node.type}<br/>` +
                      `<b>Threats:</b> <span style="color:${color}">${node.threats}</span><br/>` +
                      `<b>Connected Infra:</b> ${infraHtml}`
                    );
                  }}
                  onMouseLeave={() => setTooltipContent('')}
                >
                  <circle
                    r={6}
                    fill={color}
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                  />
                  {node.status === 'threat' && (
                    <circle
                      r={12}
                      className="pulse-ring"
                      stroke={color}
                      strokeWidth={2}
                      fill="transparent"
                    />
                  )}
                  <text
                    textAnchor="middle"
                    y={18}
                    style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: '10px',
                      fill: '#e6edf3',
                      textShadow: '0 0 5px rgba(0,0,0,0.8)'
                    }}
                  >
                    {node.name}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Reusable Tooltip */}
      <Tooltip 
        id="india-tooltip" 
        className="cyber-tooltip"
        float={true}
      />
    </div>
  );
};

export default IndiaMap;
