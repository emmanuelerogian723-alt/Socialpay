
import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, DollarSign, ShoppingBag, Gamepad2, ArrowRight, 
  ShieldCheck, Globe, Star, Users, ChevronDown, ChevronUp, Zap, 
  Layout, CheckCircle, Smartphone, TrendingUp 
} from 'lucide-react';
import { Button, Card } from './UIComponents';

interface LandingViewProps {
  onGetStarted: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onGetStarted }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Animated Stats
  const [stats, setStats] = useState({ users: 0, payout: 0, tasks: 0 });

  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setStats({
        users: Math.floor(progress * 50000),
        payout: Math.floor(progress * 1000000),
        tasks: Math.floor(progress * 2500000)
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: "Earn Money Daily",
      desc: "Monetize your free time. Like, follow, comment, and watch videos to earn real cash instantly.",
      icon: <DollarSign className="w-6 h-6 text-green-400" />,
      color: "from-green-500/20 to-emerald-500/5",
      border: "border-green-500/30"
    },
    {
      title: "Creator Growth",
      desc: "Skyrocket your social presence. Get real, organic engagement from verified users. Zero bots.",
      icon: <TrendingUp className="w-6 h-6 text-pink-400" />,
      color: "from-pink-500/20 to-rose-500/5",
      border: "border-pink-500/30"
    },
    {
      title: "Digital Marketplace",
      desc: "Buy and sell digital assets, services, and accounts securely with Escrow protection.",
      icon: <ShoppingBag className="w-6 h-6 text-blue-400" />,
      color: "from-blue-500/20 to-indigo-500/5",
      border: "border-blue-500/30"
    },
    {
      title: "Play & Earn Arcade",
      desc: "Compete in skill-based games like Cyber Slash. Top the leaderboards for massive jackpots.",
      icon: <Gamepad2 className="w-6 h-6 text-purple-400" />,
      color: "from-purple-500/20 to-violet-500/5",
      border: "border-purple-500/30"
    }
  ];

  const faqs = [
    { q: "Is Social Pay free to join?", a: "Yes! Signing up is completely free. We only charge a small fee when you withdraw earnings or purchase premium services." },
    { q: "How do I get paid?", a: "We support direct Bank Transfers and Crypto (USDT) withdrawals. Payouts are processed within 24 hours." },
    { q: "Is the engagement real?", a: "Absolutely. We use AI verification to ensure all likes, follows, and comments come from real, active human users." },
    { q: "Can I sell my services?", a: "Yes, our Gig Marketplace allows you to sell graphics, writing, social accounts, and more securely." }
  ];

  const testimonials = [
    { name: "Sarah J.", role: "Influencer", text: "I grew my Instagram by 5k followers in a week. The engagement is actually real!", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
    { name: "David K.", role: "Freelancer", text: "I make about $50/day completing tasks and selling logo designs. Best side hustle app.", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d" },
    { name: "CryptoKing", role: "Gamer", text: "The arcade games are addictive! Won the weekly jackpot twice. Payouts are super fast.", avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d" }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Social Pay</span>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#market" className="hover:text-white transition-colors">Marketplace</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={onGetStarted} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</button>
            <Button onClick={onGetStarted} className="bg-white text-black hover:bg-gray-200 font-bold px-6">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[100px] -z-10"></div>

        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Hero Content */}
            <div className="lg:w-1/2 space-y-8 text-center lg:text-left z-10">
              <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md animate-fade-in">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Trusted by {stats.users.toLocaleString()}+ Users</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
                Monetize Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
                  Social Influence
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The all-in-one ecosystem where engagement meets earnings. Complete tasks, grow your brand, sell digital assets, and play games to earn real money.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-14 text-lg shadow-lg shadow-indigo-500/30" onClick={onGetStarted}>
                  Start Earning Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button onClick={onGetStarted} className="px-8 h-14 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-all flex items-center justify-center backdrop-blur-sm">
                  <PlayCircle className="w-5 h-5 mr-2 text-gray-400" /> Watch Demo
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10 mt-8">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stats.users.toLocaleString()}+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Active Users</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">${(stats.payout / 1000000).toFixed(1)}M+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Paid Out</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{(stats.tasks / 1000000).toFixed(1)}M+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Tasks Done</div>
                </div>
              </div>
            </div>

            {/* 3D App Mockup */}
            <div className="lg:w-1/2 relative perspective-1000 group">
              <div className="relative w-full max-w-md mx-auto transform rotate-y-12 rotate-x-6 group-hover:rotate-0 transition-transform duration-700 ease-out preserve-3d">
                {/* Floating Elements */}
                <div className="absolute -right-10 top-20 bg-gray-900 p-4 rounded-xl border border-green-500/30 shadow-2xl z-20 animate-bounce-soft">
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                         <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                         <div className="text-xs text-gray-400">New Payout</div>
                         <div className="font-bold text-green-400">+$150.00 Received</div>
                      </div>
                   </div>
                </div>

                <div className="absolute -left-10 bottom-20 bg-gray-900 p-4 rounded-xl border border-pink-500/30 shadow-2xl z-20 animate-bounce-soft" style={{animationDelay: '1s'}}>
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                         <Star className="w-6 h-6 text-pink-400" />
                      </div>
                      <div>
                         <div className="text-xs text-gray-400">Task Completed</div>
                         <div className="font-bold text-pink-400">Instagram Like</div>
                      </div>
                   </div>
                </div>

                {/* Main Dashboard Mockup */}
                <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden aspect-[3/4] relative">
                   {/* Mock Header */}
                   <div className="h-16 bg-gray-800/50 border-b border-gray-700 flex items-center px-6 justify-between">
                      <div className="flex space-x-2">
                         <div className="w-3 h-3 rounded-full bg-red-500"></div>
                         <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                         <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="w-24 h-2 bg-gray-700 rounded-full"></div>
                   </div>
                   {/* Mock Content */}
                   <div className="p-6 space-y-6">
                      <div className="h-32 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                         <div className="w-12 h-12 bg-white/20 rounded-lg mb-4"></div>
                         <div className="h-4 w-24 bg-white/20 rounded mb-2"></div>
                         <div className="h-8 w-32 bg-white/40 rounded"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="h-24 bg-gray-800 rounded-xl border border-gray-700"></div>
                         <div className="h-24 bg-gray-800 rounded-xl border border-gray-700"></div>
                      </div>
                      <div className="space-y-3">
                         <div className="h-16 bg-gray-800 rounded-xl border border-gray-700 flex items-center px-4 space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                            <div className="flex-1 space-y-2">
                               <div className="h-2 w-full bg-gray-700 rounded"></div>
                               <div className="h-2 w-2/3 bg-gray-700 rounded"></div>
                            </div>
                         </div>
                         <div className="h-16 bg-gray-800 rounded-xl border border-gray-700 flex items-center px-4 space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                            <div className="flex-1 space-y-2">
                               <div className="h-2 w-full bg-gray-700 rounded"></div>
                               <div className="h-2 w-2/3 bg-gray-700 rounded"></div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-gray-900 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Whether you're a creator looking for growth or a freelancer looking to earn, our platform provides the tools you need.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div 
                key={i}
                className={`p-8 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm hover:-translate-y-2 transition-all duration-300 group cursor-default hover:bg-gradient-to-br ${f.color} ${f.border} hover:border-opacity-50`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className="w-14 h-14 rounded-xl bg-gray-800 flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all duration-300 shadow-lg">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-200">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
             <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">How to Start Earning</h2>
                <div className="space-y-8">
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">1</div>
                      <div>
                         <h4 className="text-xl font-bold mb-2">Create Free Account</h4>
                         <p className="text-gray-400">Sign up in seconds. No credit card required. Get instant access to the dashboard.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">2</div>
                      <div>
                         <h4 className="text-xl font-bold mb-2">Choose Tasks or Games</h4>
                         <p className="text-gray-400">Browse available engagement tasks, play arcade games, or list a gig in the marketplace.</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">3</div>
                      <div>
                         <h4 className="text-xl font-bold mb-2">Get Paid Instantly</h4>
                         <p className="text-gray-400">Withdraw your earnings directly to your local bank account or crypto wallet once you reach the threshold.</p>
                      </div>
                   </div>
                </div>
                <Button className="mt-10 px-8" onClick={onGetStarted}>Create Account</Button>
             </div>
             <div className="lg:w-1/2 relative">
                <div className="absolute inset-0 bg-indigo-600/20 blur-[100px]"></div>
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
                   <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                         <div key={i} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                            <div className="flex items-center space-x-3">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i===1 ? 'bg-pink-900/50 text-pink-400' : i===2 ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'}`}>
                                  {i===1 ? <Users className="w-4 h-4"/> : i===2 ? <Smartphone className="w-4 h-4"/> : <Gamepad2 className="w-4 h-4"/>}
                               </div>
                               <div>
                                  <div className="font-bold text-sm">Task Completed</div>
                                  <div className="text-xs text-gray-500">Just now</div>
                               </div>
                            </div>
                            <div className="font-bold text-green-400">+$0.{i}5</div>
                         </div>
                      ))}
                   </div>
                   <div className="mt-6 p-4 bg-indigo-600 rounded-xl text-center">
                      <div className="text-indigo-200 text-sm">Total Earnings</div>
                      <div className="text-3xl font-bold text-white">$1,240.50</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-24 bg-gray-900 border-t border-white/5">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Trusted by Thousands</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-black/40 p-8 rounded-2xl border border-white/5 relative">
                <div className="flex items-center space-x-4 mb-6">
                  <img src={t.avatar} className="w-12 h-12 rounded-full border-2 border-indigo-500" alt={t.name} />
                  <div>
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-xs text-indigo-400 uppercase tracking-wider">{t.role}</div>
                  </div>
                </div>
                <p className="text-gray-400 italic">"{t.text}"</p>
                <div className="flex text-yellow-500 mt-4 space-x-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current"/>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-black">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden bg-gray-900/30">
                <button 
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-bold text-lg">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="text-indigo-500"/> : <ChevronDown className="text-gray-500"/>}
                </button>
                {openFaq === i && (
                  <div className="p-6 pt-0 text-gray-400 leading-relaxed border-t border-white/5 mt-2">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to start earning?</h2>
          <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">Join the fastest growing social economy platform today. It takes less than a minute to get started.</p>
          <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 font-bold px-10 py-4 text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all" onClick={onGetStarted}>
            Create Free Account
          </Button>
          <p className="mt-4 text-sm text-indigo-200 opacity-80">No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 bg-black border-t border-white/10 text-sm text-gray-500">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-bold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-indigo-400">Features</a></li>
                <li><a href="#" className="hover:text-indigo-400">Marketplace</a></li>
                <li><a href="#" className="hover:text-indigo-400">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-indigo-400">About Us</a></li>
                <li><a href="#" className="hover:text-indigo-400">Careers</a></li>
                <li><a href="#" className="hover:text-indigo-400">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-indigo-400">Blog</a></li>
                <li><a href="#" className="hover:text-indigo-400">Help Center</a></li>
                <li><a href="#" className="hover:text-indigo-400">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="text-white font-bold text-lg">Social Pay</span>
              </div>
              <p>The #1 platform for social monetization.</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 Social Pay Inc. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Globe className="w-5 h-5 hover:text-white cursor-pointer"/>
              <Layout className="w-5 h-5 hover:text-white cursor-pointer"/>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
