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
        <div className="text-white text-xl flex flex-col items-center justify-center">
          <div className="animate-pulse">
            <svg 
              className="w-16 h-16 text-white mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 01-4.176-3.97L9.34 3.83a1.778 1.778 0 00-3.403.596l.812 4.455V9.8a1.5 1.5 0 01-1.405 1.107h-.81a1.5 1.5 0 01-1.405-1.107L1.59 5.627A1.5 1.5 0 00.14 4.52V3a1 1 0 011-1h16a1 1 0 011 1v7.5a1 1 0 01-1 1h-2.43a1 1 0 00-.957.725l-.347 1.388z"
              />
            </svg>
          </div>
          <span className="animate-pulse">Loading Game...</span>
        </div>
      </div>
    )
  }
);

const JavelinGameMultiplayer = dynamic(
  () => import('./JavelineGameComponentMultiplayer'),
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
    const [gameMode, setGameMode] = useState<'single' | 'multi' | null>(null);
  
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
      <div className="fixed inset-0 w-full h-full min-h-screen min-w-screen bg-slate-900 text-white overflow-hidden flex items-center justify-center">
        {!isValidOrientation ? (
          <LandscapePrompt />
        ) : gameMode === null ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-8 px-4">
            <h2 className="text-4xl font-bold mb-12 text-center">Choose Your Game Mode</h2>
            <div className="flex justify-center space-x-8 w-full max-w-4xl">
              <div 
                onClick={() => setGameMode('single')}
                className="cursor-pointer bg-gray-800 hover:bg-gray-700 p-6 md:p-8 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center w-48 md:w-64"
              >
                <div className="text-6xl mb-4">🏹</div>
                <h3 className="text-xl md:text-2xl font-semibold">Single Player</h3>
                <p className="text-gray-400 mt-2 text-sm md:text-base">Practice your javelin throw</p>
              </div>
              
              <div 
                onClick={() => setGameMode('multi')}
                className="cursor-pointer bg-gray-800 hover:bg-gray-700 p-6 md:p-8 rounded-2xl transition-all duration-300 transform hover:scale-105 text-center w-48 md:w-64"
              >
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl md:text-2xl font-semibold">Multiplayer</h3>
                <p className="text-gray-400 mt-2 text-sm md:text-base">Challenge a friend</p>
              </div>
            </div>
          </div>
        ) : gameMode === 'single' ? (
          <JavelinGame />
        ) : (
          <JavelinGameMultiplayer />
        )}
      </div>
     );
  }