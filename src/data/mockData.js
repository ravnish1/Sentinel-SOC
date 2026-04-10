export const mockThreatData = {
  nodes: [
    { id: "1", label: "IP", ip: "192.168.1.100", type: "Server", status: "safe" },
    { id: "2", label: "IP", ip: "45.33.22.11", type: "Attacker", status: "malicious" },
    { id: "3", label: "User", username: "admin", type: "User", status: "compromised" },
    { id: "4", label: "Malware", hash: "a1b2c3d4", type: "Ransomware", status: "malicious" },
    { id: "5", label: "IP", ip: "10.0.0.5", type: "Database", status: "safe" },
    { id: "6", label: "IP", ip: "185.15.22.1", type: "Attacker", status: "malicious" },
    { id: "7", label: "IP", ip: "10.0.0.8", type: "Workstation", status: "safe" }
  ],
  links: [
    { source: "2", target: "1", relationship: "ATTACKED" },
    { source: "3", target: "1", relationship: "ACCESSED" },
    { source: "4", target: "1", relationship: "INFECTED" },
    { source: "2", target: "5", relationship: "ATTACKED" },
    { source: "6", target: "7", relationship: "ATTACKED" },
    { source: "4", target: "7", relationship: "INFECTED" },
    { source: "3", target: "5", relationship: "ACCESSED" }
  ]
};

export const mockSummaryStats = {
  totalThreats: 24,
  activeAttacks: 3,
  infectedSystems: 2,
  compromisedUsers: 1,
};

export const mockLogs = [
  { id: 1, timestamp: "2024-04-09 10:23:45", source: "45.33.22.11", target: "192.168.1.100", event: "SQL Injection Attempt", severity: "High" },
  { id: 2, timestamp: "2024-04-09 10:25:12", source: "admin", target: "192.168.1.100", event: "Multiple Failed Logins", severity: "Medium" },
  { id: 3, timestamp: "2024-04-09 10:30:00", source: "185.15.22.1", target: "10.0.0.8", event: "Port Scan Detected", severity: "Low" },
  { id: 4, timestamp: "2024-04-09 11:05:22", source: "a1b2c3d4", target: "192.168.1.100", event: "Ransomware Execution", severity: "Critical" },
  { id: 5, timestamp: "2024-04-09 11:10:05", source: "a1b2c3d4", target: "10.0.0.8", event: "Lateral Movement", severity: "High" }
];
