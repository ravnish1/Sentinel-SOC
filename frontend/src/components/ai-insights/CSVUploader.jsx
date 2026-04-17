import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useThreatEngine } from '../../hooks/useThreatEngine';
import { PipelineStatusBar } from './PipelineStatusBar';

const CSVUploader = () => {
  const { uploadCSV, getPipelineStatus } = useThreatEngine();
  const [status, setStatus] = useState('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (status === 'complete') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setResults(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setErrorMsg('Please select a valid CSV file.');
      setStatus('error');
      return;
    }

    try {
      setStatus('uploading');
      setErrorMsg('');
      const res = await uploadCSV(file, true);

      if (res.status === 'completed') {
        setResults(res);
        setStatus('complete');
        getPipelineStatus();
      } else if (res.status === 'queued') {
        setStatus('idle');
        getPipelineStatus();
      } else {
        throw new Error(res.error || 'Unknown upload error');
      }
    } catch (err) {
      console.error('[Uploader] Error:', err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const triggerSearch = () => {
    fileInputRef.current?.click();
  };

  const getBorderColor = () => {
    if (status === 'error') return '#ef4444';
    if (status === 'complete') return '#16a34a';
    if (status === 'uploading' || status === 'processing') return '#2563eb';
    return isDragging ? '#2563eb' : 'rgba(0,0,0,0.1)';
  };

  return (
    <div className="csv-uploader-container" style={{ marginBottom: '24px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files[0])}
        accept=".csv"
        style={{ display: 'none' }}
      />

      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={status === 'idle' ? triggerSearch : undefined}
        style={{
          height: '180px',
          border: `2px dashed ${getBorderColor()}`,
          borderRadius: '20px',
          background: isDragging ? '#f8fafc' : '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: status === 'idle' ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}
        whileHover={status === 'idle' ? { scale: 1.01, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' } : {}}
      >
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center' }}
            >
              <Upload size={40} color={isDragging ? '#2563eb' : '#94a3b8'} style={{ marginBottom: '12px' }} />
              <div style={{ color: '#1e293b', fontWeight: '800', fontSize: '1rem' }}>
                {isDragging ? 'Release to Audit' : 'Ingest Threat Intelligence CSV'}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                Drag and drop or click to upload local cyber research files
              </div>
            </motion.div>
          )}

          {status === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center' }}
            >
              <Loader2 className="animate-spin" size={40} color="#2563eb" style={{ marginBottom: '12px' }} />
              <div style={{ color: '#2563eb', fontWeight: '900' }}>AI PIPELINE ACTIVE: ENRICHING DATA...</div>
            </motion.div>
          )}

          {status === 'complete' && results && (
            <motion.div
              key="complete"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ width: '100%', padding: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#16a34a', fontWeight: '900', marginBottom: '20px', fontSize: '0.9rem' }}>
                <CheckCircle size={20} />
                HUNT COMPLETE — {results.pipeline.inserted} FINDINGS BROADCAST
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Critical Threats', value: results.summary.critical_threats, color: '#dc2626' },
                  { label: 'Analysed', value: results.pipeline.enriched, color: '#2563eb' },
                  { label: 'Auto Blocks', value: results.summary.immediate_actions, color: '#ea580c' },
                  { label: 'Conf.', value: `${results.summary.avg_confidence}%`, color: '#1e293b' }
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', color: '#dc2626' }}
            >
              <AlertCircle size={40} style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: '900' }}>Ingestion Failed</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{errorMsg}</div>
              <button
                onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}
                style={{ marginTop: '12px', background: '#fee2e2', border: '1px solid #dc2626', color: '#dc2626', padding: '4px 16px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <PipelineStatusBar />
      </div>
    </div>
  );
};

export { CSVUploader };
