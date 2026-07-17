
interface ConfigurationSelectorProps {
    numClasses: number;
    classLabels: string[];
    updateClassCount: (newCount: number) => void;
    updateLabelName: (index: number, newName: string) => void;
    phase: 'CONFIG' | 'UPLOAD' | 'EMBEDDING' | 'COLD_START' | 'ACTIVE_LEARNING' | 'DASHBOARD';
}

export default function ConfigurationSelector({
    numClasses,
    classLabels,
    updateClassCount,
    updateLabelName,
    phase
}: ConfigurationSelectorProps) {
  return (
    <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Configuration Selector</label>
        <div className="space-y-3">
        <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Classes:</span>
            <input 
            type="number" 
            min="2" 
            max="10"
            value={numClasses}
            onChange={(e) => updateClassCount(parseInt(e.target.value) || 2)}
            disabled={phase !== 'CONFIG'}
            className="w-16 px-2 py-1 border border-slate-300 rounded text-sm disabled:bg-slate-50"
            />
        </div>
        <div className="flex flex-wrap gap-2">
            {classLabels.map((label, idx) => (
            <input
                key={idx}
                type="text"
                value={label}
                onChange={(e) => updateLabelName(idx, e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-xs w-24 bg-slate-50 focus:bg-white"
            />
            ))}
        </div>
        </div>
    </div>
  );
}
