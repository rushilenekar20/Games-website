import { useState } from 'react';
import { Player } from './types';

interface PlayerSetupProps {
  onSubmit: (players: Player[]) => void;
}
  
  // Add this component for player setup
 // src/components/games/javelin/PlayerSetup.tsx
export const PlayerSetup = ({ onSubmit }: PlayerSetupProps) => {
    const [numPlayers, setNumPlayers] = useState(2);
    const [playerNames, setPlayerNames] = useState<string[]>([]);
  
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Multiplayer Setup</h2>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Number of Players (2-4):
            </label>
            <input 
              type="number" 
              min={2} 
              max={4} 
              value={numPlayers}
              onChange={(e) => {
                const value = Number(e.target.value);
                setNumPlayers(value);
                setPlayerNames(new Array(value).fill(''));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
  
          {Array(numPlayers).fill(0).map((_, i) => (
            <div key={i} className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Player {i + 1} Name:
              </label>
              <input 
                type="text"
                value={playerNames[i] || ''}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[i] = e.target.value;
                  setPlayerNames(newNames);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={`Player ${i + 1}`}
              />
            </div>
          ))}
  
          <button
            onClick={() => {
              const players: Player[] = playerNames.map(name => ({
                name: name || `Player ${playerNames.indexOf(name) + 1}`,
                bestThrow: 0,
                currentTurn: false
              }));
              players[0].currentTurn = true;
              onSubmit(players);
            }}
            className="w-full py-3 mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  };