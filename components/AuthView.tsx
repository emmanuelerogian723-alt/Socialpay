
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Button, Input, Card, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Shield, Fingerprint, Mail, ArrowRight, MapPin } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
      <Card className="w-full max-w-md relative overflow-hidden">
        {/* Decorative header */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div className="text-center mb-6 pt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4 shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Pay</h1>
          <p className="text-gray-500">
            {viewState === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to start earning.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {viewState === 'signup' && (
             <div>
               <label className="block text-sm font-medium mb-1">Full Name</label>
               <Input 
                 required 
                 value={name} 
                 onChange={e => setName(e.target.value)} 
                 placeholder="John Doe"
               />
             </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <Input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          {viewState === 'signup' && (
             <div>
               <label className="block text-sm font-medium mb-1">I want to...</label>
               <Select value={role} onChange={e => setRole(e.target.value as Role)}>
                 <option value="engager">Earn Money (Engager)</option>
                 <option value="creator">Promote Content (Creator/Brand)</option>
               </Select>
             </div>
          )}
            
          {/* Location Request */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center text-sm text-blue-700 dark:text-blue-300">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{location ? "Location Detected" : "Enable Location for better tasks"}</span>
              </div>
              {!location && (
                  <button type="button" onClick={requestLocation} className="text-xs font-bold text-blue-600 underline">Allow</button>
              )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center animate-slide-up">
              <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" isLoading={loading}>
            {viewState === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          
          {viewState === 'login' && biometricAvailable && (
              <button 
                type="button"
                onClick={handleBiometricLogin}
                className="w-full flex items-center justify-center py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
              >
                  <Fingerprint className="w-5 h-5 mr-2" />
                  Sign in with Passkey
              </button>
          )}
        </form>

        <div className="mt-6 text-center text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
          <button 
            onClick={() => { 
                setViewState(viewState === 'login' ? 'signup' : 'login'); 
                setError(''); 
            }}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {viewState === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};
