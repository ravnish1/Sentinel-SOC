export const mockSummaryStats = {
  totalThreats: 24,
  activeAttacks: 3,
  infectedSystems: 2,
  compromisedUsers: 1,
};

export const mockLogs = [
  { id: 1, timestamp: '10:23:45', source: '45.33.22.11', event: 'SQL Injection Attempt', severity: 'High' },
  { id: 2, timestamp: '10:25:12', source: '172.16.0.3', event: 'Multiple Failed Logins', severity: 'Medium' },
  { id: 3, timestamp: '10:30:00', source: '185.15.22.1', event: 'Port Scan Detected', severity: 'Low' },
  { id: 4, timestamp: '11:05:22', source: '91.134.0.9', event: 'Ransomware Execution', severity: 'Critical' },
  { id: 5, timestamp: '11:10:05', source: '45.33.22.11', event: 'Lateral Movement', severity: 'High' },
];
