"use client";

import { useState } from "react";

export interface PendingScreenshot {
  file: File;
  preview: string;
}

export function useScreenshots() {
  const [pendingScreenshots, setPendingScreenshots] = useState<PendingScreenshot[]>([]);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  const handlePendingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPendingScreenshots(prev => [...prev, ...newItems]);
  };

  const removePendingScreenshot = (index: number) => {
    setPendingScreenshots(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearPendingScreenshots = () => {
    pendingScreenshots.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingScreenshots([]);
  };

  return {
    pendingScreenshots,
    isUploadingScreenshot,
    handlePendingFileSelect,
    removePendingScreenshot,
    clearPendingScreenshots,
    setPendingScreenshots,
    setIsUploadingScreenshot
  };
}
