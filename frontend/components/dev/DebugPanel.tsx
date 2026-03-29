'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for react-json-view to avoid SSR issues
const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

type LogCategory = 'wallet' | 'contract' | 'wizard' | 'system';

interface LogEvent {
  id: string;
  timestamp: Date;
  category: LogCategory;
  message: string;
  data?: any;
}

export const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  useEffect(() => {
    // Only mount keyboard listener in non-production
    if (process.env.NODE_ENV === 'production') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        setIsMinimized(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mock initial logs for development display purposes
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    
    setLogs([
      { id: '1', timestamp: new Date(), category: 'system', message: 'Debug Panel Initialized' },
      { id: '2', timestamp: new Date(), category: 'contract', message: 'Mock Contract Response', data: { status: 'success', hash: '0x123...', xdr: 'AAAAAQAAAA...' } }
    ]);
  }, []);

  if (process.env.NODE_ENV === 'production') {
    return null; // Completely absent in production
  }

  if (!isVisible) {
    return null;
  }

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-gray-900 text-green-400 p-3 rounded-full shadow-lg cursor-pointer z-50 flex items-center justify-center border border-green-500/30 hover:bg-gray-800 transition-colors"
        title="Restore Debug Panel"
      >
        <span className="text-xl px-1">🛠️</span>
      </div>
    );
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.category === filter);

  return (
    <div className="fixed bottom-4 right-4 w-[600px] h-[500px] bg-gray-950 text-gray-200 border border-gray-800 rounded-lg shadow-2xl z-50 flex flex-col font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 p-2 border-b border-gray-800">
        <div className="flex flex-col">
          <span className="font-bold text-green-400">Developer Debug Panel</span>
          <span className="text-xs text-gray-500">Shortcut: Ctrl+Shift+D</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-gray-800 rounded outline-none w-6 h-6 flex items-center justify-center">_</button>
          <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-red-900 rounded outline-none w-6 h-6 flex items-center justify-center">X</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 outline-none text-xs"
        >
          <option value="all">All Categories</option>
          <option value="wallet">Wallet</option>
          <option value="contract">Contract</option>
          <option value="wizard">Wizard</option>
          <option value="system">System</option>
        </select>
        
        <button 
          onClick={() => setLogs([])}
          className="bg-red-900/40 text-red-300 hover:bg-red-900/60 px-3 py-1 rounded text-xs transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center mt-4 text-xs italic">No logs available</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="border border-gray-800 rounded bg-gray-900 overflow-hidden">
              <div className="flex gap-2 p-2 border-b border-gray-800 bg-gray-800/50 text-xs">
                <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span>
                <span className={`px-1.5 rounded uppercase font-bold
                  ${log.category === 'contract' ? 'text-blue-400 bg-blue-400/10' : 
                    log.category === 'wallet' ? 'text-purple-400 bg-purple-400/10' : 
                    log.category === 'wizard' ? 'text-yellow-400 bg-yellow-400/10' : 
                    'text-green-400 bg-green-400/10'}`}>
                  {log.category}
                </span>
                <span className="text-gray-300 ml-1">{log.message}</span>
              </div>
              
              {log.data && (
                <div className="p-2 bg-gray-950 overflow-auto max-h-48 text-xs">
                  <ReactJson 
                    src={log.data} 
                    theme="twilight"
                    collapsed={1} 
                    displayDataTypes={false}
                    name={false}
                    style={{ backgroundColor: 'transparent' }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
