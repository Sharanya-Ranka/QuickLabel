import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { gatherServerEmbeddings } from "../scripts/gatherServerEmbeddings";
import FileUploadStatus from "../components/FileUploadStatus";
import ConfigurationSelector from "../components/ConfigurationSelector";
import ColdStart from "../components/ColdStart";
import ActiveLearning from "../components/ActiveLearning";
import UserLabeledData from "../components/UserLabeledData";
import DownloadDatasetButton from "../components/DownloadDatasetButton";
import PredictionViewer from "../components/PredictionViewer";
import ConfigurePanel from "../components/Configuration";
import SignInComponent from "../components/SignInComponent";
import DataRefDebugger from "../components/DebugDataset"
// Core Type Schemas
export type ClassLabel = string;
export type ClassLabelIndex = number;

export interface DataRow {
  id: string;
  text: string;
  embedding?: number[];
  userLabel?: ClassLabel; // TODO: To remove
  userLabelIndex?: ClassLabelIndex;
  isUserLabeled: boolean;
  predictedLabelIndex?: ClassLabelIndex;
  probabilities?: number[];
  marginUncertainty?: number;
}

type AppPhase = "CONFIG" | "COLD_START" | "ACTIVE_LEARNING";

export type EmbeddingStatus = "IDLE" | "EMBEDDING" | "COMPLETE";

export default function MainPage() {
  // 1. App Structural Phase States
  const [phase, setPhase] = useState<AppPhase>("CONFIG");
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus>("IDLE");
  const [streamProgress, setStreamProgress] = useState({
    progress: 0,
    total: 0,
  });

  // 2. Configuration Parameters State
  const [numClasses, setNumClasses] = useState<number>(2);
  const [classLabels, setClassLabels] = useState<ClassLabel[]>([
    "Positive",
    "Negative",
  ]);

  // 3. Dataset Management
  // Full raw array kept safely out of React re-renders to maintain peak frame rates
  const fullDatasetRef = useRef<DataRow[]>([]);
  // Only the items labeled by the user drive reactive UI modifications
  const [userLabeledDataset, setUserLabeledDataset] = useState<DataRow[]>([]);
  const [modelUpdateCount, setModelUpdateCount] = useState<number>(0);

  // Handle CSV Processing and Dynamic Streaming Ingestion
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // if(embeddingStatus === "EMBEDDING") {

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
        await gatherServerEmbeddings({
          rows: parsed,
          fullDatasetRef,
          embeddingStatus,
          setEmbeddingStatus,
          setStreamProgress,
        });
      },
    });
  };

  // Adjust classification tags layout
  const updateClassCount = (count: number) => {
    setNumClasses(count);
    const newLabels = Array.from(
      { length: count },
      (_, i) => classLabels[i] || `Class ${i + 1}`,
    );
    setClassLabels(newLabels);
  };

  const updateLabelName = (index: number, val: string) => {
    const updated = [...classLabels];
    updated[index] = val;
    setClassLabels(updated);
  };

  // Assign a class to a specific item
  const handleAssignLabel = (rowId: string, label_index: ClassLabelIndex) => {
    // 1. Locate and update target row inside our master data ref
    const targetRow = fullDatasetRef.current.find((r) => r.id === rowId);
    if (!targetRow) return;

    targetRow.userLabelIndex = label_index;
    targetRow.isUserLabeled = true;

    // 2. Synchronize userLabeledDataset to run training cycles downstream
    setUserLabeledDataset((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return [...filtered, targetRow];
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 px-8 pt-4 font-sans">
      {/* Header Block */}
      <div className="max-w-7xl mx-auto mb-8 border-b border-slate-200 pb-4">
        {/* Flex container to push title left and button right */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              QuickLabel
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Label a large dataset using few examples.
            </p>
          </div>
          
          {/* Your Sign In Button Component */}
          <SignInComponent />
        </div>
      </div>
      {/* <DataRefDebugger 
        datasetRef={fullDatasetRef}
      /> */}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* LEFT & RIGHT COLUMNS CONTROLLER ROW */}
        {/* <div className="lg:col-span-1 space-y-2"> */}
          {/* Top Panel: File Upload and Configuration Selector Side-by-Side */}
          <div className="grid grid-cols-1 gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <ConfigurePanel 
              classLabels={classLabels}
              embeddingStatus={embeddingStatus}
              handleCSVUpload={handleCSVUpload}
              phase={phase}
              numClasses={numClasses}
              updateClassCount={updateClassCount}
              updateLabelName={updateLabelName}
              streamProgress={streamProgress}
            />
            
          </div>

          {/* MAIN CENTER ELEMENT: COLD-START OR ACTIVE-LEARNING AREA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
            {phase === "CONFIG" && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-400 text-sm">
                  Upload a dataset to activate the Cold-Start phase.
                </p>
              </div>
            )}

            {phase === "COLD_START" && (
              <ColdStart
                fullDatasetRef={fullDatasetRef}
                userLabeledDataset={userLabeledDataset}
                classLabels={classLabels}
                setPhase={setPhase}
                handleAssignLabel={handleAssignLabel}
              />
            )}

            {phase === "ACTIVE_LEARNING" && 
            <ActiveLearning 
              fullDatasetRef={fullDatasetRef}
              userLabeledDataset={userLabeledDataset}
              classLabels={classLabels}
              modelUpdateCount={modelUpdateCount}
              setModelUpdateCount={setModelUpdateCount}
              setPhase={setPhase}
              handleAssignLabel={handleAssignLabel}
            />}
          </div>
        {/* </div> */}
        <div>
        <PredictionViewer 
          fullDatasetRef={fullDatasetRef}
          modelUpdateCount={modelUpdateCount}
          classLabels={classLabels}
        />
        </div>
        <div className="lg:col-span-3">
        {/* RIGHT COLUMN: CREATED DATASET / USER LABELED LIST VIEW */}
        <UserLabeledData
          userLabeledDataset={userLabeledDataset}
          classLabels={classLabels}
          handleAssignLabel={handleAssignLabel}
        />

        </div>
      </div>
    </div>
  );
}
