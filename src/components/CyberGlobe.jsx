import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';

const CyberGlobe = ({ arcs }) => {
  const globeRef = useRef();
  const containerRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [indiaData, setIndiaData] = useState([]);

  useEffect(() => {
    fetch('/india.json')
      .then(r => r.json())
      .then(d => setIndiaData(d.features || []))
      .catch(e => console.error("Could not load local india.json data", e));
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      if (globeRef.current.controls) {
        globeRef.current.controls().autoRotate = true;
        globeRef.current.controls().autoRotateSpeed = 0.5;
      }
      
      // Center firmly on India initially
      setTimeout(() => {
        if(globeRef.current && globeRef.current.pointOfView) {
          globeRef.current.pointOfView({ lat: 22, lng: 80, altitude: 0.8 }, 1000);
        }
      }, 500);
    }
  }, [size.width]); // Run POV zoom after rendering map to precise size

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width && height) {
        setSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'move', margin: 0, padding: 0 }}>
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          
          showGlobe={true}
          globeImageUrl={null}
          globeColor="#010409" // pitch black globe to hide it against background
          showAtmosphere={true}
          atmosphereColor="#06b6d4"
          atmosphereAltitude={0.15}
          
          // Draw India states polygons
          polygonsData={indiaData}
          polygonCapColor={(d) => {
            const colors = ['#0ef', '#ff0055', '#b026ff', '#00ffaa', '#f59e0b', '#3b82f6'];
            const hash = d.properties.shapeName ? d.properties.shapeName.length : Math.random() * 10;
            return colors[hash % colors.length] + 'D0'; // Vibrant with slight opacity
          }}
          polygonSideColor={() => 'rgba(255, 255, 255, 0.05)'}
          polygonStrokeColor={() => '#ffffff'}
          polygonAltitude={0.03}
          
          arcsData={arcs}
          arcColor={(d) => [d.color, '#ffffff']}
          arcDashLength={0.5}
          arcDashGap={0.1}
          arcDashAnimateTime={1000}
          arcStroke={0.8}
          arcAltitudeAutoScale={0.25}
        />
      )}
    </div>
  );
};

export default CyberGlobe;
