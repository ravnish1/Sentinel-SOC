import { useState, useEffect } from 'react';
import { mockThreatData, mockLogs, mockSummaryStats } from '../data/mockData';

// Helper to generate random IP
const randomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

// Helper to generate random coordinates within India
const randomCoord = () => ({
  lat: 8 + Math.random() * 29, // India Lat: 8 to 37
  lng: 68 + Math.random() * 29 // India Lng: 68 to 97
});

const generateArc = () => {
  const start = randomCoord();
  const end = randomCoord();
  const isBlocked = Math.random() > 0.7;
  return {
    startLat: start.lat,
    startLng: start.lng,
    endLat: end.lat,
    endLng: end.lng,
    color: isBlocked ? '#10b981' : '#ff003c', // Green if blocked, Red if critical
    isBlocked
  };
};

const attackTypes = ['SQL Injection', 'Ransomware', 'Port Scan', 'DDoS', 'Zero-Day Exploit', 'Brute Force'];
const severities = ['Critical', 'High', 'Medium', 'Low'];

const generateLog = (id) => ({
  id,
  timestamp: new Date().toLocaleTimeString(),
  source: randomIP(),
  target: randomIP(),
  event: attackTypes[Math.floor(Math.random() * attackTypes.length)],
  severity: severities[Math.floor(Math.random() * severities.length)]
});

export const useThreatEngine = () => {
  const [stats, setStats] = useState(mockSummaryStats);
  const [logs, setLogs] = useState(mockLogs);
  const [arcs, setArcs] = useState([]);
  const [volumeData, setVolumeData] = useState(
    Array.from({ length: 20 }, (_, i) => ({ time: i, volume: Math.floor(Math.random() * 50) + 10 }))
  );

  useEffect(() => {
    let logId = 100;
    const interval = setInterval(() => {
      // 1. Generate new Arc (Map Projectile)
      const newArc = generateArc();
      setArcs((prev) => [...prev.slice(-15), newArc]); // Keep last 15 arcs

      // 2. Generate new Log
      const newLog = generateLog(logId++);
      setLogs((prev) => [newLog, ...prev.slice(0, 19)]); // Keep top 20 logs

      // 3. Update Sparkline Volume Data
      const newVolume = Math.floor(Math.random() * 80) + 20;
      setVolumeData((prev) => {
        const nextTime = prev[prev.length - 1].time + 1;
        return [...prev.slice(1), { time: nextTime, volume: newVolume }];
      });

      // 4. Tick up stats
      setStats((prev) => ({
        ...prev,
        totalThreats: prev.totalThreats + Math.floor(Math.random() * 3),
        activeAttacks: Math.max(0, prev.activeAttacks + (Math.random() > 0.5 ? 1 : -1)),
      }));

    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return { stats, logs, arcs, volumeData, graphData: mockThreatData };
};
