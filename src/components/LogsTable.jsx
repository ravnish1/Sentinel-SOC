import React from 'react';

const LogsTable = React.memo(({ logs }) => {
  const sevClass = (s) => `log-sev sev-${s.toLowerCase()}`;

  return (
    <div className="logs-list mono">
      {logs.map((log) => (
        <div key={log.id} className="log-entry">
          <span className="log-time">{log.timestamp}</span>
          <span className="log-source">{log.source}</span>
          <span className="log-event">{log.event}</span>
          <span className={sevClass(log.severity)}>{log.severity.slice(0, 4).toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
});

export default LogsTable;
