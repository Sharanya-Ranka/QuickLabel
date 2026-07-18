import React, { useState, useEffect, } from "react";
import type { DataRow } from "../types";
import { PredictionItem } from './PredictionItem';
import DownloadDatasetButton from './DownloadDatasetButton';
import { InfoTooltip } from "./InfoTooltip";

interface PredictionViewerProps {
  fullDatasetRef: React.RefObject<DataRow[] | null>;
  classLabels: string[];
  modelUpdateCount: number;
  maxEntriesK?: number;
}

function argMax(arr: number[]) {
  if (arr.length === 0) return -1;
  
  let maxIdx = 0;
  let maxVal = arr[0];
  
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

export default function PredictionViewer({ 
  fullDatasetRef, 
  classLabels, 
  modelUpdateCount,
  maxEntriesK = 5 ,
}: PredictionViewerProps) {
  
  // Selection View Mode: 'RANDOM' or matching a specific Class Label index string
  const [viewMode, setViewMode] = useState<string>('RANDOM');
  // Trigger state increment to forcefully re-roll new randomized samplings on click
  const [viewCount, setViewCount] = useState<number>(0);
  const [visibleItems, setVisibleItems] = useState<DataRow[]>([]);

  useEffect(() => {
    const dataset = fullDatasetRef.current || [];
    
    // Only display rows that have active model calculations available
    const evaluatedItems = dataset.filter(row => row.probabilities && row.probabilities.length > 0);
    
    if (viewMode === 'RANDOM') {
      if (evaluatedItems.length === 0) setVisibleItems([]);
      // Create a shallow copy and shuffle using a fast in-place random swap algorithm
      const shuffled = [...evaluatedItems];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setVisibleItems(shuffled.slice(0, maxEntriesK));
    } else {
      // Filter by rows whose highest probability matches the selected target class index
      const targetClassIdx = parseInt(viewMode, 10);
      const filteredItems = evaluatedItems.filter(row => argMax(row.probabilities!) === targetClassIdx)

      if (filteredItems.length === 0) setVisibleItems([]);
      // Create a shallow copy and shuffle using a fast in-place random swap algorithm
      const shuffled = [...filteredItems];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      setVisibleItems(shuffled
        .slice(0, maxEntriesK));
    }
  }, [viewCount, modelUpdateCount])

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-2">
      
      
      {/* 1. Header & Control Selector Suite */}
      <div className="flex flex-col sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-row">
          <h3 className="text-md font-bold text-slate-900">Model Predictions</h3>
          {/* <p className="text-xs text-slate-400 mt-0.5">Inspect current live classifier evaluations</p> */}
          <InfoTooltip
            content={`Browse live model predictions to see how the model is labeling the dataset.
                  You can also download model predictions for all examples along with some auxiliary information.`}
            side='right'
          />
        </div>
          <DownloadDatasetButton 
            fullDatasetRef={fullDatasetRef}
            classLabels={classLabels}
            isActive={modelUpdateCount > 0}
          />

        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => {setViewMode(e.target.value);setViewCount(prev => prev+1)}}
            className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 font-semibold text-slate-700 focus:bg-white focus:outline-indigo-500"
          >
            <option value="RANDOM">Random Selection</option>
            {classLabels.map((label, idx) => (
              <option key={idx} value={idx.toString()}>
                Predicted as: {label}
              </option>
            ))}
          </select>
            <button
              onClick={() => setViewCount(prev => prev + 1)}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center justify-center"
            >
              {/* Changed display-inline-block to inline-block so the scale transform activates */}
            <span className="inline-block transform scale-130">🔄</span>
          </button>
        </div>
      </div>

      {/* 2. Results List Wrapper Workspace */}
      {visibleItems.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
          <p className="text-xs text-slate-400 italic">
            No matching items found. Make sure the dataset is parsed and the initial Cold-Start baseline is trained.
          </p>
        </div>
      ) : (
        <div className="space-y-0 max-h-[600px] overflow-y-auto pr-1">
          {visibleItems.map(item => (
            <PredictionItem 
              key={item.id} 
              text={item.text} 
              probabilities={item.probabilities || []} 
              classLabels={classLabels} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
