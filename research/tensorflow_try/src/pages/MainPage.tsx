import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

// Re-using the types established in our architecture
export type ClassLabel = string;

export interface DataRow {
  id: string;
  text: string;
  embedding?: number[];
  isUserLabeled: boolean;
}

type AppStatus = 'IDLE' | 'PARSING' | 'INITIALIZING_MODEL' | 'EMBEDDING' | 'COMPLETE';

export default function MainPage() {
  const [status, setStatus] = useState<AppStatus>('IDLE');
//   const [dataset, setDataset] = useState<DataRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('PARSING');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          alert('The CSV file is empty.');
          setStatus('IDLE');
          return;
        }

        // Dynamically find the first column's header key
        const firstColumnKey = Object.keys(results.data[0] as object)[0];

        // Map parsed rows into our DataRow state shape
        const parsedRows: DataRow[] = results.data.map((row: any, index: number) => ({
          id: `row-${index}`,
          text: row[firstColumnKey] || '',
          isUserLabeled: false,
        })).filter(row => row.text.trim().length > 0);

        // setDataset(parsedRows);
        setTotalRows(parsedRows.length);
        startEmbeddingProcess(parsedRows);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Failed to parse CSV file.');
        setStatus('IDLE');
      }
    });
  };

  const startEmbeddingProcess = (rows: DataRow[]) => {
    setStatus('INITIALIZING_MODEL');
    
    // Initialize standard Vite/Webpack Web Worker
    workerRef.current = new Worker(new URL('../scripts/worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'READY':
          setStatus('EMBEDDING');
          workerRef.current?.postMessage({ type: 'EMBED_BATCH', payload: { rows } });
          break;

        case 'EMBED_BATCH_PROGRESS':
            setProgress(payload.progress);
            
            // setDataset(prev => {
            //     // Create a quick lookup map of the incoming batch updates for O(1) matching
            //     const batchMap = new Map(payload.results.map((r: any) => [r.id, r.embedding]));
                
            //     return prev.map(row => 
            //     batchMap.has(row.id) 
            //         ? { ...row, embedding: batchMap.get(row.id) } 
            //         : row
            //     );
            // });
            break;

        case 'EMBED_COMPLETE':
          setStatus('COMPLETE');
          // Worker's job is done for the embedding phase
          workerRef.current?.terminate();
          workerRef.current = null;
          break;
      }
    };

    // Trigger the worker to download the weights and initialize the pipeline
    workerRef.current.postMessage({ type: 'INITIALIZE' });
  };

  // Calculate percentage for the progress bar
  const progressPercentage = totalRows > 0 ? Math.round((progress / totalRows) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dataset Ingestion</h1>
          <p className="text-sm text-slate-500">
            Upload a CSV to begin the Active Learning pipeline. We will automatically use the first column.
          </p>
        </div>

        {status === 'IDLE' && (
          <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-indigo-600">Click to upload or drag and drop</span>
            <p className="text-xs text-slate-500 mt-1">CSV files only</p>
          </div>
        )}

        {(status === 'PARSING' || status === 'INITIALIZING_MODEL' || status === 'EMBEDDING') && (
          <div className="space-y-6">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-700">
                {status === 'PARSING' && 'Parsing CSV...'}
                {status === 'INITIALIZING_MODEL' && 'Downloading Model Weights...'}
                {status === 'EMBEDDING' && `Embedding Texts (${progress} / ${totalRows})`}
              </span>
              <span className="text-indigo-600">{progressPercentage}%</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {status === 'INITIALIZING_MODEL' && (
              <p className="text-xs text-slate-500 text-center animate-pulse">
                This may take a moment on the first run.
              </p>
            )}
          </div>
        )}

        {status === 'COMPLETE' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Embeddings Complete</h2>
            <p className="text-sm text-slate-500">
              Successfully processed {totalRows} rows. Ready for the Cold-Start phase.
            </p>
            <button className="mt-4 w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
              Continue to Labeling
            </button>
          </div>
        )}

      </div>
    </div>
  );
}