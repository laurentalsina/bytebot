import React from "react";
import { VncViewer } from "@/components/vnc/VncViewer";
import { ScreenshotViewer } from "@/components/screenshot/ScreenshotViewer";
import { ScreenshotData } from "@/utils/screenshotUtils";
import {
  VirtualDesktopStatusHeader,
  VirtualDesktopStatus,
} from "@/components/VirtualDesktopStatusHeader";

interface DesktopContainerProps {
  children?: React.ReactNode;
  screenshot?: ScreenshotData | null;
  viewOnly?: boolean;
  className?: string;
  status?: VirtualDesktopStatus;
}

export const DesktopContainer: React.FC<DesktopContainerProps> = ({
  children,
  screenshot,
  viewOnly = false,
  className = "",
  status = "running",
}) => {
  return (
    <div
      className={`border-bytebot-bronze-light-7 flex w-full flex-col rounded-t-lg border-t border-r border-l ${className}`}
    >
      {/* Header */}
      <div className="bg-bytebot-bronze-light-2 border-bytebot-bronze-light-7 flex items-center justify-between rounded-t-lg border-b px-4 py-2">
        {/* Status Header */}
        <div className="flex items-center gap-2">
          <VirtualDesktopStatusHeader status={status} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">{children}</div>
      </div>

      <div className="aspect-[4/3] overflow-hidden">
        {screenshot ? (
          <ScreenshotViewer
            screenshot={screenshot}
            className="h-full w-full"
          />
        ) : (
          <VncViewer viewOnly={viewOnly} />
        )}
      </div>
    </div>
  );
};