"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { DesktopContainer } from "@/components/ui/desktop-container";

export default function DesktopPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="w-full max-w-6xl">
          <DesktopContainer viewOnly={false} status="live_view">
            {/* No action buttons for desktop page */}
          </DesktopContainer>
        </div>
      </main>
    </div>
  );
}
