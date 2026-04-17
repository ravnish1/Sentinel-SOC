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
  const severity = threat.severity || getSeverityFromType(threat.type);
  
  // Data enrichment from Supabase raw_json (AI Insights)
  let aiInsights = null;
  if (threat.raw_json) {
    try {
      const parsedRaw = typeof threat.raw_json === 'string' 
        ? JSON.parse(threat.raw_json) 
        : threat.raw_json;
      aiInsights = parsedRaw.ai_insights || null;
    } catch (e) {
      console.warn('Failed to parse raw_json for AI insights');
    }
  }

  return {
    id: threat.id,
    timestamp: new Date(threat.detected_at || threat.timestamp).toLocaleTimeString(),
    source: threat.source_ip || threat.source,
    event: threat.raw_json?.description || TYPE_TO_EVENT[String(threat.type || threat.threat_type).toLowerCase()] || `Threat indicator: ${threat.indicator}`,
    severity,
    indicator: threat.indicator,
    type: threat.threat_type || threat.type,
    aiInsights,
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
let globalPipelineStatus = null;
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
  const pollAll = () => {
    fetchThreatsFromServer();
    getPipelineStatus();
  };
  globalIntervalId = setInterval(pollAll, 5000);
  
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
  if (globalIntervalId) {
    clearInterval(globalIntervalId);
    globalIntervalId = null;
  }
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

  const aiStats = useMemo(() => {
    const analyzed = globalLogs.filter(l => l.aiInsights);
    const clusters = new Set();
    let totalConf = 0;
    const intents = {};
    const urgencies = {};
    let blocks = 0;

    analyzed.forEach(l => {
      const ai = l.aiInsights;
      totalConf += (ai.confidence_score || 0);
      if (ai.cluster_id) clusters.add(ai.cluster_id);
      if (ai.action === 'block_immediately') blocks++;
      
      const intent = ai.intent || 'unknown';
      intents[intent] = (intents[intent] || 0) + 1;
      
      const urgency = ai.urgency || 'normal';
      urgencies[urgency] = (urgencies[urgency] || 0) + 1;
    });

    return {
      totalAnalyzed: analyzed.length,
      avgConfidence: analyzed.length ? Math.round(totalConf / analyzed.length) : 0,
      clusterCount: clusters.size,
      immediateActions: blocks,
      intentBreakdown: intents,
      urgencyBreakdown: urgencies
    };
  }, [globalLogs, stamp]);

  const refreshThreats = useCallback(async () => {
    await fetchThreatsFromServer();
  }, []);

  const uploadCSV = useCallback(async (file, immediate = true) => {
    const formData = new FormData();
    formData.append('threatFile', file);
    
    const response = await fetch(`${API_BASE_URL}/api/ai/upload-csv?immediate=${immediate}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (response.ok) {
      await fetchThreatsFromServer();
    }
    return data;
  }, []);

  const getPipelineStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/pipeline-status`);
      if (response.ok) {
        const data = await response.json();
        globalPipelineStatus = data.pipeline?.active_job || null;
        notify();
      }
    } catch (err) {
      console.warn('Failed to fetch pipeline status');
    }
  }, []);

  return { 
    stats, 
    aiStats,
    logs: globalLogs, 
    volumeData: globalVolumeData, 
    isLive: globalIsLive, 
    pipelineStatus: globalPipelineStatus,
    refreshThreats,
    uploadCSV,
    getPipelineStatus
  };
};
