import React, { useEffect, useState } from "react";
import type { DataRow } from "../types";

interface ColdStartFromRandomItemsProps {
  fullDatasetRef: React.RefObject<DataRow[]>;
  classLabels: string[];
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

export default function ColdStartFromRandomItems({
  fullDatasetRef,
  classLabels,
  handleAssignLabel,
}: ColdStartFromRandomItemsProps) {
  const [numItemsLabeled, setNumItemsLabeled] = useState<number>(0);

  const [activeRandomItem, setActiveRandomItem] = useState<DataRow | null>(null);

  useEffect(() => {
    const unlabeledItems = fullDatasetRef.current?.filter(
        (item) => item.isUserLabeled === false,
      ) || [];

    if (unlabeledItems.length > 0) {
      const newRandomItemIndex = Math.floor(Math.random() * unlabeledItems.length);
      setActiveRandomItem(fullDatasetRef.current?.[newRandomItemIndex] || null);
    } else {
      setActiveRandomItem(null);
    }
  }, [numItemsLabeled]);

  const handleChoiceMade = (data_id: string, label_index: number) => {
    handleAssignLabel(data_id, label_index);
    setNumItemsLabeled((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {activeRandomItem ? (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-sm text-slate-700 leading-relaxed font-mono">
            {activeRandomItem.text}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {classLabels.map((label, label_index) => (
              <button
                key={label}
                onClick={() => handleChoiceMade(activeRandomItem.id, label_index)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          All available baseline rows processed.
        </p>
      )}
    </div>
  );
}
