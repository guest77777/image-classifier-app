'use client';

import React, { createContext, useContext, useState } from 'react';
import { apiClient } from '@/utils/api-client';

interface OCRContextType {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  processFiles: (files: File[]) => Promise<void>;
  reset: () => void;
}

const OCRContext = createContext<OCRContextType | undefined>(undefined);

export function OCRProvider({ children }: { children: React.ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const total = files.length;
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await apiClient.processImage(file);
          results.push(result);
          setProgress(((i + 1) / total) * 100);
        } catch (error) {
          console.error(`ファイル ${file.name} の処理中にエラーが発生:`, error);
          throw error;
        }
      }

      return results;
    } catch (error) {
      setError(error instanceof Error ? error.message : '処理中にエラーが発生しました');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setIsProcessing(false);
    setProgress(0);
    setError(null);
  };

  return (
    <OCRContext.Provider
      value={{
        isProcessing,
        progress,
        error,
        processFiles,
        reset
      }}
    >
      {children}
    </OCRContext.Provider>
  );
}

export function useOCR() {
  const context = useContext(OCRContext);
  if (context === undefined) {
    throw new Error('useOCR must be used within an OCRProvider');
  }
  return context;
} 