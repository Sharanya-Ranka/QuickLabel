// types.ts

export type ClassLabel = string;

export interface DataRow {
  id: string; // Unique identifier (e.g., row index or UUID)
  text: string; // The raw text to embed
  embedding?: number[]; // Populated by Web Worker
  
  // Labeling State
  userLabel?: ClassLabel; // Null if not yet labeled by user
  isUserLabeled: boolean;
  
  // Model Predictions (Updated every round)
  predictedClass?: ClassLabel;
  predictionProbabilities?: Record<ClassLabel, number>;
  marginUncertainty?: number; // Lower is more uncertain
}

export interface AppState {
  status: 'UPLOAD' | 'EMBEDDING' | 'COLD_START' | 'ACTIVE_LEARNING' | 'DASHBOARD';
  config: {
    textColumn: string;
    classes: ClassLabel[];
    numUncertain: number;
    hybridRandomRatio: number;
  };
  dataset: DataRow[];
  currentBatch: string[]; // Array of row IDs for the current labeling round
}