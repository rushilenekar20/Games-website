// app/page.tsx
import Link from 'next/link';
import { Inter, Orbitron } from 'next/font/google';
import { FaGamepad, FaTrophy, FaUsers } from 'react-icons/fa';

const orbitron = Orbitron({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

const games = [
  {
    id: 'javelin',
    title: 'Javelin Throw',
    description: 'Master the Olympic art of javelin throwing',
    image: '/javelin.jpg',
    players: 'Single Player',
    difficulty: 'Medium',
    category: 'Sports'
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0F172A]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className={`${orbitron.className} text-5xl md:text-7xl font-bold text-white mb-6 
            bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400`}>
            GAME ARENA
          </h1>
          <p className={`${inter.className} text-xl md:text-2xl text-gray-300 max-w-2xl`}>
            Experience next-generation browser games with stunning graphics and smooth gameplay
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { icon: <FaGamepad className="w-8 h-8" />, title: 'Modern Games', desc: 'Built with latest web technologies' },
            { icon: <FaTrophy className="w-8 h-8" />, title: 'Competitive', desc: 'Compare scores globally' },
            { icon: <FaUsers className="w-8 h-8" />, title: 'Multiplayer', desc: 'Play with friends online' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 hover:border-violet-500/50 
              transition-all duration-300">
              <div className="text-violet-400 mb-4">{feature.icon}</div>
              <h3 className={`${orbitron.className} text-xl font-semibold text-white mb-2`}>{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className={`${orbitron.className} text-3xl font-bold text-white mb-12`}>Featured Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <Link href={`/games/${game.id}`} key={game.id}>
              <div className="group relative bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 
                hover:border-violet-500/50 transition-all duration-300">
                <div className="aspect-video bg-slate-900">
                  {/* Game preview image */}
                </div>
                <div className="p-6">
                  <h3 className={`${orbitron.className} text-xl font-semibold text-white mb-2`}>{game.title}</h3>
                  <p className="text-gray-400 mb-4">{game.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{game.category}</span>
                    <span>•</span>
                    <span>{game.difficulty}</span>
                    <span>•</span>
                    <span>{game.players}</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 to-fuchsia-500/0 
                  group-hover:from-violet-500/10 group-hover:to-fuchsia-500/10 transition-all duration-300" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}