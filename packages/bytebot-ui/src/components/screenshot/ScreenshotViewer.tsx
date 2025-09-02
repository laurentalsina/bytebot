import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ScreenshotData } from '@/utils/screenshotUtils';

interface ScreenshotViewerProps {
  screenshot: ScreenshotData | null;
  className?: string;
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

export function ScreenshotViewer({ screenshot, className = '', onDimensionsChange }: ScreenshotViewerProps) {
  const [currentScreenshot, setCurrentScreenshot] = useState(screenshot);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (screenshot?.id !== currentScreenshot?.id) {
      setCurrentScreenshot(screenshot);
    }
  }, [screenshot, currentScreenshot]);

  const handleImageLoad = () => {
    if (imageRef.current && onDimensionsChange) {
      const { width, height } = imageRef.current.getBoundingClientRect();
      onDimensionsChange({ width, height });
    }
  };

  if (!currentScreenshot) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="mb-2 text-4xl">📷</div>
          <p className="text-sm">No screenshots available</p>
          <p className="text-xs mt-1">Screenshots will appear here when the task has run</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        ref={imageRef}
        src={`data:image/png;base64,${currentScreenshot.base64Data}`}
        alt="Task screenshot"
        fill
        className="object-contain"
        priority
        onLoad={handleImageLoad}
      />
    </div>
  );
}
