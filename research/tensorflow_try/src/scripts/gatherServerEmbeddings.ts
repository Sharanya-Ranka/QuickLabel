// src/scripts/gatherServerEmbeddings.ts
import React from 'react';
import type { DataRow, EmbeddingStatus } from '../pages/MainPagev3'; // Adjust relative import based on exact folder layout

interface StreamProgress {
  progress: number;
  total: number;
}

interface GatherEmbeddingsArgs {
  rows: DataRow[];
  fullDatasetRef: React.RefObject<DataRow[]>;
  setStreamProgress: React.Dispatch<React.SetStateAction<StreamProgress>>;
  embeddingStatus: EmbeddingStatus;
  setEmbeddingStatus: React.Dispatch<React.SetStateAction<EmbeddingStatus>>;
}

/**
 * Connects to the FastAPI backend, reads the Response Body stream,
 * parses SSE chunks, and updates the shared raw dataset array in-place.
 */
export async function gatherServerEmbeddings({
  rows,
  fullDatasetRef,
  setStreamProgress,
  embeddingStatus,
  setEmbeddingStatus
}: GatherEmbeddingsArgs): Promise<void> {
  try {
    const response = await fetch('http://localhost:3001/api/embed-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: rows.map(r => ({ id: r.id, text: r.text })) }),
    });

    if (!response.body) throw new Error('No readable response stream received.');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const content = line.replace('data: ', '').trim();

        if (content === '[DONE]') {
          setEmbeddingStatus("COMPLETE");
          continue;
        }

        const payload = JSON.parse(content);
        setStreamProgress({ progress: payload.progress, total: payload.total });

        // Mutate the reference in place without triggering a re-render cascade
        const incomingMap = new Map<string, number[]>(payload.results.map((r: any) => [r.id, r.embedding]));
        fullDatasetRef.current.forEach(row => {
          if (incomingMap.has(row.id)) {
            row.embedding = incomingMap.get(row.id);
          }
        });
      }
    }
  } catch (err) {
    console.error("Embedding server stream error:", err);
    setEmbeddingStatus("COMPLETE");
  }
}