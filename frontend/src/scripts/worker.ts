// worker.ts
import { pipeline, env } from '@huggingface/transformers';

// Disable local models to fetch from HuggingFace CDN
env.allowLocalModels = false; 

let extractor: any = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'INITIALIZE') {
    extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2', {
        device: 'webgpu', // Hands processing to local hardware assets
        dtype: 'fp32',    // WebGPU optimizes best with standard floating dimensions 
        // dtype: 'fp16',
        });
    self.postMessage({ type: 'READY' });
  }

    // Global Configuration
    const BATCH_SIZE = 1024; // Adjust based on memory availability

    // Inside your self.onmessage listener...
    if (type === 'EMBED_BATCH') {
    const { rows } = payload;
    const total = rows.length;
    
    // Iterate through the rows array in increments of BATCH_SIZE
    for (let i = 0; i < total; i += BATCH_SIZE) {
        // 1. Slice out the current batch of rows
        const batchRows = rows.slice(i, i + BATCH_SIZE);
        
        // 2. Extract just the raw text strings for the pipeline
        const batchTexts = batchRows.map((row: any) => row.text);
        
        // 3. Pass the entire text array to the model at once for batched inference
        const output = await extractor(batchTexts, { pooling: 'mean', normalize: true });
        
        // 4. Extract individual embeddings from the single output tensor.
        // In @huggingface/transformers, a batched output returns a 2D layout: [batchSize, featureDim]
        const embeddingsArray = output.tolist(); 
        
        // 5. Map the results back to their respective row IDs and emit progress
        const completedCount = Math.min(i + BATCH_SIZE, total);
        
        self.postMessage({
        type: 'EMBED_BATCH_PROGRESS',
        payload: {
            // Return an array of objects so the main thread can update multiple rows in one React render
            results: batchRows.map((row:any, index:number) => (
                {
                    id: row.id,
                    embedding: embeddingsArray[index]
                }
            )),
            progress: completedCount,
            total: total
        }
        });
    }
    
    // 6. Signal that the entire dataset is finalized
    self.postMessage({ type: 'EMBED_COMPLETE' });
    }
};