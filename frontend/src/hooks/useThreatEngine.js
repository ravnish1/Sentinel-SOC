import { useState, useEffect, useMemo, useCallback } from 'react';
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

// --- Global Shared State ---
let globalLogs = mockLogs;
let globalVolumeData = Array.from({ length: MAX_VOLUME_POINTS }, (_, i) => ({ time: i, volume: 0 }));
let globalIsLive = false;
let globalIntervalId = null;
let globalSocket = null;
const listeners = new Set();
let subscribers = 0;

function notify() {
  listeners.forEach(fn => fn());
}

async function fetchThreatsFromServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/threats?limit=${MAX_LOGS}`);
    if (response.ok) {
      const threats = await response.json();
      if (Array.isArray(threats)) {
        globalLogs = threats.map(toLogEntry).slice(0, MAX_LOGS);
        const nextTime = globalVolumeData.length ? globalVolumeData[globalVolumeData.length - 1].time + 1 : 0;
        globalVolumeData = [...globalVolumeData.slice(-(MAX_VOLUME_POINTS - 1)), { time: nextTime, volume: globalLogs.length }];
        notify();
      }
    }
  } catch (error) {
    console.warn('Backend fetch failed during shared refresh:', error.message);
  }
}

function initGlobalStore() {
  if (subscribers > 0) return;
  
  fetchThreatsFromServer();
  globalIntervalId = setInterval(fetchThreatsFromServer, 5000);
  
  globalSocket = io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  globalSocket.on('connect', () => {
    globalIsLive = true;
    notify();
  });

  globalSocket.on('disconnect', () => {
    globalIsLive = false;
    notify();
  });

  globalSocket.on('threatUpdate', (threat) => {
    if (!threat) return;
    const nextLog = toLogEntry(threat);
    globalLogs = [nextLog, ...globalLogs.filter((item) => item.id !== nextLog.id)].slice(0, MAX_LOGS);
    const nextTime = globalVolumeData.length ? globalVolumeData[globalVolumeData.length - 1].time + 1 : 0;
    globalVolumeData = [...globalVolumeData.slice(-(MAX_VOLUME_POINTS - 1)), { time: nextTime, volume: globalLogs.length }];
    notify();
  });
}

function cleanupGlobalStore() {
  if (subscribers > 0) return;
  clearInterval(globalIntervalId);
  if (globalSocket) {
    globalSocket.close();
    globalSocket = null;
  }
}

export const useThreatEngine = () => {
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    if (subscribers === 0) {
      initGlobalStore();
    }
    subscribers++;
    
    const listener = () => setStamp(s => s + 1);
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
      subscribers--;
      setTimeout(cleanupGlobalStore, 1000); // Debounce cleanup slightly for navigations
    };
  }, []);

  const stats = useMemo(() => {
    if (!globalLogs.length) return mockSummaryStats;
    return buildStats(globalLogs);
  }, [globalLogs, stamp]); // Dependency on stamp forces re-eval on update

  const refreshThreats = useCallback(async () => {
    await fetchThreatsFromServer();
  }, []);

  return { 
    stats, 
    logs: globalLogs, 
    volumeData: globalVolumeData, 
    isLive: globalIsLive, 
    refreshThreats 
  };
};
