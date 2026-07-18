import type {EmbeddingStatus} from "../types";

interface FileUploadProps{
  phase: string;
  handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  embeddingStatus: EmbeddingStatus;
  streamProgress: { progress: number; total: number };
}

export default function FileUploadStatus({
  phase,
  handleCSVUpload,
  embeddingStatus,
  streamProgress,
}: FileUploadProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Dataset Ingestion (CSV)
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={handleCSVUpload}
        disabled={phase !== "CONFIG"}
        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
      />
      {embeddingStatus !== "IDLE" && (
        <div className="mt-3 space-y-1">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{
                width: `${(streamProgress.progress / streamProgress.total) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-slate-400">
            Server streaming embeddings: {streamProgress.progress}/
            {streamProgress.total}
          </span>
        </div>
      )}
    </div>
  );
}
