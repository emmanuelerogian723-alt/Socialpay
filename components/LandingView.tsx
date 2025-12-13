import React, { useState } from 'react';
import { PlayCircle, DollarSign, ShoppingBag, Gamepad2, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { Button } from './UIComponents';

interface LandingViewProps {
  onGetStarted: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onGetStarted }) => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "Earn Money Daily",
      desc: "Complete simple tasks like liking posts, following accounts, or watching videos to earn real cash instantly.",
      icon: <DollarSign className="w-8 h-8 text-green-400" />,
      color: "from-green-500 to-emerald-700",
      bg: "bg-green-900/20"
    },
    {
      title: "Creator Growth",
      desc: "Boost your social media presence with real, verified engagement from active users. No bots.",
      icon: <PlayCircle className="w-8 h-8 text-pink-400" />,
      color: "from-pink-500 to-rose-700",
      bg: "bg-pink-900/20"
    },
    {
      title: "Gig Marketplace",
      desc: "Sell your digital skills or buy services. Graphics, writing, video editing, and more.",
      icon: <ShoppingBag className="w-8 h-8 text-blue-400" />,
      color: "from-blue-500 to-indigo-700",
      bg: "bg-blue-900/20"
    },
    {
      title: "Game Arcade",
      desc: "Relax and play addictive games like Cyber Slash or Math Master. Earn rewards for high scores.",
      icon: <Gamepad2 className="w-8 h-8 text-purple-400" />,
      color: "from-purple-500 to-violet-700",
      bg: "bg-purple-900/20"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8 flex flex-col h-full flex-1">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
            <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="text-2xl font-bold tracking-tight">Social Pay</span>
            </div>
            <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors" onClick={onGetStarted}>
                Sign In
            </button>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-12 flex-1">
            <div className="lg:w-1/2 space-y-8">
                <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-gray-300">Secure & Verified Platform</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-black leading-tight">
                    The Ultimate <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Social Economy</span>
                </h1>
                
                <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
                    Join thousands of users earning, creating, and connecting. Whether you want to grow your brand or earn daily cash, Social Pay is your ecosystem.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 font-bold px-8" onClick={onGetStarted}>
                        Get Started <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <button className="px-8 py-3 rounded-lg border border-white/20 hover:bg-white/5 font-medium transition-all flex items-center justify-center">
                        <Globe className="w-5 h-5 mr-2" /> Explore Community
                    </button>
                </div>
            </div>

            {/* Feature Cards / Visual Guide */}
            <div className="lg:w-1/2 w-full relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((f, i) => (
                        <div 
                            key={i}
                            className={`p-6 rounded-2xl border border-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 cursor-pointer ${f.bg} hover:bg-opacity-30`}
                            onMouseEnter={() => setActiveFeature(i)}
                        >
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-400 leading-snug">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Footer Stats */}
        <div className="mt-16 pt-8 border-t border-white/5 flex justify-between text-center md:text-left text-sm text-gray-500">
             <div>
                 <span className="block text-2xl font-bold text-white mb-1">50K+</span>
                 Users
             </div>
             <div>
                 <span className="block text-2xl font-bold text-white mb-1">$1M+</span>
                 Paid Out
             </div>
             <div>
                 <span className="block text-2xl font-bold text-white mb-1">100+</span>
                 Countries
             </div>
        </div>
      </div>
    </div>
  );
};

export default LandingView;