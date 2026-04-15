import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  ChevronRight,
  Download,
  Filter,
  Flame,
  Globe2,
  Layers3,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useThreatEngine } from '../hooks/useThreatEngine';
import './Dashboard.css';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const regions = [
  {
    name: 'US-East Core DC',
    count: 42,
    pulse: 'high',
    x: 18,
    y: 34,
    role: 'Primary API + IAM cluster',
    assets: 138,
    assetMix: { API: 0.38, IAM: 0.29, DB: 0.22, Edge: 0.11 },
  },
  {
    name: 'EU-West SOC Hub',
    count: 31,
    pulse: 'medium',
    x: 47,
    y: 25,
    role: 'Analytics + SIEM pipeline',
    assets: 102,
    assetMix: { API: 0.28, IAM: 0.34, DB: 0.26, Edge: 0.12 },
  },
  {
    name: 'MEA Edge POP',
    count: 18,
    pulse: 'warning',
    x: 58,
    y: 39,
    role: 'Regional ingress firewall tier',
    assets: 58,
    assetMix: { API: 0.19, IAM: 0.15, DB: 0.08, Edge: 0.58 },
  },
  {
    name: 'APAC Production Mesh',
    count: 56,
    pulse: 'critical',
    x: 77,
    y: 41,
    role: 'Customer workloads + DB replicas',
    assets: 164,
    assetMix: { API: 0.24, IAM: 0.12, DB: 0.52, Edge: 0.12 },
  },
  {
    name: 'LATAM Backup Site',
    count: 12,
    pulse: 'medium',
    x: 27,
    y: 67,
    role: 'Disaster recovery + archives',
    assets: 44,
    assetMix: { API: 0.14, IAM: 0.16, DB: 0.62, Edge: 0.08 },
  },
  {
    name: 'Africa Transit Node',
    count: 9,
    pulse: 'warning',
    x: 52,
    y: 57,
    role: 'Partner routing + CDN handoff',
    assets: 37,
    assetMix: { API: 0.18, IAM: 0.14, DB: 0.11, Edge: 0.57 },
  },
];

const MAP_ASSET_TYPES = ['ALL', 'API', 'IAM', 'DB', 'Edge'];

const feedSortOptions = [
  { id: 'latest', label: 'Latest' },
  { id: 'severity', label: 'Severity' },
  { id: 'system', label: 'System' },
];

const commandItems = [
  { id: 'search-ip', label: 'Search IP', description: 'Find indicators and host activity for an IP' },
  { id: 'trigger-scan', label: 'Trigger Hunt', description: 'Run immediate enrichment and ingestion' },
  { id: 'investigate-alert', label: 'Investigate Alert', description: 'Open the current alert details panel' },
];

const severityScore = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const statusTone = {
  Critical: 'critical',
  High: 'warning',
  Medium: 'info',
  Low: 'healthy',
};

function getRegionFromSource(source, index = 0) {
  const bucket = [
    'US-East Core DC',
    'EU-West SOC Hub',
    'APAC Production Mesh',
    'MEA Edge POP',
    'LATAM Backup Site',
    'Africa Transit Node',
  ];
  const numeric = String(source)
    .replace(/\D/g, '')
    .split('')
    .reduce((acc, value) => acc + Number(value || 0), index);
  return bucket[numeric % bucket.length];
}

function toIncidentRow(log, index) {
  const timestamp = String(log.timestamp || new Date().toLocaleTimeString());
  const source = log.source || 'Unknown';
  const severity = ['Critical', 'High', 'Medium', 'Low'].includes(log.severity) ? log.severity : 'Low';
  return {
    id: log.id ?? `incident-${index}`,
    timestamp: timestamp.includes(':') ? timestamp : new Date(timestamp).toLocaleTimeString(),
    source,
    target: source.startsWith('10.') || source.startsWith('192.168') ? 'internal-segment' : 'edge-gateway',
    threatType: (log.type || log.event || 'anomaly').toString().toUpperCase(),
    severity,
    status: severity === 'Critical' ? 'Escalated' : severity === 'High' ? 'In Progress' : 'Monitoring',
    region: getRegionFromSource(source, index),
    event: log.event || 'Suspicious behavior detected',
    indicator: log.indicator || 'n/a',
  };
}

function sparklinePoints(values, width = 104, height = 28) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  return safe
    .map((value, index) => {
      const x = (index / (safe.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildTrendPaths(values, width = 420, height = 132, padding = 14) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;
  const step = safe.length > 1 ? (width - padding * 2) / (safe.length - 1) : 0;

  const points = safe.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - padding).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)} Z`;

  return { points, linePath, areaPath, min, max };
}

const WorldThreatMap = ({ activeRegion, onSelectRegion, hotspots }) => {
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [pinnedHotspot, setPinnedHotspot] = useState(null);
  const [assetType, setAssetType] = useState('ALL');
  const hoverClearTimeoutRef = useRef(null);
  const focusedRegionName = pinnedHotspot || hoveredHotspot || (activeRegion !== 'All regions' ? activeRegion : null);
  const focusedRegion = hotspots.find((hotspot) => hotspot.name === focusedRegionName) || null;

  const getAssetThreatCount = (hotspot) => {
    if (assetType === 'ALL') return hotspot.count;
    const weight = hotspot.assetMix?.[assetType] ?? 0.25;
    return Math.max(1, Math.round(hotspot.count * weight));
  };

  const clearHoverWithDelay = () => {
    if (pinnedHotspot) return;
    if (hoverClearTimeoutRef.current) {
      window.clearTimeout(hoverClearTimeoutRef.current);
    }
    hoverClearTimeoutRef.current = window.setTimeout(() => {
      setHoveredHotspot(null);
      hoverClearTimeoutRef.current = null;
    }, 90);
  };

  const setHoverImmediate = (name) => {
    if (hoverClearTimeoutRef.current) {
      window.clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
    setHoveredHotspot(name);
  };

  const handleHotspotSelect = (name) => {
    setPinnedHotspot((current) => (current === name ? null : name));
    onSelectRegion(name);
  };

  const threatRoutes = focusedRegion
    ? hotspots
        .filter((hotspot) => hotspot.name !== focusedRegion.name)
        .map((hotspot) => {
          const startX = hotspot.x * 9.6;
          const startY = hotspot.y * 4.2;
          const endX = focusedRegion.x * 9.6;
          const endY = focusedRegion.y * 4.2;
          const controlY = Math.min(startY, endY) - 42;
          const sourceCount = getAssetThreatCount(hotspot);
          const routeWeight = Math.max(1.2, Math.min(3.8, sourceCount / 12));
          return {
            id: `${hotspot.name}-${focusedRegion.name}`,
            pulse: hotspot.pulse,
            sourceName: hotspot.name,
            sourceCount,
            routeWeight,
            d: `M ${startX} ${startY} Q ${(startX + endX) / 2} ${controlY} ${endX} ${endY}`,
          };
        })
    : [];

  const totalFlow = threatRoutes.reduce((acc, route) => acc + route.sourceCount, 0);
  const topRoutes = [...threatRoutes]
    .sort((a, b) => b.sourceCount - a.sourceCount)
    .slice(0, 3);

  return (
    <div className="world-map-shell">
      <svg viewBox="0 0 960 420" className="world-map-svg" role="img" aria-label="Global threat map">
        <defs>
          <linearGradient id="oceanGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.16)" />
            <stop offset="100%" stopColor="rgba(15,20,28,0)" />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="960" height="420" fill="url(#oceanGlow)" />
        <g className="world-grid" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={36 + index * 30} x2="960" y2={36 + index * 30} />
          ))}
          {Array.from({ length: 16 }).map((_, index) => (
            <line key={`v-${index}`} x1={30 + index * 58} y1="0" x2={30 + index * 58} y2="420" />
          ))}
        </g>

        <g className="world-landmasses" aria-hidden="true">
          <path className="continent" d="M 70 104 L 114 86 L 170 86 L 220 108 L 252 132 L 262 168 L 240 192 L 214 190 L 194 206 L 184 240 L 152 262 L 130 242 L 116 214 L 86 196 L 62 160 Z" />
          <path className="continent" d="M 192 246 L 226 270 L 236 312 L 226 356 L 202 390 L 174 374 L 162 338 L 168 296 Z" />
          <path className="continent" d="M 354 108 L 384 94 L 420 98 L 446 118 L 446 138 L 418 150 L 388 146 L 364 130 Z" />
          <path className="continent" d="M 402 162 L 446 160 L 486 176 L 526 168 L 558 178 L 578 204 L 560 238 L 528 248 L 500 280 L 462 300 L 438 286 L 434 250 L 420 228 Z" />
          <path className="continent" d="M 552 138 L 610 114 L 670 118 L 730 136 L 798 160 L 828 188 L 810 212 L 772 218 L 736 212 L 706 222 L 658 208 L 620 196 L 590 172 Z" />
          <path className="continent" d="M 734 240 L 768 236 L 804 252 L 826 278 L 814 316 L 784 332 L 750 322 L 730 288 Z" />
          <path className="continent" d="M 468 318 L 490 330 L 498 356 L 484 374 L 466 360 L 458 334 Z" />
          <path className="continent" d="M 608 248 L 642 258 L 658 282 L 640 300 L 612 292 L 598 270 Z" />
        </g>

        {threatRoutes.length ? (
          <g className="map-routes" aria-hidden="true">
            {threatRoutes.map((route) => (
              <path
                key={route.id}
                d={route.d}
                className={`map-route ${route.pulse}`}
                style={{ strokeWidth: route.routeWeight }}
              />
            ))}
          </g>
        ) : null}

        <g filter="url(#softGlow)">
          {hotspots.map((hotspot) => (
            <g key={hotspot.name} transform={`translate(${hotspot.x * 9.6}, ${hotspot.y * 4.2})`}>
              <circle className={`map-ring ${hotspot.pulse}`} r="18" />
              <circle className={`map-dot ${hotspot.pulse} ${activeRegion === hotspot.name ? 'is-active' : ''}`} r={hotspot.pulse === 'critical' ? 8 : hotspot.pulse === 'high' ? 6 : 4} />
            </g>
          ))}
        </g>
      </svg>

      <div className="map-hotspot-labels">
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.name}
            type="button"
            className={`map-hotspot ${activeRegion === hotspot.name || hoveredHotspot === hotspot.name ? 'is-active' : ''} ${pinnedHotspot === hotspot.name ? 'is-pinned' : ''}`}
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            onClick={() => handleHotspotSelect(hotspot.name)}
            onMouseEnter={() => setHoverImmediate(hotspot.name)}
            onMouseLeave={clearHoverWithDelay}
            onFocus={() => setHoverImmediate(hotspot.name)}
            onBlur={clearHoverWithDelay}
            title={`${hotspot.name} • ${hotspot.count} threats`}
          >
            <span className={`hotspot-core ${hotspot.pulse}`} />
            <span className="hotspot-label">{hotspot.name}</span>
            <span className="hotspot-count mono">{getAssetThreatCount(hotspot)}</span>
          </button>
        ))}

        {focusedRegion ? (
          <div className="map-tooltip" style={{ left: `${focusedRegion.x}%`, top: `${focusedRegion.y}%` }}>
            <div className="map-tooltip-title">{focusedRegion.name}</div>
            <div className="map-tooltip-meta mono">{getAssetThreatCount(focusedRegion)} active threats ({assetType})</div>
            <div className="map-tooltip-meta">{focusedRegion.role}</div>
            <div className="map-tooltip-meta mono">{focusedRegion.assets} managed assets</div>
            {totalFlow ? <div className="map-tooltip-meta mono">{totalFlow} incoming flow volume</div> : null}
            {pinnedHotspot ? <div className="map-tooltip-meta map-tooltip-pinned mono">Pinned view</div> : null}
          </div>
        ) : null}
      </div>

      <div className="map-asset-filters" role="tablist" aria-label="Threat route asset type filters">
        {MAP_ASSET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`map-asset-chip ${assetType === type ? 'is-active' : ''}`}
            onClick={() => setAssetType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="map-legend" aria-hidden="true">
        <span><i className="legend-dot critical" />Critical</span>
        <span><i className="legend-dot high" />High</span>
        <span><i className="legend-dot medium" />Medium</span>
        <span><i className="legend-dot warning" />Warning</span>
      </div>

      <div className="map-analytics">
        <div className="map-analytics-title">
          {focusedRegion ? `Top Incoming Routes to ${focusedRegion.name}` : 'Top Incoming Routes'}
        </div>
        <div className="map-analytics-list">
          {focusedRegion && topRoutes.length ? (
            topRoutes.map((route) => (
              <div key={route.id} className="map-analytics-item">
                <span>{route.sourceName}</span>
                <span className="mono">{route.sourceCount}</span>
              </div>
            ))
          ) : (
            <div className="map-analytics-item map-analytics-empty">
              <span>Hover or pin a zone to inspect route analytics.</span>
            </div>
          )}
        </div>
        <div className="map-analytics-foot mono">Click any zone label to pin/unpin this route analysis.</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { stats, logs, volumeData, isLive } = useThreatEngine();
  const [isLoading, setIsLoading] = useState(true);
  const [banner, setBanner] = useState('');
  const [isHunting, setIsHunting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All regions');
  const [selectedFeedId, setSelectedFeedId] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [sortBy, setSortBy] = useState('latest');
  const [feedFilter, setFeedFilter] = useState('All');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleCommandEvent = () => setIsPaletteOpen(true);
    const handleKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen((value) => !value);
      }
      if (event.key === 'Escape') {
        setIsPaletteOpen(false);
      }
    };

    window.addEventListener('soc:new-task', handleCommandEvent);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('soc:new-task', handleCommandEvent);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  const rows = useMemo(() => logs.map(toIncidentRow), [logs]);

  const activeRows = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSeverity = severityFilter === 'All' || row.severity === severityFilter;
      const matchesRegion = selectedRegion === 'All regions' || row.region === selectedRegion;
      const matchesSearch =
        !needle ||
        [row.timestamp, row.source, row.target, row.threatType, row.status, row.event, row.indicator]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesSeverity && matchesRegion && matchesSearch;
    });
  }, [rows, searchText, severityFilter, selectedRegion]);

  const feedItems = useMemo(() => {
    const list = [...rows];
    if (sortBy === 'severity') {
      list.sort((a, b) => (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0));
    } else if (sortBy === 'system') {
      list.sort((a, b) => a.source.localeCompare(b.source));
    } else {
      list.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    }

    return list.filter((item) => feedFilter === 'All' || item.severity === feedFilter).slice(0, 12);
  }, [rows, sortBy, feedFilter]);

  const selectedFeed = feedItems.find((item) => item.id === selectedFeedId) || feedItems[0] || null;
  const selectedRow = activeRows.find((item) => item.id === selectedRowId) || activeRows[0] || null;

  const vulnerabilityCount = rows.filter((row) => row.severity === 'High' || row.severity === 'Critical').length + 12;
  const activeIncidents = rows.filter((row) => row.severity === 'Critical' || row.severity === 'High').length;
  const complianceScore = Math.max(34, 100 - Math.round(vulnerabilityCount * 1.8) - Math.round(activeIncidents * 2.5));
  const timeToRemediate = Math.max(12, 18 - Math.round(activeIncidents * 0.9));
  const healthScore = isLive ? 92 : 74;

  const sparkSeries = volumeData.slice(-12).map((point, index) => Math.max(1, Number(point.volume || 0) + (index % 3)));

  const metrics = [
    {
      id: 'vulns',
      label: 'Open Vulnerabilities',
      value: vulnerabilityCount,
      trend: '+8%',
      direction: 'up',
      tone: 'critical',
      series: sparkSeries.map((value) => value + 6),
    },
    {
      id: 'incidents',
      label: 'Active Incidents',
      value: activeIncidents,
      trend: activeIncidents > 3 ? '+3%' : '-1%',
      direction: activeIncidents > 3 ? 'up' : 'down',
      tone: activeIncidents > 2 ? 'warning' : 'info',
      series: sparkSeries.map((value) => Math.max(2, value - 1)),
    },
    {
      id: 'compliance',
      label: 'Compliance Score',
      value: `${complianceScore}%`,
      trend: '+2%',
      direction: 'up',
      tone: complianceScore > 80 ? 'healthy' : 'warning',
      series: sparkSeries.map((value) => Math.max(4, 100 - value)),
    },
    {
      id: 'remediate',
      label: 'Time to Remediate',
      value: `${timeToRemediate}m`,
      trend: '-12%',
      direction: 'down',
      tone: timeToRemediate > 15 ? 'warning' : 'healthy',
      series: sparkSeries.map((value) => Math.max(2, 20 - value)),
    },
    {
      id: 'signal',
      label: 'Signal Integrity',
      value: `${healthScore}%`,
      trend: isLive ? 'Live' : 'Fallback',
      direction: isLive ? 'up' : 'down',
      tone: isLive ? 'healthy' : 'info',
      series: sparkSeries,
    },
  ];

  const filteredCommands = commandItems.filter((item) => {
    const needle = paletteQuery.trim().toLowerCase();
    return !needle || `${item.label} ${item.description}`.toLowerCase().includes(needle);
  });

  const pushBanner = (text) => {
    setBanner(text);
    window.setTimeout(() => setBanner(''), 2800);
  };

  const handleCommand = (commandId) => {
    setIsPaletteOpen(false);
    if (commandId === 'search-ip') {
      setSearchText('45.33.22.11');
      pushBanner('Command palette: IP search populated.');
      return;
    }
    if (commandId === 'trigger-scan') {
      handleTriggerHunt();
      return;
    }
    pushBanner('Command palette: investigation context prepared.');
  };

  const handleExport = () => {
    if (!activeRows.length) {
      pushBanner('No rows available to export.');
      return;
    }

    const columns = ['timestamp', 'source', 'target', 'threatType', 'severity', 'status'];
    const csv = [
      columns.join(','),
      ...activeRows.map((row) => columns.map((column) => `"${String(row[column]).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `soc-threat-logs-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    pushBanner(`Exported ${activeRows.length} log rows.`);
  };

  const handleTriggerHunt = async () => {
    try {
      setIsHunting(true);
      pushBanner('Trigger Hunt started. Running ingestion cycle...');
      const response = await fetch(`${API_BASE_URL}/api/poller/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      }
      const inserted = payload?.feeds?.otx?.inserted ?? 0;
      const fetched = payload?.feeds?.otx?.fetched ?? 0;
      pushBanner(`Trigger Hunt complete. Fetched ${fetched}, inserted ${inserted}.`);
    } catch (error) {
      pushBanner(`Trigger Hunt failed: ${error.message}`);
    } finally {
      setIsHunting(false);
    }
  };

  const regionBars = useMemo(() => {
    const counts = rows.reduce((acc, row) => {
      acc[row.region] = (acc[row.region] || 0) + 1;
      return acc;
    }, {});

    return regions.map((region) => ({
      ...region,
      count: counts[region.name] || region.count,
      percent: Math.min(100, ((counts[region.name] || region.count) / 60) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const severityBreakdown = useMemo(() => {
    const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
    const severityPalette = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#60a5fa',
      Low: '#22c55e',
    };

    const counts = severityOrder.reduce((acc, severity) => {
      acc[severity] = activeRows.filter((row) => row.severity === severity).length;
      return acc;
    }, {});

    const total = severityOrder.reduce((acc, severity) => acc + counts[severity], 0) || 1;
    let cursor = 0;
    const gradientStops = severityOrder.map((severity) => {
      const percentage = (counts[severity] / total) * 100;
      const start = cursor;
      cursor += percentage;
      return `${severityPalette[severity]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });

    return {
      counts,
      total,
      severityOrder,
      severityPalette,
      gradient: `conic-gradient(${gradientStops.join(', ')})`,
    };
  }, [activeRows]);

  const topSources = useMemo(() => {
    const sourceCounts = activeRows.reduce((acc, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const peak = entries.length ? entries[0].count : 1;
    return entries.map((entry) => ({
      ...entry,
      percent: Math.max(8, (entry.count / peak) * 100),
    }));
  }, [activeRows]);

  const trendSeries = useMemo(() => {
    const base = volumeData.slice(-20).map((point) => Number(point.volume || 0));
    if (!base.length) return [1, 2, 2, 3, 2, 4, 3, 3];

    return base.map((value, index) => {
      const severityBoost = index % 4 === 0 ? activeIncidents : index % 3;
      return Math.max(1, value + severityBoost);
    });
  }, [volumeData, activeIncidents]);

  const trendPaths = useMemo(() => buildTrendPaths(trendSeries), [trendSeries]);

  const visualRows = activeRows.slice(0, 6);

  return (
    <div className="soc-dashboard">
      <header className="soc-topbar panel">
        <div className="soc-topbar-left">
          <div className="soc-kicker mono">Command Center / Live Threat Surface</div>
          <h1 className="soc-title">Security Operations Dashboard</h1>
          <p className="soc-subtitle">Data-dense monitoring for vulnerability posture, active incidents, and immediate response.</p>
        </div>

        <div className="soc-topbar-actions">
          <label className="soc-command-input" htmlFor="soc-command-search">
            <Search size={14} />
            <input
              id="soc-command-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search IP, host, CVE, or incident"
            />
            <kbd>Ctrl+K</kbd>
          </label>

          <button type="button" className="ui-button ghost" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button type="button" className="ui-button primary" onClick={handleTriggerHunt} disabled={isHunting}>
            <Play size={14} /> {isHunting ? 'Running...' : 'Trigger Hunt'}
          </button>
        </div>
      </header>

      {banner ? <div className="status-banner">{banner}</div> : null}

      <section className="metrics-bar" aria-label="Critical metrics">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <article key={`metric-skeleton-${index}`} className="metric-card is-skeleton panel">
                <div className="skeleton-line" />
                <div className="skeleton-line is-short" />
              </article>
            ))
          : metrics.map((metric) => (
              <button key={metric.id} type="button" className={`metric-card panel tone-${metric.tone}`} onClick={() => setSeverityFilter(metric.label.includes('Compliance') ? 'Low' : 'All')} title={metric.label}>
                <div className="metric-head">
                  <span className="metric-label">{metric.label}</span>
                  <span className={`metric-trend ${metric.direction}`}>
                    {metric.direction === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {metric.trend}
                  </span>
                </div>
                <div className="metric-value mono">{metric.value}</div>
                <svg className="metric-sparkline" viewBox="0 0 104 28" preserveAspectRatio="none" aria-hidden="true">
                  <polyline points={sparklinePoints(metric.series)} />
                </svg>
              </button>
            ))}
      </section>

      <section className="main-grid" aria-label="Threat intelligence panels">
        <article className="panel threat-map-panel">
          <div className="panel-head compact">
            <div>
              <div className="panel-title">Global Threat Map</div>
              <div className="panel-subtitle">Hover a hotspot for location and count. Click to filter data.</div>
            </div>
            <div className="live-chip">
              <span className={`live-dot ${isLive ? 'is-live' : 'fallback'}`} />
              {isLive ? 'Live signal' : 'Fallback telemetry'}
            </div>
          </div>

          <WorldThreatMap
            activeRegion={selectedRegion}
            onSelectRegion={(regionName) => setSelectedRegion((current) => (current === regionName ? 'All regions' : regionName))}
            hotspots={regionBars}
          />

          <div className="region-bars">
            {regionBars.map((region) => (
              <button
                key={region.name}
                type="button"
                className={`region-row ${selectedRegion === region.name ? 'is-active' : ''}`}
                onClick={() => setSelectedRegion((current) => (current === region.name ? 'All regions' : region.name))}
                title={`${region.name} • ${region.count} events`}
              >
                <div className="region-row-head">
                  <span>{region.name}</span>
                  <span className="mono">{region.count}</span>
                </div>
                <div className="region-bar-track">
                  <span className={`region-bar fill-${region.pulse}`} style={{ width: `${region.percent}%` }} />
                </div>
              </button>
            ))}
          </div>
        </article>

        <aside className="sidebar-column">
          <section className="panel analyst-panel">
            <div className="panel-head compact">
              <div>
                <div className="panel-title">AI Analyst</div>
                <div className="panel-subtitle">Plain-language summary with next-step recommendations.</div>
              </div>
              <span className={`confidence-chip ${activeIncidents > 2 ? 'high' : 'medium'}`}>
                <Sparkles size={13} /> {activeIncidents > 2 ? 'High confidence' : 'Medium confidence'}
              </span>
            </div>

            <div className="analyst-summary">
              <div className="analysis-badge">
                <Flame size={14} /> Threat summary
              </div>
              <p>
                {selectedFeed
                  ? `${selectedFeed.event} is concentrating around ${selectedFeed.region}. The pattern suggests an active reconnaissance or exploitation campaign with repeated probes from ${selectedFeed.source}.`
                  : 'No active incident selected.'}
              </p>
            </div>

            <div className="analyst-grid">
              <div className="analysis-card">
                <span>Confidence</span>
                <strong>{activeIncidents > 2 ? 'High' : 'Medium'}</strong>
              </div>
              <div className="analysis-card">
                <span>Suggested action</span>
                <strong>{selectedFeed?.severity === 'Critical' ? 'Isolate host' : 'Investigate alert'}</strong>
              </div>
            </div>

            <div className="analyst-actions">
              <button type="button" className="ui-button ghost"><BellRing size={14} /> Explain</button>
              <button type="button" className="ui-button ghost"><Search size={14} /> Investigate</button>
              <button type="button" className="ui-button primary"><Zap size={14} /> Take Action</button>
            </div>
          </section>

          <section className="panel feed-panel">
            <div className="panel-head compact feed-head">
              <div>
                <div className="panel-title">Live Activity Feed</div>
                <div className="panel-subtitle">Real-time analyst stream with filters and quick drill-down.</div>
              </div>
              <div className="feed-controls">
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="ui-select">
                  {feedSortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <select value={feedFilter} onChange={(event) => setFeedFilter(event.target.value)} className="ui-select">
                  {['All', 'Critical', 'High', 'Medium', 'Low'].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="feed-list">
              {feedItems.length ? feedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`feed-item ${selectedFeed?.id === item.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedFeedId(item.id)}
                  title={`${item.event} • ${item.source}`}
                >
                  <span className={`feed-icon tone-${statusTone[item.severity]}`}>
                    {item.severity === 'Critical' ? <TriangleAlert size={14} /> : item.severity === 'High' ? <AlertTriangle size={14} /> : item.severity === 'Medium' ? <Layers3 size={14} /> : <ShieldCheck size={14} />}
                  </span>
                  <div className="feed-copy">
                    <div className="feed-row">
                      <strong>{item.event}</strong>
                      <span className={`feed-severity tone-${statusTone[item.severity]}`}>{item.severity}</span>
                    </div>
                    <p>{item.source} • {item.region} • {item.timestamp}</p>
                  </div>
                  <ChevronRight size={14} className="feed-chevron" />
                </button>
              )) : <div className="empty-state">No active threats detected</div>}
            </div>
          </section>
        </aside>
      </section>

      <section className="bottom-grid" aria-label="Threat logs and incident details">
        <article className="panel logs-panel">
          <div className="panel-head compact logs-head">
            <div>
              <div className="panel-title">Threat Analytics</div>
              <div className="panel-subtitle">Interactive visual breakdown of severity, trend, and attack sources.</div>
            </div>
            <div className="filters-inline">
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`ui-chip ${severityFilter === item ? 'is-active' : ''}`}
                  onClick={() => setSeverityFilter(item)}
                >
                  <Filter size={12} /> {item}
                </button>
              ))}
            </div>
          </div>

          <div className="logs-toolbar">
            <label className="search-wrap" htmlFor="logs-search">
              <Search size={14} />
              <input
                id="logs-search"
                className="ui-field"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search timestamp, source IP, threat type, or status"
              />
            </label>
          </div>

          <div className="analytics-grid">
            <section className="viz-card">
              <div className="viz-head">
                <h3>Severity Distribution</h3>
                <span className="mono">{severityBreakdown.total} filtered events</span>
              </div>
              <div className="donut-layout">
                <div className="severity-donut" style={{ background: severityBreakdown.gradient }}>
                  <div className="severity-donut-hole">
                    <strong>{severityBreakdown.total}</strong>
                    <span>events</span>
                  </div>
                </div>
                <div className="severity-legend">
                  {severityBreakdown.severityOrder.map((severity) => {
                    const count = severityBreakdown.counts[severity];
                    const percent = Math.round((count / severityBreakdown.total) * 100);
                    return (
                      <button
                        key={severity}
                        type="button"
                        className={`severity-legend-item ${severityFilter === severity ? 'is-active' : ''}`}
                        onClick={() => setSeverityFilter((current) => (current === severity ? 'All' : severity))}
                      >
                        <i style={{ background: severityBreakdown.severityPalette[severity] }} />
                        <span>{severity}</span>
                        <strong className="mono">{count}</strong>
                        <small className="mono">{Number.isFinite(percent) ? percent : 0}%</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="viz-card">
              <div className="viz-head">
                <h3>Telemetry Velocity</h3>
                <span className="mono">Last {trendSeries.length} intervals</span>
              </div>
              <div className="trend-shell">
                <svg viewBox="0 0 420 132" className="trend-chart" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(249, 115, 22, 0.48)" />
                      <stop offset="100%" stopColor="rgba(249, 115, 22, 0.02)" />
                    </linearGradient>
                  </defs>
                  {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                    <line
                      key={ratio}
                      x1="12"
                      x2="408"
                      y1={14 + ratio * 102}
                      y2={14 + ratio * 102}
                      className="trend-grid-line"
                    />
                  ))}
                  <path d={trendPaths.areaPath} className="trend-area" fill="url(#trendAreaFill)" />
                  <path d={trendPaths.linePath} className="trend-line" />
                  {trendPaths.points.map((point) => (
                    <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="2.8" className="trend-point" />
                  ))}
                </svg>
                <div className="trend-meta mono">
                  <span>Min: {trendPaths.min}</span>
                  <span>Peak: {trendPaths.max}</span>
                </div>
              </div>
            </section>

            <section className="viz-card">
              <div className="viz-head">
                <h3>Top Attack Sources</h3>
                <span className="mono">Ranked by frequency</span>
              </div>
              <div className="source-bars">
                {topSources.length ? topSources.map((entry) => (
                  <button
                    key={entry.source}
                    type="button"
                    className="source-row"
                    onClick={() => setSearchText(entry.source)}
                    title={`Filter by source ${entry.source}`}
                  >
                    <div className="source-row-head">
                      <span className="mono">{entry.source}</span>
                      <strong className="mono">{entry.count}</strong>
                    </div>
                    <div className="source-row-track">
                      <span className="source-row-fill" style={{ width: `${entry.percent}%` }} />
                    </div>
                  </button>
                )) : <div className="empty-state">No sources match current filters.</div>}
              </div>
            </section>
          </div>

          <div className="event-strip">
            <div className="viz-head">
              <h3>Recent Event Stream</h3>
              <span className="mono">Click a row to open Incident Detail</span>
            </div>
            <div className="event-row-list">
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={`event-skeleton-${index}`} className="event-row">
                      <div className="skeleton-line" />
                    </div>
                  ))
                : visualRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className={`event-row ${selectedRow?.id === row.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedRowId(row.id)}
                    >
                      <div className="event-row-main">
                        <span className="mono">{row.timestamp}</span>
                        <strong>{row.event}</strong>
                      </div>
                      <div className="event-row-meta">
                        <span className="mono">{row.source}</span>
                        <span className={`severity-badge ${row.severity.toLowerCase()}`}>{row.severity}</span>
                      </div>
                    </button>
                  ))}
            </div>
          </div>
        </article>

        <aside className="panel detail-panel">
          <div className="panel-head compact">
            <div>
              <div className="panel-title">Incident Detail</div>
              <div className="panel-subtitle">Selected row expanded for fast response.</div>
            </div>
            <span className="detail-status">{selectedRow?.status || 'Monitoring'}</span>
          </div>

          <div className="detail-body">
            <div className="detail-item">
              <span>Threat</span>
              <strong>{selectedRow?.event || 'No incident selected'}</strong>
            </div>
            <div className="detail-item">
              <span>Source</span>
              <strong className="mono">{selectedRow?.source || '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Region</span>
              <strong>{selectedRow?.region || '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Indicator</span>
              <strong className="mono">{selectedRow?.indicator || '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Recommended playbook</span>
              <strong>{selectedRow?.severity === 'Critical' ? 'Containment + block' : 'Investigate + monitor'}</strong>
            </div>

            <div className="activity-card">
              <div className="activity-head">
                <Globe2 size={14} /> Activity graph
              </div>
              <svg className="mini-sparkline is-large" viewBox="0 0 104 28" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={sparklinePoints(sparkSeries)} />
              </svg>
              <p>Tempo of incidents remains elevated across the selected region with repeated probe activity.</p>
            </div>
          </div>
        </aside>
      </section>

      {isPaletteOpen ? (
        <div className="palette-overlay" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="palette-panel panel">
            <label className="palette-input-wrap" htmlFor="palette-query">
              <Search size={14} />
              <input
                id="palette-query"
                autoFocus
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                placeholder="Search command"
              />
            </label>

            <div className="palette-list">
              {filteredCommands.map((item) => (
                <button key={item.id} type="button" className="palette-item" onClick={() => handleCommand(item.id)}>
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
