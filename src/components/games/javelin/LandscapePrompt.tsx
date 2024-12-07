// src/components/games/javelin/LandscapePrompt.tsx
export const LandscapePrompt = () => {
    return (
      <div className="fixed inset-0 bg-slate-900 text-white flex items-center justify-center z-50 
        portrait:flex md:hidden hidden"> {/* Only shows on small devices in portrait */}
        <div className="text-center p-4">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-2">Please Rotate Your Device</h2>
          <p>This game works best in landscape mode</p>
        </div>
      </div>
    );
  };