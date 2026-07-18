import * as tf from '@tensorflow/tfjs';

export interface Datapoint {
  features: number[]; // Shape: [numExamples, 384]
  label?: number;     // Shape: [numExamples], values from 0 to 4
  id: string;        // Shape: [numExamples], unique identifiers for each example
}


export interface TrainAndGatherUncertainProps {
  trainData: Datapoint[];
  testData: Datapoint[];
  numClasses?: number; // Optional parameter to specify the number of classes
}

interface TrainingOutput {
  predictions: { label: number; probabilities: number[]; id: string, margin: number}[];
}


export async function TrainAndGatherUncertain({ trainData, testData, numClasses }: TrainAndGatherUncertainProps): Promise<TrainingOutput> {
  const INPUT_DIM = 384;
  const NUM_CLASSES = numClasses || 5;
  
  // 1. Define the Logistic Regression Architecture
  // Logistic Regression = No hidden layers + Single Dense Layer + Softmax Activation
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: NUM_CLASSES,
    inputShape: [INPUT_DIM],
    activation: 'softmax',
    kernelInitializer: 'glorotUniform'
  }));

  // 2. Compile with Adam Optimizer and Categorical Cross Entropy
  model.compile({
    optimizer: tf.train.adam(0.01), // Learning rate set to 0.01
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });



  // 3. Prepare Tensors
  // Features Shape: [numExamples, 384]
  const xs = tf.tensor2d(trainData.map(d => d.features), [trainData.length, INPUT_DIM]);
  
  // Convert integer labels to 1-Hot Tensors for Categorical Cross Entropy
  // Shape: [numExamples, 5]
  const ys = tf.oneHot(tf.tensor1d(trainData.map(d => d.label!), 'int32'), NUM_CLASSES);

  // 4. Compute Loss Balancing Multipliers
  const weightsMap = computeClassWeights(trainData.map(d => d.label!), NUM_CLASSES);
  console.log("Calculated Balance Multipliers:", weightsMap);

  // 5. Run the Training Loop
  console.log("Beginning optimization rounds...");
  await model.fit(xs, ys, {
    epochs: 10,
    batchSize: 32,
    shuffle: true,
    classWeight: weightsMap, // <--- Injects the loss balancing criteria here
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: Loss = ${logs?.loss.toFixed(4)}, Accuracy = ${logs?.acc.toFixed(4)}`);
      }
    }
  });

  // 6. Memory Cleanup
  // Always clean up tensors manually to prevent memory leaks in the WebGL/WASM backend
  xs.dispose();
  ys.dispose();

  // Features Shape: [numExamples, 384]
  const test_xs = tf.tensor2d(testData.map(d => d.features), [testData.length, INPUT_DIM]);

  const probs = model.predict(test_xs) as tf.Tensor2D; // Shape: [numExamples, numClasses]

  // 2. BATCHED TENSOR MATH: Extract Top-2 choices per row
  // tf.topk returns values and indices sorted descending along the last axis
  const { values: topValues, indices: topIndices } = tf.topk(probs, 2, true);

  // Split out the 1st highest and 2nd highest tensors
  // Shape of each: [numExamples, 1] -> slice columns 0 and 1
  const highestProbs = tf.slice(topValues, [0, 0], [-1, 1]);
  const secondHighestProbs = tf.slice(topValues, [0, 1], [-1, 1]);

  // Margin Calculation: (1st highest) - (2nd highest)
  const margins = tf.sub(highestProbs, secondHighestProbs).squeeze(); // Shape: [numExamples]

  // 3. Extract predicted labels (the index of the highest probability)
  const predictedLabelsTensor = tf.slice(topIndices, [0, 0], [-1, 1]).squeeze();

  // 4. Download processed data to JavaScript in unified parallel chunks
  const [rawProbs, rawLabels, rawMargins] = await Promise.all([
    probs.array() as Promise<number[][]>,
    predictedLabelsTensor.array() as Promise<number[]>,
    margins.array() as Promise<number[]>
  ]);

  // 5. Map records back to their structural layout references
  const processed = testData.map((d, i) => ({
    id: d.id,
    label: rawLabels[i],
    probabilities: rawProbs[i],
    margin: rawMargins[i]
  }));

  // 6. Sort and extract the top NUM_UNCERTAIN (Smallest margin = most uncertain)
  const sortedByUncertainty = [...processed].sort((a, b) => a.margin - b.margin);
//   const uncertainSubset = sortedByUncertainty.slice(0, NUM_UNCERTAIN);

  // 7. Strict Tensor Memory Cleanup Lifecycle
  tf.dispose([xs, probs, topValues, topIndices, highestProbs, secondHighestProbs, margins, predictedLabelsTensor]);

  return {
    predictions: sortedByUncertainty
  };
}


/**
 * Calculates balanced class weights to counteract dataset skew.
 * Formula: weight = total_samples / (num_classes * class_samples)
 */
function computeClassWeights(labels: number[], numClasses: number): Record<number, number> {
  const totalSamples = labels.length;
  const counts = new Array(numClasses).fill(0);
  
  // Count instances of each class
  labels.forEach(label => counts[label]++);
  
  const classWeights: Record<number, number> = {};
  counts.forEach((count, classIdx) => {
    // Prevent division by zero if a class has no examples yet
    classWeights[classIdx] = count > 0 
      ? totalSamples / (numClasses * count) 
      : 1.0;
  });
  
  return classWeights;
}


// // --- LOCAL EXECUTION SANDBOX BLOCK ---
// async function runTestScript() {
//   console.log("🚀 Initializing local test run for TrainAndGatherUncertain...");

//   // Helper generator to create synthetic datapoints populated with dummy dimensions
//   const generateMockData = (count: number, isLabeled: boolean): Datapoint[] => {
//     return Array.from({ length: count }, (_, i) => {
//       const features = Array.from({ length: 384 }, () => Math.random() - 0.5);
//       return {
//         id: `mock-uuid-${isLabeled ? 'train' : 'test'}-${i}`,
//         features,
//         label: isLabeled ? Math.floor(Math.random() * 5) : undefined
//       };
//     });
//   };

//   // Generate 50 labeled items to train on, and 30 items to test for uncertainty rankings
//   const mockTrain = generateMockData(100, true);
//   const mockTest = generateMockData(10000, false);

//   console.log(`Generated ${mockTrain.length} training items and ${mockTest.length} verification items.`);

//   console.time("⏱️ Pipeline Execution Total Time");
//   const result = await TrainAndGatherUncertain({ trainData: mockTrain, testData: mockTest });
//   console.timeEnd("⏱️ Pipeline Execution Total Time");

//   console.log("\n📦 Output Predictions (Sorted by highest uncertainty first):");
//   console.log(`Returned counts: ${result.predictions.length} items extracted.`);
  
//   // Log out the top 3 items to visually inspect structural attributes
//   result.predictions.slice(0, 3).forEach((pred, index) => {
//     console.log(`\n[Rank ${index + 1}] ID: ${pred.id}`);
//     console.log(` -> Predicted Category Label Index: ${pred.label}`);
//     console.log(` -> Margin Spread Delta: ${pred.margin.toFixed(4)} (Closer to 0 means more uncertain)`);
//     console.log(` -> Softmax Density Spectrum Array: [${pred.probabilities.map(p => p.toFixed(3)).join(', ')}]`);
//   });
// }

// // Trigger script execution
// // runTestScript().catch(err => console.error("❌ Isolated testing script collapsed:", err));