
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Button, Input, Card, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Shield, Fingerprint, Mail, ArrowRight, MapPin } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

// --- Premium 3D Logo Component ---
const PremiumLogo = () => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="perspective-1000 w-20 h-20 mx-auto mb-8 cursor-pointer group select-none relative z-10"
      onClick={() => setIsFlipped(!isFlipped)}
      title="Click to toggle!"
    >
      <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''} animate-float`}>
        {/* Front Face - Social (Indigo/Purple) */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(79,70,229,0.5)] border border-white/20 backface-hidden">
           {/* Inner bevel effect */}
           <div className="absolute inset-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
           
           <span className="text-white font-black text-4xl drop-shadow-2xl filter shadow-black">S</span>
           
           {/* Gloss Shine */}
           <div className="absolute top-0 right-0 w-12 h-12 bg-white/20 blur-xl rounded-full pointer-events-none mix-blend-overlay"></div>
        </div>

        {/* Back Face - Pay (Green/Emerald) */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] border border-white/20 backface-hidden rotate-y-180">
           <div className="absolute inset-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
           
           <span className="text-white font-black text-4xl drop-shadow-2xl">$</span>
           
           {/* Gloss Shine */}
           <div className="absolute top-0 right-0 w-12 h-12 bg-white/20 blur-xl rounded-full pointer-events-none mix-blend-overlay"></div>
        </div>
      </div>
      
      {/* Floating Shadow */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/20 blur-lg rounded-[100%] animate-pulse"></div>
    </div>
  );
};

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [viewState, setViewState] = useState<'login' | 'signup' | 'confirm'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('engager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  // Check for biometric capability
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricAvailable(true);
    }
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (err) => {
                console.warn("Location access denied or failed", err);
            }
        );
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    // Simulate biometric delay
    setTimeout(() => {
        setLoading(false);
        alert("Biometric scan successful! (Simulation)");
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (viewState === 'login') {
        const user = await storageService.signIn(email, password);
        if (user) {
          // Update location on login if available
          if (location) {
             storageService.updateUserLocation(user.id, location);
          }
          onLogin(user);
        } else {
          setError("User data fetch failed. If you just signed up, please wait a moment or try logging in again.");
        }
      } else {
        // --- SIGN UP FLOW ---
        const effectiveRole = email === 'emmanuelerog@gmail.com' ? 'admin' : role;
        
        // 1. Create the account
        const signUpResult = await storageService.signUp(email, password, name, effectiveRole);
        
        // 2. Attempt immediate auto-login
        try {
            // Case A: Supabase returned a session immediately (Auto-Confirm ON)
            if (isSupabaseConfigured() && signUpResult?.session) {
                // Short delay to ensure profile trigger has fired
                await new Promise(r => setTimeout(r, 1000));
                
                const user = await storageService.getUserById(signUpResult.user!.id);
                if (user) {
                    if (location) storageService.updateUserLocation(user.id, location);
                    onLogin(user);
                    return;
                }
            }

            // Case B: Mock Mode or Explicit sign in required
            const user = await storageService.signIn(email, password);
            if (user) {
                if (location) storageService.updateUserLocation(user.id, location);
                onLogin(user);
                return;
            }
        } catch (loginError: any) {
             if (loginError.message?.includes('Email not confirmed')) {
                 setViewState('confirm');
                 return;
             }
             throw loginError;
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- CONFIRMATION SCREEN ---
  if (viewState === 'confirm') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md text-center p-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                <p className="text-gray-500 mb-6">
                    We've sent a confirmation link to <strong>{email}</strong>. 
                    Please click the link in that email to verify your account.
                </p>
                <Button onClick={() => setViewState('login')} className="w-full">
                    Return to Sign In <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>
      </div>

      <Card className="w-full max-w-md relative overflow-hidden z-10 border-t-4 border-indigo-600">
        
        <div className="text-center mb-6 pt-8">
          <PremiumLogo />
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Social Pay</h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            {viewState === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to start earning.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-2">
          {viewState === 'signup' && (
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
               <Input 
                 required 
                 value={name} 
                 onChange={e => setName(e.target.value)} 
                 placeholder="John Doe"
                 className="bg-gray-50 border-gray-200"
               />
             </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <Input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <Input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {viewState === 'signup' && (
             <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">I want to...</label>
               <Select value={role} onChange={e => setRole(e.target.value as Role)} className="bg-gray-50 border-gray-200">
                 <option value="engager">Earn Money (Engager)</option>
                 <option value="creator">Promote Content (Creator/Brand)</option>
               </Select>
             </div>
          )}
            
          {/* Location Request */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex items-center justify-between border border-blue-100 dark:border-blue-800">
              <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{location ? "Location Detected" : "Enable Location for better tasks"}</span>
              </div>
              {!location && (
                  <button type="button" onClick={requestLocation} className="text-xs font-bold text-blue-600 underline hover:text-blue-800">Allow</button>
              )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center animate-slide-up">
              <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-indigo-500/20" isLoading={loading}>
            {viewState === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          
          {viewState === 'login' && biometricAvailable && (
              <button 
                type="button"
                onClick={handleBiometricLogin}
                className="w-full flex items-center justify-center py-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 font-medium text-sm"
              >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Sign in with Passkey
              </button>
          )}
        </form>

        <div className="mt-8 text-center text-sm border-t border-gray-100 dark:border-gray-800 pt-6">
          <button 
            onClick={() => { 
                setViewState(viewState === 'login' ? 'signup' : 'login'); 
                setError(''); 
            }}
            className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
          >
            {viewState === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};
