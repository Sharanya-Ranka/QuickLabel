import React, { useEffect, useState } from "react";
import type { DataRow } from "../pages/MainPagev3";

interface ColdStartFromUserItemsProps {
  fullDatasetRef: React.RefObject<DataRow[]>;
  userLabeledDataset: DataRow[];
  classLabels: string[];
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

export default function ColdStartFromUserItems({
  fullDatasetRef,
  userLabeledDataset,
  classLabels,
  handleAssignLabel,
}: ColdStartFromUserItemsProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
    const [filteredSearchItems, setFilteredSearchItems] = useState<DataRow[]>([]);
    const [numItemsLabeled, setNumItemsLabeled] = useState<number>(0);

  useEffect(() => {
      const filteredSearchItems = fullDatasetRef.current?.filter((row) => row.text.toLowerCase().includes(searchQuery.toLowerCase()) && !row.isUserLabeled) || [];
      setFilteredSearchItems(filteredSearchItems.slice(0, 5));
  }, [searchQuery, numItemsLabeled]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search dataset rows to explicitly seed categories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
      />

      <div className="space-y-2">
        {filteredSearchItems.map((row) => (
          <div
            key={row.id}
            className="p-3 bg-slate-50 rounded border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <span className="text-xs font-mono text-slate-700 max-w-md truncate">
              {row.text}
            </span>
            <div className="flex gap-1.5">
              {classLabels.map((label, label_index) => (
                <button
                  key={label}
                  onClick={() => {
                    handleAssignLabel(row.id, label_index);
                    setNumItemsLabeled((prev) => prev + 1);
                    // setSearchQuery("");
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 text-[11px] rounded font-medium hover:border-indigo-500"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
