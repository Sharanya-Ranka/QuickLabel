import React, { useState, useEffect } from 'react';

interface DataRow {
  id: string;
  embedding?: Float32Array | number[];
  [key: string]: any; // Catch-all for other text metadata fields
}

interface DebuggerProps {
  datasetRef: React.RefObject<DataRow[]>;
}

export default function DataRefDebugger({ datasetRef }: DebuggerProps) {
  const [snapshot, setSnapshot] = useState<DataRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});

  // Poll the ref every 300ms so it visualizes live data additions without choking the thread
  useEffect(() => {
    const interval = setInterval(() => {
      if (datasetRef.current && datasetRef.current.length !== snapshot.length) {
        // Create a lightweight swallow clone to minimize memory churn
        setSnapshot([...datasetRef.current]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [datasetRef, snapshot.length]);

  const toggleRow = (id: string) => {
    setIsExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter rows by ID or text contents if you have text fields attached
  const filteredData = snapshot.filter(row => 
    row.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl font-mono text-xs text-slate-300 overflow-hidden my-4">
      {/* Header Diagnostics Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="font-bold text-slate-200">Ref Memory Monitor</h3>
          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
            Total Rows: {snapshot.length}
          </span>
        </div>
        
        {/* Quick Search */}
        <input
          type="text"
          placeholder="Search by ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
        />
      </div>

      {/* Main Scroll Window */}
      <div className="h-64 overflow-y-auto p-4 space-y-2 divide-y divide-slate-900">
        {filteredData.length === 0 ? (
          <div className="text-slate-500 text-center py-8 italic">
            {snapshot.length === 0 ? "Dataset ref is currently completely empty []" : "No rows match search query."}
          </div>
        ) : (
          filteredData.map((row, index) => {
            const hasVector = !!row.embedding;
            const vectorLength = hasVector ? (row.embedding instanceof Float32Array ? row.embedding.length : (row.embedding as number[]).length) : 0;
            const isOpen = !!isExpanded[row.id];

            return (
              <div key={row.id || index} className="pt-2 first:pt-0">
                <div 
                  onClick={() => toggleRow(row.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-900 p-1 rounded transition-colors"
                >
                  <span className="text-indigo-400 font-semibold">
                    {isOpen ? '▼' : '▶'} [{index}] ID: <span className="text-amber-400">"{row.id}"</span>
                  </span>
                  
                  <span className="text-slate-500 text-[10px] flex gap-2">
                    {hasVector ? (
                      <span className="bg-blue-950 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded">
                        Float32({vectorLength})
                      </span>
                    ) : (
                      <span className="bg-rose-950 text-rose-400 border border-rose-900 px-1.5 py-0.5 rounded">
                        No Embedding Array
                      </span>
                    )}
                  </span>
                </div>

                {/* Collapsible Inspection Details */}
                {isOpen && (
                  <div className="mt-2 ml-4 p-3 bg-slate-900/50 border border-slate-900 rounded space-y-1.5 text-slate-400 max-h-40 overflow-y-auto">
                    <div>
                      <span className="text-slate-500">Metadata:</span>
                      <pre className="text-emerald-400 text-[11px] whitespace-pre-wrap mt-0.5">
                        {JSON.stringify(
                          Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'embedding')), 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                    {hasVector && (
                      <div className="pt-1.5 border-t border-slate-800/60">
                        <span className="text-slate-500">Vector Preview (First 5 dimensions):</span>
                        <div className="text-blue-300 tracking-wider mt-0.5 bg-slate-950 p-1.5 rounded border border-slate-950">
                          [ {Array.from(row.embedding!).slice(0, 5).map(n => n.toFixed(5)).join(', ')} ... ]
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}