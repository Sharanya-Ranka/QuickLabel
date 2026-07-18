import React, { useMemo } from "react";

// =========================================================
// ATOMIC SUB-COMPONENT: ROW ENTRY VISUALIZER CARD
// =========================================================
interface PredictionItemProps {
  text: string;
  probabilities: number[];
  classLabels: string[];
}

export function PredictionItem({ text, probabilities, classLabels }: PredictionItemProps) {
  
  // Sort the probability densities descending before printing out layout pills
  const sortedProbabilities = useMemo(() => {
    return probabilities
      .map((prob, index) => ({
        label: classLabels[index] || `Class ${index}`,
        prob: prob,
        index: index
      }))
      .sort((a, b) => b.prob - a.prob);
  }, [probabilities, classLabels]);

  return (
    <div className="px-4 py-1 bg-slate-50 rounded-xl  hover:border-slate-300 transition-all space-y-0">
      {/* Data row text representation block */}
      <p className="text-sm font-mono text-slate-800 leading-relaxed font-medium line-clamp-3">
        {text}
      </p>

      {/* Sorted probability sequence layout stream */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {sortedProbabilities.map((item, idx) => {
          const isHighest = idx === 0;
          const percentage = Math.round(item.prob * 100);

          return (
            <React.Fragment key={item.index}>
              <span className={`inline-flex items-center ${
                isHighest 
                  ? 'font-bold text-indigo-600 bg-indigo-50/70 px-2 py-0.5 rounded-md' 
                  : 'text-slate-500 font-medium'
              }`}>
                {item.label} ({percentage}%)
              </span>
              {idx < sortedProbabilities.length - 1 && (
                <span className="text-slate-300 font-light text-[10px]">|</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}