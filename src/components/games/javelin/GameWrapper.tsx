// src/components/games/javelin/GameWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

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

const LandscapePrompt = () => (
    <div className="fixed inset-0 bg-slate-900 text-white min-h-screen min-w-screen flex flex-col items-center justify-center p-4">
      <div className="text-center w-full max-w-md px-4">
        <div className="text-8xl mb-8 animate-bounce">📱</div>
        <h2 className="text-3xl font-bold mb-6">Please Rotate Your Device</h2>
        <div className="relative">
          <div className="text-8xl my-8 inline-block animate-spin-slow">↺</div>
        </div>
        <p className="text-xl leading-relaxed opacity-90 mt-6 mx-auto max-w-[280px]">
          This game can only be played in landscape mode
        </p>
      </div>
    </div>
  );
  

export default function GameWrapper() {
    const [isValidOrientation, setIsValidOrientation] = useState(true);
  
    useEffect(() => {
      const checkOrientation = () => {
        // Force vh to be correct on mobile
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
  
        const isSmallDevice = window.innerWidth < 768;
        const isPortrait = window.innerHeight > window.innerWidth;
        setIsValidOrientation(!(isSmallDevice && isPortrait));
      };
  
      checkOrientation();
      window.addEventListener('resize', checkOrientation);
      window.addEventListener('orientationchange', checkOrientation);
  
      return () => {
        window.removeEventListener('resize', checkOrientation);
        window.removeEventListener('orientationchange', checkOrientation);
      };
    }, []);
  
    return (
      <div className="relative h-[100vh]">
        {isValidOrientation ? <JavelinGame /> : <LandscapePrompt />}
      </div>
    );
  }