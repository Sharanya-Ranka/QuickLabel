import type { DataRow } from "../types";
import { InfoTooltip } from "./InfoTooltip";

interface UserLabeledDataProps {
  userLabeledDataset: DataRow[];
  classLabels: string[];
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

export default function UserLabeledData({
  userLabeledDataset,
  classLabels,
  handleAssignLabel,
}: UserLabeledDataProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
      <div className="flex flex-row border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
          User Labeled Dataset ({userLabeledDataset.length})
        </h2>
        <InfoTooltip
          content="View the data you've labeled. You may change example classes, and the predictions will reflect them from the next iteration."
          side='right'
        />
      </div>

      {userLabeledDataset.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          No user-labeled examples yet.
        </p>
      ) : (
        <div className="gap-x-3 flex flex-row flex-wrap gap-3 max-h-[400px] overflow-y-auto">
          {[...userLabeledDataset].reverse().map((row) => (
            <div
              key={row.id}
              className="flex flex-col justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 "
            >
              <p className="text-xs font-mono text-slate-700 line-clamp-2">
                {row.text}
              </p>
              <div className="flex items-center justify-between gap-x-3">
                <span className="text-[11px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  {classLabels[row.userLabelIndex!]}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
