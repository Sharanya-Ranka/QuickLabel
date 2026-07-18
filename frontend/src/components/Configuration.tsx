import React , { useRef }from "react";
import Papa from "papaparse";
import { gatherServerEmbeddings } from "../scripts/gatherServerEmbeddings";
import type { AppPhase, DataRow, EmbeddingStatus } from "../types";
import { InfoTooltip } from "./InfoTooltip";

interface ConfigurePanelProps {
  fullDatasetRef: React.RefObject<DataRow[]>;
  // Common states
  phase: AppPhase;
  setPhase: React.Dispatch<
      React.SetStateAction<AppPhase>
    >;

  // File Upload attributes
  embeddingStatus: EmbeddingStatus;
  setEmbeddingStatus: React.Dispatch<
      React.SetStateAction<EmbeddingStatus>
    >;
  streamProgress: { progress: number; total: number };
  setStreamProgress: React.Dispatch<
      React.SetStateAction<{progress: number, total:number}>
    >;

  // Class Selection attributes
  numClasses: number;
  classLabels: string[];
  updateClassCount: (newCount: number) => void;
  updateLabelName: (index: number, newName: string) => void;
}

export default function ConfigurePanel({
  fullDatasetRef,
  setStreamProgress,
  phase,
  setPhase,
  embeddingStatus,
  setEmbeddingStatus,
  streamProgress,
  numClasses,
  classLabels,
  updateClassCount,
  updateLabelName,
}: ConfigurePanelProps) {
  
  const isEditable = phase !== "ACTIVE_LEARNING";

  // Create a reference to anchor the DOM node of the file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  // Handle CSV Processing and Dynamic Streaming Ingestion
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // if(embeddingStatus === "EMBEDDING") {
    setPhase("CONFIG");
    setEmbeddingStatus("EMBEDDING");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data || results.data.length === 0) return;

        const firstColKey = Object.keys(results.data[0] as object)[0];
        const parsed: DataRow[] = results.data
          .map((row: any, i: number) => ({
            id: `row-${i}`,
            text: row[firstColKey] || "",
            isUserLabeled: false,
          }))
          .filter((r) => r.text.trim().length > 0);

        fullDatasetRef.current = parsed;
        setStreamProgress({ progress: 0, total: parsed.length });

        // Advance out of setup phase into labeling setup
        setPhase("COLD_START");
        // Wrap the async network operation in a try/catch block
        try {
          await gatherServerEmbeddings({
            rows: parsed,
            fullDatasetRef,
            setEmbeddingStatus,
            setStreamProgress,
          });
        } catch (error) {
          console.error("Embedding generation failed:", error);
          event.target.value = "";
          // // 1. Clear the input element so the user can re-upload the same or fixed file
          // if (fileInputRef.current) {
          //   fileInputRef.current.value = "";
          // }
          
          // 2. Roll back state transitions to keep UI responsive
          setEmbeddingStatus("IDLE");
          setPhase("CONFIG"); 
        }
      },
    });
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = fileInputRef.current;
    
    // Check if the input element exists and already holds at least 1 file
    if (input && input.files && input.files.length > 0) {
      const currentFileName = input.files[0].name;
      
      // Trigger the synchronous confirm dialog
      const proceed = window.confirm(
        `You have already staged "${currentFileName}". Selecting a new file will overwrite it. Do you want to continue?`
      );

      // If the user clicks 'Cancel' (No), abort the operation completely
      if (!proceed) {
        e.preventDefault(); // Blocks the browser file picker window from opening
        return;
      }
    }
    
    // If no file was selected (or they clicked 'OK'), code drops through 
    // and the file picker opens normally.
  };

  return (
    <div className="bg-white px-1 py-2 rounded-xl space-y-2">
      
      {/* Primary Section Header Card layout block */}
      <div className="flex flex-row border-b border-slate-100 pb-0">
        <h2 className="text-lg font-bold text-slate-900 text-indigo-600">
          Configure
        </h2>
        <InfoTooltip 
          content="Upload your custom target dataset with the first column containing the text to embed (suggested maximum limit = 50,000 examples). Configure the number of target classes and name them" 
          side="right"
        />
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
              ref={fileInputRef}
              onChange={handleCSVUpload}
              onClick={handleInputClick}
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