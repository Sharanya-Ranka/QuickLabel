import React from "react";
import type { EmbeddingStatus } from "../pages/MainPagev3";

interface ConfigurePanelProps {
  // Common states
  phase: 'CONFIG' | 'UPLOAD' | 'EMBEDDING' | 'COLD_START' | 'ACTIVE_LEARNING' | 'DASHBOARD' | string;

  // File Upload attributes
  handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  embeddingStatus: EmbeddingStatus;
  streamProgress: { progress: number; total: number };

  // Class Selection attributes
  numClasses: number;
  classLabels: string[];
  updateClassCount: (newCount: number) => void;
  updateLabelName: (index: number, newName: string) => void;
}

export default function ConfigurePanel({
  phase,
  handleCSVUpload,
  embeddingStatus,
  streamProgress,
  numClasses,
  classLabels,
  updateClassCount,
  updateLabelName,
}: ConfigurePanelProps) {
  
  const isEditable = phase === "CONFIG";

  return (
    <div className="bg-white px-1 py-2 rounded-xl space-y-2">
      
      {/* Primary Section Header Card layout block */}
      <div className="border-b border-slate-100 pb-0">
        <h2 className="text-lg font-bold text-slate-900 text-indigo-600">
          Configure
        </h2>
        {/* <p className="text-xs text-slate-400 mt-0.5">
          Establish labeling targets and load parsing assets before beginning active optimization pipelines.
        </p> */}
      </div>

      <div className="grid grid-cols-1 gap-3">
        
        {/* ==========================================
            SUBHEADING 1: FILE UPLOAD WORKSPACE
           ========================================== */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase text-xs text-slate-400">
            File Upload
          </h3>
          <div className="p-1 rounded-xl space-y-3">
            {/* <label className="block text-xs font-semibold text-slate-600">
              Dataset Ingestion (CSV)
            </label> */}
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={!isEditable}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50 transition-colors"
            />
            
            {/* Stream Vector Progress Ticker Layout */}
            {embeddingStatus !== "IDLE" && (
              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{
                      width: `${(streamProgress.progress / Math.max(1, streamProgress.total)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>Server streaming embeddings...</span>
                  <span className="font-mono">{streamProgress.progress} / {streamProgress.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            SUBHEADING 2: CLASSES DEFINITION WORKSPACE
           ========================================== */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase text-xs text-slate-400">
            Classes
          </h3>
          <div className="p-1 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Number of target classes:
              </label>
              <input 
                type="number" 
                min="2" 
                max="10"
                value={numClasses}
                onChange={(e) => updateClassCount(parseInt(e.target.value, 10) || 2)}
                disabled={!isEditable}
                className="w-16 px-2 py-1 border border-slate-300 bg-white rounded text-xs font-bold text-center disabled:bg-slate-100 disabled:text-slate-400 focus:outline-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Label Names:
              </span>
              <div className="flex flex-wrap gap-2">
                {classLabels.map((label, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={label}
                    disabled={!isEditable}
                    onChange={(e) => updateLabelName(idx, e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded text-xs w-24 bg-white text-slate-700 font-medium shadow-xs focus:bg-white focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                    placeholder={`Class ${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}