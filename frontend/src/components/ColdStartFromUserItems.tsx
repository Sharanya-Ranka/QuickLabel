import React, { useEffect, useState } from "react";
import type { DataRow } from "../types";

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
      const filteredSearchItems = fullDatasetRef.current?.filter((row) => row.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];
      setFilteredSearchItems(filteredSearchItems.slice(0, 100));
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

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {filteredSearchItems.length <= 0 ? <div> No items match the search</div>:
        filteredSearchItems.map((row) => (
          <div
            key={row.id}
            className="p-1 bg-slate-50 rounded border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <span className="text-xs font-mono text-slate-700 max-w-md truncate">
              {row.text}
            </span>
            <select
                  value={row.userLabelIndex}
                  onChange={(e) => handleAssignLabel(row.id, parseInt(e.target.value))}
                  className="text-[11px] border border-slate-200 bg-white rounded px-1.5 py-0.5 font-medium text-slate-600"
                >
                  {classLabels.map((l, index) => (
                    <option key={l} value={index}>
                      {l}
                    </option>
                  ))}
                </select>
          </div>
        ))}
      </div>
    </div>
  );
}
