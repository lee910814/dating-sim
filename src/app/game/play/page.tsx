'use client';

import { Suspense } from 'react';
import VisualNovelChat from "@/components/VisualNovelChat";

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <span className="text-white text-xl animate-pulse">로딩 중... 💭</span>
      </div>
    }>
      <VisualNovelChat />
    </Suspense>
  );
}
