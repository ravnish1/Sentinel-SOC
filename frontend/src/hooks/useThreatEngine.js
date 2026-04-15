import { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { mockLogs, mockSummaryStats } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const MAX_LOGS = 50;
const MAX_VOLUME_POINTS = 20;

const TYPE_TO_EVENT = {
  ip: 'Suspicious IP Activity',
  domain: 'Malicious Domain Observed',
  hash: 'Known Malware Hash Match',
  url: 'Malicious URL Detected',
};

function getSeverityFromType(type = '') {
  const normalized = String(type).toLowerCase();
  if (normalized === 'hash') return 'Critical';
  if (normalized === 'ip' || normalized === 'url') return 'High';
  if (normalized === 'domain') return 'Medium';
  return 'Low';
}

function toLogEntry(threat) {
  const severity = getSeverityFromType(threat.type);
  return {
    id: threat.id,
    timestamp: new Date(threat.timestamp).toLocaleTimeString(),
    source: threat.source,
    event: TYPE_TO_EVENT[String(threat.type).toLowerCase()] || `Threat indicator: ${threat.indicator}`,
    severity,
    indicator: threat.indicator,
    type: threat.type,
    raw: threat,
  };
}

function buildStats(logs) {
  const activeAttacks = logs.filter((l) => l.severity === 'Critical' || l.severity === 'High').length;
  const infectedSystems = logs.filter((l) => l.type === 'hash').length;
  const compromisedUsers = logs.filter((l) => String(l.event).toLowerCase().includes('credential')).length;
  return {
    totalThreats: logs.length,
    activeAttacks,
    infectedSystems,
    compromisedUsers,
  };
}

export const useThreatEngine = () => {
  const [logs, setLogs] = useState(mockLogs);
  const [volumeData, setVolumeData] = useState(() =>
    Array.from({ length: MAX_VOLUME_POINTS }, (_, i) => ({ time: i, volume: 0 }))
  );
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;

    const pushVolumePoint = (value) => {
      setVolumeData((prev) => {
        const nextTime = prev.length ? prev[prev.length - 1].time + 1 : 0;
        const nextPoint = { time: nextTime, volume: value };
        return [...prev.slice(-(MAX_VOLUME_POINTS - 1)), nextPoint];
      });
    };

    async function loadInitialThreats() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/threats?limit=${MAX_LOGS}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const threats = await response.json();
        if (!mounted || !Array.isArray(threats)) return;

        const mappedLogs = threats.map(toLogEntry);
        setLogs(mappedLogs.slice(0, MAX_LOGS));
        pushVolumePoint(mappedLogs.length);
      } catch (error) {
        if (!mounted) return;
        console.warn('Falling back to mock logs. Backend fetch failed:', error.message);
        setLogs(mockLogs);
        pushVolumePoint(mockLogs.length);
      }
    }

    loadInitialThreats();

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      if (!mounted) return;
      setIsLive(true);
    });

    socket.on('disconnect', () => {
      if (!mounted) return;
      setIsLive(false);
    });

    socket.on('threatUpdate', (threat) => {
      if (!mounted || !threat) return;
      const nextLog = toLogEntry(threat);
      setLogs((prevLogs) => {
        const merged = [nextLog, ...prevLogs.filter((item) => item.id !== nextLog.id)].slice(0, MAX_LOGS);
        setVolumeData((prevVolume) => {
          const nextTime = prevVolume.length ? prevVolume[prevVolume.length - 1].time + 1 : 0;
          return [...prevVolume.slice(-(MAX_VOLUME_POINTS - 1)), { time: nextTime, volume: merged.length }];
        });
        return merged;
      });
    });

    return () => {
      mounted = false;
      socket.close();
    };
  }, []);

  const stats = useMemo(() => {
    if (!logs.length) return mockSummaryStats;
    return buildStats(logs);
  }, [logs]);

  return { stats, logs, volumeData, isLive };
};
