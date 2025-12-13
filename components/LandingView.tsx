
import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, DollarSign, ShoppingBag, Gamepad2, ArrowRight, 
  ShieldCheck, Globe, Star, Users, ChevronDown, ChevronUp, Zap, 
  Layout, CheckCircle, Smartphone, TrendingUp, Info, Heart,
  HelpCircle, Sparkles, Lock, CreditCard
} from 'lucide-react';
import { Button, Card, Badge } from './UIComponents';

interface LandingViewProps {
  onGetStarted: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onGetStarted }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Animated Stats State
  const [stats, setStats] = useState({ users: 0, payout: 0, tasks: 0 });

  // Scroll Listener for Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats Counter Animation
  useEffect(() => {
    const duration = 2500;
    const steps = 60;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Easing function for smooth stop
      const ease = 1 - Math.pow(1 - progress, 3);
      
      setStats({
        users: Math.floor(ease * 15420),
        payout: Math.floor(ease * 250000),
        tasks: Math.floor(ease * 890000)
      });

      if (step >= steps) clearInterval(timer);
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: "Earn Daily",
      desc: "Complete simple tasks like liking posts, watching videos, and following accounts to earn instant cash.",
      icon: <DollarSign className="w-6 h-6 text-green-400" />,
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
    {
      title: "Creator Growth",
      desc: "Get real, organic engagement for your social media channels. No bots, just verified real users.",
      icon: <TrendingUp className="w-6 h-6 text-pink-400" />,
      bg: "bg-pink-500/10",
      border: "border-pink-500/20"
    },
    {
      title: "Digital Market",
      desc: "Buy and sell digital assets like e-books, designs, and accounts securely with Escrow protection.",
      icon: <ShoppingBag className="w-6 h-6 text-blue-400" />,
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      title: "Arcade Games",
      desc: "Play skill-based games like Cyber Slash and Math Master. Top the leaderboards to win jackpots.",
      icon: <Gamepad2 className="w-6 h-6 text-purple-400" />,
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    }
  ];

  const steps = [
    { num: "01", title: "Create Account", desc: "Sign up in seconds. Verify your email to unlock all features." },
    { num: "02", title: "Choose Role", desc: "Start as an Earner to make money or a Creator to grow your brand." },
    { num: "03", title: "Start Earning", desc: "Complete tasks or sell products. Watch your wallet balance grow." },
    { num: "04", title: "Get Paid", desc: "Withdraw earnings directly to your bank account or crypto wallet instantly." }
  ];

  const faqs = [
    { q: "Is Social Pay free to join?", a: "Yes! Signing up is completely free. We charge a small service fee only when you withdraw earnings or purchase services." },
    { q: "How do I withdraw my money?", a: "We support direct Bank Transfers and Crypto (USDT) withdrawals. Payouts are typically processed within 24 hours." },
    { q: "Is the engagement real?", a: "Absolutely. We use AI verification and manual checks to ensure all engagement comes from real, active human users." },
    { q: "What happens if a seller doesn't deliver?", a: "Our Escrow system holds funds until you confirm delivery. If there's an issue, our support team resolves it and refunds you." }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Social Pay</span>
          </div>
          
          <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#market" className="hover:text-white transition-colors">Marketplace</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={onGetStarted} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">Log In</button>
            <Button onClick={onGetStarted} className="bg-white text-black hover:bg-gray-200 font-bold px-6 rounded-full">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Hero Text */}
            <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Live Marketplace</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight">
                Turn Your Social <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">
                  Time Into Money
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate two-sided marketplace. Creators get real engagement, and users get paid for simple tasks. Secure, fast, and transparent.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-14 text-lg shadow-lg shadow-indigo-500/20 rounded-full" onClick={onGetStarted}>
                  Start Earning Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button onClick={onGetStarted} className="px-8 h-14 rounded-full border border-white/10 hover:bg-white/5 font-bold transition-all flex items-center justify-center backdrop-blur-sm group">
                  <PlayCircle className="w-5 h-5 mr-2 text-gray-400 group-hover:text-white transition-colors" /> Watch Demo
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10 mt-8">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{stats.users.toLocaleString()}+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Active Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">${(stats.payout / 1000).toFixed(0)}k+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Paid Out</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">{(stats.tasks / 1000).toFixed(0)}k+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Tasks Done</div>
                </div>
              </div>
            </div>

            {/* 3D Dashboard Mockup */}
            <div className="lg:w-1/2 relative perspective-1000 group">
              <div className="relative w-full max-w-md mx-auto transform rotate-y-12 rotate-x-6 group-hover:rotate-0 transition-transform duration-700 ease-out preserve-3d">
                {/* Floating Cards */}
                <div className="absolute -right-12 top-20 bg-gray-900/90 backdrop-blur-xl p-4 rounded-2xl border border-green-500/30 shadow-2xl z-30 animate-bounce-soft transform translate-z-10">
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                         <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                         <div className="text-xs text-gray-400 font-medium">New Payout</div>
                         <div className="font-bold text-green-400 text-lg">+$150.00</div>
                      </div>
                   </div>
                </div>

                <div className="absolute -left-12 bottom-32 bg-gray-900/90 backdrop-blur-xl p-4 rounded-2xl border border-pink-500/30 shadow-2xl z-30 animate-bounce-soft transform translate-z-10" style={{animationDelay: '1.5s'}}>
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                         <Heart className="w-6 h-6 text-pink-400" />
                      </div>
                      <div>
                         <div className="text-xs text-gray-400 font-medium">Task Completed</div>
                         <div className="font-bold text-white">Instagram Like</div>
                      </div>
                   </div>
                </div>

                {/* Main App Window */}
                <div className="bg-[#0f1115] border border-gray-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)] overflow-hidden aspect-[9/16] md:aspect-[3/4] relative transform translate-z-0">
                   {/* Header */}
                   <div className="h-14 bg-gray-900/50 border-b border-gray-800 flex items-center px-5 justify-between">
                      <div className="flex space-x-2">
                         <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                         <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                         <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                      </div>
                      <div className="text-xs font-mono text-gray-600">socialpay.app</div>
                   </div>
                   
                   {/* Content */}
                   <div className="p-6 space-y-6">
                      {/* Balance Card */}
                      <div className="h-36 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                         <div className="relative z-10">
                             <div className="text-indigo-200 text-sm mb-1">Total Balance</div>
                             <div className="text-3xl font-bold mb-4">$1,240.50</div>
                             <div className="flex gap-2">
                                <div className="h-8 w-24 bg-white/20 rounded-lg backdrop-blur-sm"></div>
                                <div className="h-8 w-8 bg-white/20 rounded-lg backdrop-blur-sm"></div>
                             </div>
                         </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="h-28 bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 mb-3"></div>
                            <div className="h-2 w-12 bg-gray-700 rounded mb-2"></div>
                            <div className="h-4 w-16 bg-gray-600 rounded"></div>
                         </div>
                         <div className="h-28 bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 mb-3"></div>
                            <div className="h-2 w-12 bg-gray-700 rounded mb-2"></div>
                            <div className="h-4 w-16 bg-gray-600 rounded"></div>
                         </div>
                      </div>

                      {/* List Items */}
                      <div className="space-y-3">
                         {[1, 2].map(i => (
                             <div key={i} className="h-16 bg-gray-800/30 rounded-xl border border-gray-800 flex items-center px-4 space-x-4">
                                <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                                <div className="flex-1 space-y-2">
                                   <div className="h-2 w-24 bg-gray-700 rounded"></div>
                                   <div className="h-2 w-16 bg-gray-800 rounded"></div>
                                </div>
                                <div className="w-16 h-6 bg-indigo-500/20 rounded-full"></div>
                             </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Social Pay?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">We've built a comprehensive ecosystem that rewards you for your time and creativity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div 
                key={i}
                className={`p-8 rounded-3xl bg-gray-900 border border-white/5 hover:border-white/10 transition-all duration-300 group hover:-translate-y-2`}
              >
                <div className={`w-14 h-14 rounded-2xl ${f.bg} ${f.border} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (ROADMAP) --- */}
      <section id="how-it-works" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="container mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                  <Badge color="blue" className="mb-4">Simple Process</Badge>
                  <h2 className="text-4xl font-bold">How It Works</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                  {/* Connecting Line (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0"></div>

                  {steps.map((step, i) => (
                      <div key={i} className="relative group">
                          <div className="w-24 h-24 mx-auto bg-gray-900 border-4 border-gray-800 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 group-hover:border-indigo-500 group-hover:text-white transition-all duration-300 relative z-10 mb-6 shadow-xl">
                              {step.num}
                          </div>
                          <div className="text-center px-4">
                              <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">{step.title}</h3>
                              <p className="text-gray-400 text-sm">{step.desc}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- MARKETPLACE PREVIEW --- */}
      <section id="market" className="py-24 bg-gray-900 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
               <div className="inline-flex items-center space-x-2 text-indigo-400 font-bold mb-4">
                   <Lock className="w-4 h-4" />
                   <span className="uppercase tracking-widest text-xs">Secure Escrow System</span>
               </div>
               <h2 className="text-4xl font-bold mb-6">Trade Securely in the <br/><span className="text-indigo-400">Digital Marketplace</span></h2>
               <p className="text-gray-400 mb-8 text-lg leading-relaxed">
                 The safest place to buy and sell social media assets. Funds are held in our secure Escrow until you confirm receipt of the product.
               </p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                   {[
                       "Verified Sellers", "Instant Delivery", "Dispute Protection", "Crypto Payments"
                   ].map((item, i) => (
                       <div key={i} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg border border-white/5">
                           <CheckCircle className="w-5 h-5 text-green-400" />
                           <span className="text-sm font-medium">{item}</span>
                       </div>
                   ))}
               </div>

               <Button variant="outline" className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 px-8 py-3" onClick={onGetStarted}>
                 Browse Marketplace
               </Button>
            </div>
            
            <div className="lg:w-1/2">
                <div className="grid grid-cols-2 gap-6">
                    <Card className="bg-black border-gray-800 p-6 transform hover:-translate-y-2 transition-transform">
                        <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                            <Smartphone className="w-6 h-6 text-blue-400"/>
                        </div>
                        <h4 className="font-bold mb-1">USA Phone Numbers</h4>
                        <p className="text-xs text-gray-500">For verification</p>
                    </Card>
                    <Card className="bg-black border-gray-800 p-6 transform hover:-translate-y-2 transition-transform translate-y-8">
                        <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-purple-400"/>
                        </div>
                        <h4 className="font-bold mb-1">Social Accounts</h4>
                        <p className="text-xs text-gray-500">Aged & Verified</p>
                    </Card>
                    <Card className="bg-black border-gray-800 p-6 transform hover:-translate-y-2 transition-transform">
                        <div className="h-12 w-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                            <Layout className="w-6 h-6 text-pink-400"/>
                        </div>
                        <h4 className="font-bold mb-1">Canva Templates</h4>
                        <p className="text-xs text-gray-500">Ready to edit</p>
                    </Card>
                    <Card className="bg-black border-gray-800 p-6 transform hover:-translate-y-2 transition-transform translate-y-8">
                        <div className="h-12 w-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-yellow-400"/>
                        </div>
                        <h4 className="font-bold mb-1">Marketing Services</h4>
                        <p className="text-xs text-gray-500">Boost your reach</p>
                    </Card>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Trusted by Thousands</h2>
              <p className="text-gray-400">Join a community of earners and creators who trust Social Pay.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-900 border-gray-800 p-8">
               <div className="flex text-yellow-500 mb-4">
                   {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
               </div>
               <p className="text-gray-300 mb-6 text-sm leading-relaxed">"I've tried many earning apps, but Social Pay is the only one that pays instantly. The tasks are easy and the support is great."</p>
               <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
                   <div>
                       <div className="font-bold text-sm">Alex Johnson</div>
                       <div className="text-xs text-gray-500">Student</div>
                   </div>
               </div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-8 transform md:-translate-y-4">
               <div className="flex text-yellow-500 mb-4">
                   {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
               </div>
               <p className="text-gray-300 mb-6 text-sm leading-relaxed">"As a small business owner, I needed real engagement for my posts. Social Pay delivered authentic comments and likes that helped me go viral."</p>
               <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-600"></div>
                   <div>
                       <div className="font-bold text-sm">Sarah Williams</div>
                       <div className="text-xs text-gray-500">Content Creator</div>
                   </div>
               </div>
            </Card>
            <Card className="bg-gray-900 border-gray-800 p-8">
               <div className="flex text-yellow-500 mb-4">
                   {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
               </div>
               <p className="text-gray-300 mb-6 text-sm leading-relaxed">"The digital market is a game changer. I sold my old Instagram account securely through their Escrow system. Highly recommended!"</p>
               <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-600"></div>
                   <div>
                       <div className="font-bold text-sm">Michael Brown</div>
                       <div className="text-xs text-gray-500">Freelancer</div>
                   </div>
               </div>
            </Card>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-[#0a0a0a]">
          <div className="container mx-auto px-6 max-w-3xl">
              <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {faqs.map((faq, i) => (
                      <div 
                        key={i} 
                        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-gray-700 transition-colors"
                        onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                      >
                          <div className="p-6 flex justify-between items-center">
                              <h3 className="font-bold text-lg">{faq.q}</h3>
                              {activeFaq === i ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                          </div>
                          {activeFaq === i && (
                              <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-4 animate-fade-in">
                                  {faq.a}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-24 bg-gradient-to-br from-indigo-900 via-purple-900 to-black relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
         <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to Start Earning?</h2>
            <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">Join thousands of users who are already monetizing their time and influence on Social Pay.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-gray-100 font-bold px-10 py-4 text-lg shadow-2xl rounded-full" onClick={onGetStarted}>
                   Create Free Account
                </Button>
                <button onClick={onGetStarted} className="px-10 py-4 rounded-full border border-white/20 hover:bg-white/10 font-bold transition-all text-white">
                   View Marketplace
                </button>
            </div>
         </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black py-12 border-t border-white/10 text-sm text-gray-500">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
           <div className="mb-4 md:mb-0">
              <span className="font-bold text-white text-lg">Social Pay</span>
              <p className="mt-1">Empowering the digital generation.</p>
           </div>
           <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
           </div>
           <div className="mt-4 md:mt-0 flex items-center text-xs">
              <Heart className="w-3 h-3 text-red-500 mx-1" /> Created by Social Pay Team
           </div>
        </div>
      </footer>
      
    </div>
  );
};

export default LandingView;
