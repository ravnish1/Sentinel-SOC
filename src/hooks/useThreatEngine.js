import { useState, useEffect, useRef } from 'react';
import { mockLogs, mockSummaryStats } from '../data/mockData';

const randomIP = () =>
  `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const events = ['SQL Injection', 'Ransomware', 'Port Scan', 'DDoS', 'Brute Force', 'Zero-Day'];
const severities = ['Critical', 'High', 'Medium', 'Low'];

export const useThreatEngine = () => {
  const [stats, setStats] = useState(mockSummaryStats);
  const [logs, setLogs] = useState(mockLogs);
  const [volumeData, setVolumeData] = useState(
    () => Array.from({ length: 20 }, (_, i) => ({ time: i, volume: 15 + Math.floor(Math.random() * 40) }))
  );
  const idRef = useRef(100);

  useEffect(() => {
    // Stats: every 3s
    const s = setInterval(() => {
      setStats(p => ({
        ...p,
        totalThreats: p.totalThreats + Math.floor(Math.random() * 2),
        activeAttacks: Math.max(0, p.activeAttacks + (Math.random() > 0.5 ? 1 : -1)),
      }));
    }, 3000);

    // Logs: every 4s
    const l = setInterval(() => {
      setLogs(p => [{
        id: idRef.current++,
        timestamp: new Date().toLocaleTimeString(),
        source: randomIP(),
        event: events[Math.floor(Math.random() * events.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
      }, ...p.slice(0, 12)]);
    }, 4000);

    // Volume: every 5s
    const v = setInterval(() => {
      setVolumeData(p => {
        const next = p[p.length - 1].time + 1;
        return [...p.slice(1), { time: next, volume: 10 + Math.floor(Math.random() * 50) }];
      });
    }, 5000);

    return () => { clearInterval(s); clearInterval(l); clearInterval(v); };
  }, []);

  return { stats, logs, volumeData };
};
