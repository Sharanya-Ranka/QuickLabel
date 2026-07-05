import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DataRow } from '../pages/MainPagev3';

interface DownloadDatasetButtonProps {
  fullDatasetRef: React.RefObject<DataRow[] | null>;
  classLabels: string[];
}

export default function DownloadDatasetButton({ fullDatasetRef, classLabels }: DownloadDatasetButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    const dataset = fullDatasetRef.current || [];
    if (dataset.length === 0) {
      alert("No data available to export yet. Please upload a dataset first.");
      return;
    }

    setIsExporting(true);

    try {
      // 1. Initialize Workbook instance
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'QuickLabel Active Learning';
      workbook.created = new Date();

      // ==========================================
      // SHEET 1: CLASSIFICATION PERFORMANCE METRICS
      // ==========================================
      const sheet1 = workbook.addWorksheet('Predictions & Labels');

      // Define static base headers
      const s1BaseHeaders = [
        { header: 'Text Content', key: 'text', width: 50 },
        { header: 'Predicted Class', key: 'predicted_class', width: 20 },
        { header: 'User Label', key: 'user_label', width: 20 },
      ];

      // Dynamically append probability headers for each active class label
      const s1ProbHeaders = classLabels.map((label, idx) => ({
        header: `Prob: ${label}`,
        key: `prob_class_${idx}`,
        width: 15
      }));

      // Append trailing evaluation margin
      const s1Headers = [
        ...s1BaseHeaders,
        ...s1ProbHeaders,
        { header: 'Uncertainty Margin', key: 'margin', width: 20 }
      ];

      sheet1.columns = s1Headers;

      // Populate Sheet 1 row items
      dataset.forEach(row => {
        const rowData: Record<string, any> = {
          text: row.text,
          predicted_class: row.predictedLabelIndex !== undefined ? classLabels[row.predictedLabelIndex] : 'N/A',
          user_label: row.userLabelIndex !== undefined ? classLabels[row.userLabelIndex] : 'Unlabeled',
          margin: row.marginUncertainty !== undefined ? row.marginUncertainty : 'N/A'
        };

        // Inject probability spreads matching specific keys
        classLabels.forEach((_, idx) => {
          if (row.probabilities && row.probabilities[idx] !== undefined) {
            rowData[`prob_class_${idx}`] = row.probabilities[idx];
          } else {
            rowData[`prob_class_${idx}`] = 'N/A';
          }
        });

        sheet1.addRow(rowData);
      });

      // Style Sheet 1 header layout for clean reading layout appearance
      sheet1.getRow(1).font = { bold: true };

      // ==========================================
      // SHEET 2: STRUCTURAL VECTOR EMBEDDINGS
      // ==========================================
      const sheet2 = workbook.addWorksheet('Vector Embeddings');

      sheet2.columns = [
        { header: 'Text Content', key: 'text', width: 60 },
        { header: 'Embedding Array Layout', key: 'embedding', width: 80 }
      ];

      // Populate Sheet 2 row items
      dataset.forEach(row => {
        let embeddingString = 'N/A';
        
        if (row.embedding && Array.isArray(row.embedding)) {
          // Format as a standard brackets enclosed clean coordinate comma string: [0.123, -0.456, ...]
          embeddingString = `[${row.embedding.join(', ')}]`;
        }

        sheet2.addRow({
          text: row.text,
          embedding: embeddingString
        });
      });

      sheet2.getRow(1).font = { bold: true };

      // ==========================================
      // FILE COMPRESSION AND GENERATION DOWNLOAD
      // ==========================================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `QuickLabel_Export_${timestamp}.xlsx`);

    } catch (err) {
      console.error("Failed to compile or generate Excel workbook download artifact:", err);
      alert("An error occurred during export processing framework parsing loop workflows.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportExcel}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400"
    >
      {isExporting ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Compiling Sheets...
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Dataset (.xlsx)
        </>
      )}
    </button>
  );
}