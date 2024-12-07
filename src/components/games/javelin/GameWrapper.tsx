// src/components/games/javelin/GameWrapper.tsx
'use client';

import dynamic from 'next/dynamic';

const JavelinGame = dynamic(
  () => import('./JavelinGameComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Loading Game...</div>
      </div>
    )
  }
);

export default function GameWrapper() {
  return <JavelinGame />;
}