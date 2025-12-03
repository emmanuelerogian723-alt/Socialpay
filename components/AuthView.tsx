
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Button, Input, Card, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Shield, Fingerprint, Mail, CheckCircle, ArrowRight } from 'lucide-react';
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

  // Check for biometric capability (simulation)
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricAvailable(true);
    }
  }, []);

  const handleBiometricLogin = async () => {
    setLoading(true);
    // Simulate biometric delay
    setTimeout(() => {
        setLoading(false);
        // For simulation, we'll just alert. In a real app, this uses WebAuthn
        alert("Biometric scan successful! (Simulation)");
        // Ideally, you'd fetch the last logged-in user credential here
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (viewState === 'login') {
        // Hardcoded Admin Check for specific request (Mock fallback primarily)
        if (email === 'emmanuelerog@gmail.com' && password === 'Erog@0291') {
           // In a real Supabase app, this user must exist in the DB with role 'admin'
           // We will proceed with standard sign in, expecting the backend to return the correct role.
        }

        const user = await storageService.signIn(email, password);
        if (user) {
          onLogin(user);
        } else {
          setError("User data fetch failed. If you just signed up, please check your email for confirmation.");
        }
      } else {
        // Sign Up
        // If it's the specific admin email, force role to admin (for consistency)
        const effectiveRole = email === 'emmanuelerog@gmail.com' ? 'admin' : role;
        
        await storageService.signUp(email, password, name, effectiveRole);
        
        if (isSupabaseConfigured()) {
            setViewState('confirm'); // Move to confirmation screen for Supabase
        } else {
            // Mock mode logs in immediately
            const user = await storageService.signIn(email, password);
            if(user) onLogin(user);
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
                <div className="text-xs text-gray-400 mb-6">
                    Tip: If you are testing locally, ensure your Supabase "Site URL" is configured correctly in the dashboard.
                </div>
                <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-6">
                    <strong>Note for Admin:</strong> If you are signing up as <em>emmanuelerog@gmail.com</em>, 
                    please ensure you confirm the email to access the Admin Dashboard.
                </div>
                <Button onClick={() => setViewState('login')} className="w-full">
                    Return to Sign In <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
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

        <div className="mt-6 text-center text-sm">
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
