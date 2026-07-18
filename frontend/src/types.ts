// types.ts
export type ClassLabel = string;
export type ClassLabelIndex = number;

export interface DataRow {
  id: string;
  text: string;
  embedding?: number[];
  userLabel?: ClassLabel; // TODO: To remove
  userLabelIndex?: ClassLabelIndex;
  isUserLabeled: boolean;
  predictedLabelIndex?: ClassLabelIndex;
  probabilities?: number[];
  marginUncertainty?: number;
}



export interface EmbeddingRequest {
  items: {items: {id:string, text: string}[]}
  items_info: {num_items: number}
}



export type AppPhase = "CONFIG" | "COLD_START" | "ACTIVE_LEARNING";

export type EmbeddingStatus = "IDLE" | "EMBEDDING" | "COMPLETE";