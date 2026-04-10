import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LogsTable.css';

const LogsTable = ({ logs }) => {
  return (
    <div className="terminal-logs-container">
      <div className="logs-header font-mono">
        <div className="col time">TIMESTAMP</div>
        <div className="col source">SOURCE IP</div>
        <div className="col event">EVENT</div>
        <div className="col severity">SEV</div>
      </div>
      
      <div className="logs-body">
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div 
              key={log.id} 
              className={`log-row font-mono status-${log.severity.toLowerCase()}`}
              initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(6, 182, 212, 0.4)' }}
              animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="col time">{log.timestamp}</div>
              <div className="col source">{log.source}</div>
              <div className="col event highlight-text">{log.event}</div>
              <div className="col severity indicator">[{log.severity.toUpperCase().substring(0, 4)}]</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LogsTable;
