import React, { useMemo, useState } from "react";
import type { DataRow } from "../types";
import ColdStartFromRandomItems from "./ColdStartFromRandomItems";
import ColdStartFromUserItems from "./ColdStartFromUserItems";
import { InfoTooltip } from "./InfoTooltip";

interface ColdStartProps {
  fullDatasetRef: React.RefObject<DataRow[]>;
  userLabeledDataset: DataRow[];
  classLabels: string[];
  setPhase: React.Dispatch<
    React.SetStateAction<"CONFIG" | "COLD_START" | "ACTIVE_LEARNING">
  >;
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

export default function ColdStart({
  fullDatasetRef,
  userLabeledDataset,
  classLabels,
  setPhase,
  handleAssignLabel,
}: ColdStartProps) {
  const [coldStartMode, setColdStartMode] = useState<"RANDOM" | "SEARCH">(
    "RANDOM",
  );
  const isColdStartComplete = useMemo(() => {
    // 1. Create a Set of all unique label indices assigned by the user
    const userLabelIndicesSet = new Set(
      userLabeledDataset.map((row) => row.userLabelIndex),
    );

    // 2. Compare it to the indices of classLabels (0 to n-1)
    // .every() checks if every array index coordinate exists inside our Set
    return classLabels.every((_, index) => userLabelIndicesSet.has(index));
  }, [userLabeledDataset, classLabels]);

  //   const [activeRandomItem, setActiveRandomItem] = useState<DataRow | null>(
  //     null,
  //   );
  //   const [searchQuery, setSearchQuery] = useState("");
  //   const [userLabelledDataset, setUserLabelledDataset] = useState<
  //     { id: string; userLabel: string }[]
  //   >([]);

  return (
    <div>
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <h2 className="text-md font-bold text-slate-900">
          Cold-Start
        </h2>
        <InfoTooltip 
          content="Seed the model with data before we start Active Learning. Provide atleast 1 example per class. You may label items randomly 'Random Items', or search for them in 'User Search'" 
          side="right"
        />
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setColdStartMode("RANDOM")}
            className={`px-3 py-1.5 rounded-md transition-colors ${coldStartMode === "RANDOM" ? "bg-white shadow-xs text-indigo-600" : "text-slate-500"}`}
          >
            Random Items
          </button>
          <button
            onClick={() => setColdStartMode("SEARCH")}
            className={`px-3 py-1.5 rounded-md transition-colors ${coldStartMode === "SEARCH" ? "bg-white shadow-xs text-indigo-600" : "text-slate-500"}`}
          >
            User Search
          </button>
        </div>
      </div>

      {coldStartMode === "RANDOM" ? (
        /* ColdStartFromRandomItems Workspace */
        <ColdStartFromRandomItems
          fullDatasetRef={fullDatasetRef}
          handleAssignLabel={handleAssignLabel}
          
          classLabels={classLabels}
        />
      ) : (
        /* ColdStartFromUserItems Workspace */
        <ColdStartFromUserItems
          fullDatasetRef={fullDatasetRef}
          
          classLabels={classLabels}
          handleAssignLabel={handleAssignLabel}
        />
      )}

      {/* Transition Unlock Validation Check */}
      <div className="mt-6 gap-3 border-t border-slate-100 flex flex-col items-center justify-between">
        <div className="flex gap-2 text-xs">
          {classLabels.map((label) => {
            const count = userLabeledDataset.filter(
              (r) => classLabels[r.userLabelIndex!] === label,
            ).length;
            return (
              <span
                key={label}
                className={`px-2 py-1 rounded font-medium ${count > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
              >
                {label}: {count}
              </span>
            );
          })}
        </div>

        <button
          disabled={!isColdStartComplete}
          onClick={() => setPhase("ACTIVE_LEARNING")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        >
          Activate Active Learning Loop
        </button>
      </div>
    </div>
  );
}
