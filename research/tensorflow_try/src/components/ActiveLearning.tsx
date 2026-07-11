import { TrainAndGatherUncertain } from '../scripts/trainAndGatherUncertain';
import type { Datapoint } from '../scripts/trainAndGatherUncertain';
import React, { useState, useEffect } from "react";
import type { DataRow } from "../pages/MainPagev3";

interface ActiveLearningProps {
  fullDatasetRef: React.RefObject<DataRow[] | null>;
  userLabeledDataset: DataRow[];
  classLabels: string[];
  setPhase: React.Dispatch<
    React.SetStateAction<"CONFIG" | "COLD_START" | "ACTIVE_LEARNING">
  >;
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

const NUM_UNCERTAIN = 5; // Presenting 5 highly uncertain items per loop iteration

export default function ActiveLearning({ 
  fullDatasetRef, 
  userLabeledDataset, 
  classLabels, 
  setPhase, 
  handleAssignLabel 
}: ActiveLearningProps) {
  
  const [loopCount, setLoopCount] = useState<number>(0);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  
  // Track the specific subset of row IDs targeted for user inspection during the active round
  const [activeQueue, setActiveQueue] = useState<DataRow[]>([]);

  const handleItemLabeled = (rowId: string, labelIndex: number) => {
    handleAssignLabel(rowId, labelIndex);
    setActiveQueue(prev => prev.filter(row => row.id !== rowId));

    if (activeQueue.length === 1) {
      setLoopCount(prev => prev + 1);
    }
  };

  // Run training whenever the loop iteration counter advances
  useEffect(() => {
    console.log(`Active Learning Loop Iteration: ${loopCount + 1}`);
    if (loopCount >= 5) return; // Loop budget exhausted
    
    async function runActiveLearningIteration() {
      setIsTraining(true);
      try {
        const dataset = fullDatasetRef.current || [];
        
        // 1. Map to Datapoint schema matching the training wrapper interface requirements
        const trainData: Datapoint[] = userLabeledDataset.map(row => ({
          id: row.id,
          features: row.embedding || new Array(384).fill(0),
          label: row.userLabelIndex
        }));

        const testData: Datapoint[] = dataset.map(row => ({
          id: row.id,
          features: row.embedding || new Array(384).fill(0)
        }));

        // 2. Train and gather predictions
        const output = await TrainAndGatherUncertain({ trainData, testData, numClasses: classLabels.length });
        
        // 3. Mutate predictions back into the ref array matching by individual ID tokens
        const predictionMap = new Map(
          output.predictions.map(p => [p.id, p])
        );

        dataset.forEach(row => {
          const match = predictionMap.get(row.id);
          if (match) {
            row.predictedLabelIndex = match.label;
            row.probabilities = match.probabilities;
            row.marginUncertainty = match.margin;
          }
        });

        // 4. Capture the top N overall most uncertain items for user display
        const targetIds = output.predictions.slice(0, NUM_UNCERTAIN).map(p => p.id);
        const activeQueue = dataset.filter(row => targetIds.includes(row.id));
        setActiveQueue(activeQueue);

      } catch (err) {
        console.error("Error executing active learning iteration math:", err);
      } finally {
        setIsTraining(false);
      }
    }

    runActiveLearningIteration();
  }, [loopCount]);
  
  const currentActiveItem : DataRow|null = activeQueue.length > 0 ? activeQueue[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-md font-bold text-slate-900 text-indigo-600">
            Active Learning Execution Loop
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Loop Status: {loopCount >= 5 ? "Complete" : `Iteration ${loopCount + 1} of 5`}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          loopCount >= 5 ? "bg-green-50 text-green-700" : "bg-indigo-50 text-indigo-700"
        }`}>
          {loopCount >= 5 ? "Pipeline Fully Seeded" : "Active Selection Active"}
        </span>
      </div>

      {isTraining ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-lg space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Re-training Classifier and updating model weights...</p>
        </div>
      ) : loopCount >= 5 ? (
        <div className="p-6 text-center bg-green-50/50 border border-green-100 rounded-xl space-y-3">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900">5-Round Optimization Phase Concluded</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Model parameters have stabilized with optimized margin updates. You can now reset settings or return to setup configurations.
          </p>
          <button 
            onClick={() => setPhase('CONFIG')}
            className="mt-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg text-xs shadow-xs"
          >
            Return to Setup Configuration
          </button>
        </div>
      ) : currentActiveItem ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>High Uncertainty Target</span>
            <span className="text-indigo-600 font-mono">Remaining this round: {activeQueue.length}</span>
          </div>

          <div className="p-5 bg-slate-900 text-slate-100 rounded-xl font-mono text-sm leading-relaxed shadow-inner border border-slate-800 min-h-[80px]">
            {currentActiveItem.text}
          </div>

          {/* Model Model Metrics Output */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider">Model's Predicted Label:</span>
              <span className="font-bold text-indigo-600">
                {currentActiveItem.predictedLabelIndex !== undefined 
                  ? classLabels[currentActiveItem.predictedLabelIndex] 
                  : 'None'}
              </span>
            </div>
            
            <div className="space-y-2 pt-1">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Class Probability Densities:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classLabels.map((label, index) => {
                  const prob = currentActiveItem.probabilities?.[index] || 0;
                  const pct = Math.round(prob * 100);
                  const isPredicted = currentActiveItem.predictedLabelIndex === index;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={`truncate ${isPredicted ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                          {label} {isPredicted && '🎯'}
                        </span>
                        <span className="font-mono text-slate-500">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isPredicted ? 'bg-indigo-600' : 'bg-slate-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-500">Assign correct class alignment:</span>
            <div className="flex flex-wrap gap-2">
              {classLabels.map((label, index) => (
                <button
                  key={index}
                  onClick={() => {handleItemLabeled(currentActiveItem.id, index)}}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-xs hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic text-center py-6">Calculating next optimal data queue...</p>
      )}
    </div>
  );
}