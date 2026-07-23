// src/scripts/gatherServerEmbeddings.ts
import React from "react";
import type { DataRow, EmbeddingStatus } from "../types"; // Adjust relative import based on exact folder layout
import { MODAL_BASEURL } from "../constants";
import { fetchAuthSession } from "aws-amplify/auth";
import type { EmbeddingRequest } from "../types";

interface StreamProgress {
  progress: number;
  total: number;
}

interface GatherEmbeddingsArgs {
  rows: DataRow[];
  fullDatasetRef: React.RefObject<DataRow[]>;
  setStreamProgress: React.Dispatch<React.SetStateAction<StreamProgress>>;
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
  setEmbeddingStatus,
}: GatherEmbeddingsArgs): Promise<void> {
  try {
    // 1. Grab fresh Cognito tokens using your existing client logic
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString() || "";
    // console.log("idToken", idToken)

    if (!(idToken.trim())){
      alert(`Authentication Failure: Please sign in.`);
      throw new Error(`Embedding Request failed due to no Authentication`);
    }

    const embeddingRequest: EmbeddingRequest = {
      items: { items: rows.map((r) => ({ id: r.id, text: r.text })) },
      items_info: { num_items: rows.length },
    };

    const response = await fetch(`${MODAL_BASEURL}/api/embed-stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(embeddingRequest),
    });

    // 1. Check if the HTTP status code is outside the 200-299 range
    if (!response.ok) {
      let errorMessage = "An unknown error occurred while processing embeddings.";
      
      try {
        // Attempt to parse the standard JSON error structure from FastAPI/Server
        const errorData = await response.json();
        
        // Handle FastAPI validation array or standard message fields
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch {
        // Fallback if the response isn't valid JSON (e.g., a gateway timeout or crash)
        errorMessage = `Server responded with status: ${response.status} ${response.statusText}`;
      }

      // 2. Dispatch relevant UI alerts based on HTTP Status Codes
      if (response.status === 401 || response.status === 403) {
        alert(`Authentication Failure: Your session might have expired. Please sign in again.`);
      } else if (response.status === 422) {
        alert(`Data Validation Error (422):\n${errorMessage}\nPlease check the structure of your payload.`);
      } else if (response.status === 429) {
        alert(`Quota Exceeded:\n${errorMessage}`);
      } else if (response.status >= 500) {
        alert(`Backend Server Error (${response.status}):\n${errorMessage}\nThe server might be overloaded or down.`);
      } else {
        alert(`Request Rejected (${response.status}):\n${errorMessage}`);
      }

      // Stop execution immediately so we don't proceed to the stream reader
      throw new Error(`Embedding Request failed with status ${response.status}: ${errorMessage}`);
    }

    if (!response.body)
      throw new Error("No readable response stream received.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    setStreamProgress((prev) => ({ ...prev, total: rows.length }));

    const overallStart = performance.now();

    const metrics = {
      networkWait: 0,
      decoding: 0,
      stringSplitting: 0,
      jsonParsing: 0,
      mapCreation: 0,
      datasetUpdate: 0,
      chunksProcessed: 0,
      totalItemsHandled: 0,
    };

    while (true) {
      const tReadStart = performance.now();
      const { value, done } = await reader.read();
      metrics.networkWait += performance.now() - tReadStart;
      // console.log("Reading", value, done)
      if (done) break;

      const tDecodeStart = performance.now();
      buffer += decoder.decode(value, { stream: true });
      metrics.decoding += performance.now() - tDecodeStart;
      // console.log(JSON.stringify(buffer))
      const tSplitStart = performance.now();
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      console.log("buffer updated");
      metrics.stringSplitting += performance.now() - tSplitStart;

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const content = line.replace("data: ", "").trim();

        const tParseStart = performance.now();
        const payload = JSON.parse(content);
        metrics.jsonParsing += performance.now() - tParseStart;
        
        const resultsCount = payload.results.length;
        console.log(resultsCount);
        metrics.totalItemsHandled += resultsCount;
        metrics.chunksProcessed++;

        setStreamProgress((prev) => ({
          ...prev,
          progress: prev.progress + payload.results.length,
        }));

        // Mutate the reference in place without triggering a re-render cascade
        const tMapStart = performance.now();
        const incomingMap = new Map<string, number[]>(
          payload.results.map((r: any) => [r.id, r.embedding]),
        );
        metrics.mapCreation += performance.now() - tMapStart;

        const tUpdateStart = performance.now();
        fullDatasetRef.current.forEach((row) => {
          if (incomingMap.has(row.id)) {
            row.embedding = incomingMap.get(row.id);
          }
        });
        metrics.datasetUpdate += performance.now() - tUpdateStart;

      }
    }

    const totalTime = performance.now() - overallStart;
    console.log("Total time to retrieve embeddings=", totalTime)

    // console.table({
    //   "Total Execution Time (ms)": totalTime.toFixed(2),
    //   "Network Stream Waiting (ms)": metrics.networkWait.toFixed(2),
    //   "Text Decoding (ms)": metrics.decoding.toFixed(2),
    //   "String Splitting (ms)": metrics.stringSplitting.toFixed(2),
    //   "JSON Parsing (ms)": metrics.jsonParsing.toFixed(2),
    //   "Map Creation (ms)": metrics.mapCreation.toFixed(2),
    //   "Dataset Updates (ms)": metrics.datasetUpdate.toFixed(2),
    //   "Chunks Processed": metrics.chunksProcessed,
    //   "Total Items Handled": metrics.totalItemsHandled,
    // });
  } catch (err) {
    console.error("Embedding server stream error:", err);
    setEmbeddingStatus("IDLE");
    throw err;
  }
}
