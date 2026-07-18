import { TrainAndGatherUncertain } from '../scripts/trainAndGatherUncertain';
import type { Datapoint } from '../scripts/trainAndGatherUncertain';
import React, { useState, useEffect } from "react";
import type { DataRow } from "../types";
import { PredictionItem } from './PredictionItem';
import { InfoTooltip } from "./InfoTooltip";

interface ActiveLearningProps {
  fullDatasetRef: React.RefObject<DataRow[] | null>;
  userLabeledDataset: DataRow[];
  classLabels: string[];
  modelUpdateCount: number;
  setModelUpdateCount:  React.Dispatch<
    React.SetStateAction<number>
  >;
  handleAssignLabel: (rowId: string, label_index: number) => void;
}

const NUM_UNCERTAIN = 1; // Presenting 5 highly uncertain items per loop iteration

export default function ActiveLearning({ 
  fullDatasetRef, 
  userLabeledDataset, 
  classLabels, 
  modelUpdateCount,
  setModelUpdateCount,
  handleAssignLabel 
}: ActiveLearningProps) {
  
  const [isTraining, setIsTraining] = useState<boolean>(false);
  
  // Track the specific subset of row IDs targeted for user inspection during the active round
  const [activeQueue, setActiveQueue] = useState<DataRow[]>([]);
  const [lenFullDataset, setLengthFullDataset] = useState<number>(0);
  const [updateModel, setUpdateModel] = useState<boolean>(true);

  const handleItemLabeled = (rowId: string, labelIndex: number) => {
    handleAssignLabel(rowId, labelIndex);
    setActiveQueue(prev => prev.filter(row => row.id !== rowId));

    // the above setActiveQueue will change the state AFTER this, so we need to check if the length is 1 not 0
    if (activeQueue.length <= 1) {
      setUpdateModel(true);
    }
  };

  // Run training whenever the loop iteration counter advances
  useEffect(() => {
    console.log(`Active Learning Loop Iteration: ${modelUpdateCount + 1}`);
    
    async function runActiveLearningIteration() {
      setIsTraining(true);
      try {
        setLengthFullDataset(fullDatasetRef.current!.length);
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
        setModelUpdateCount(prev => prev + 1)

      } catch (err) {
        console.error("Error executing active learning iteration math:", err);
      } finally {
        setIsTraining(false);
        setUpdateModel(false);
      }
    }
    if(updateModel === true){
      runActiveLearningIteration();
    }
  }, [updateModel]);
  
  const currentActiveItem : DataRow|null = activeQueue.length > 0 ? activeQueue[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <div className="flex flex-row">
          <h2 className="text-md font-bold text-slate-900 text-indigo-600">
            Active Learning 
          </h2>
          <InfoTooltip
            content="Provide a label for each prompted example to teach the model how to classify uncertain items"
            side='right'
          />

          </div>

          {/* <p className="text-xs text-slate-400 mt-0.5">
            {modelUpdateCount >= 5 ? "Complete" : `Iteration ${modelUpdateCount + 1} of 5`}
          </p> */}
          <p className="text-xs text-slate-400 mt-0.5">
          Labeled {userLabeledDataset.length}/{lenFullDataset} ({userLabeledDataset.length*100/lenFullDataset}%)
          </p>
        </div>
      </div>

      {isTraining ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-lg space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Re-training Classifier and updating model weights...</p>
        </div>
      ) : currentActiveItem ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold  tracking-wider text-slate-400">
            {/* <span>High Uncertainty Target</span>
            <span className="text-indigo-600 font-mono">Remaining this round: {activeQueue.length}</span> */}
            <span>Please label the following item</span>
          </div>

          <PredictionItem 
            key={currentActiveItem.id} 
            text={currentActiveItem.text} 
            probabilities={currentActiveItem.probabilities || []} 
            classLabels={classLabels} 
          />

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