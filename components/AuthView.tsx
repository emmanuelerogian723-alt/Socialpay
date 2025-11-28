import React, { useState } from 'react';
import { User, Role } from '../types';
import { Button, Input, Card, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Shield, Fingerprint } from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const ADMIN_EMAIL = "emmanuelerog@gmail.com";
const ADMIN_PASS = "Erog@0291";

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('engager');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- ADMIN CHECK ---
    if (email === ADMIN_EMAIL) {
      if (password === ADMIN_PASS) {
        const adminUser = storageService.getUserByEmail(ADMIN_EMAIL);
        // If first time admin login, create the record if not exists (already handled in seed, but safe check)
        if (adminUser) {
           onLogin(adminUser);
           return;
        }
      } else {
        setError("Invalid Admin Credentials");
        return;
      }
    }

    // --- NORMAL USER LOGIC ---
    if (isLogin) {
      const user = storageService.getUserByEmail(email);
      if (user && user.role !== 'admin') {
         // Simple password simulation (In real app, hash and check password)
         onLogin(user);
      } else {
        setError("User not found or invalid credentials.");
      }
    } else {
      // Sign Up
      const existing = storageService.getUserByEmail(email);
      if (existing) {
        setError("Email already in use.");
        return;
      }
      
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`,
        role: role === 'admin' ? 'engager' : role, // Prevent creating admin via signup
        balance: 0,
        xp: 0,
        badges: [],
        verificationStatus: 'unpaid', // New users must pay fee
        joinedAt: Date.now()
      };

      storageService.createUser(newUser);
      onLogin(newUser);
    }
  };

  const handleBiometricLogin = () => {
      setIsScanning(true);
      setTimeout(() => {
          setIsScanning(false);
          // Simulate Passkey finding the last logged in user or a demo user
          // For demo purposes, we will try to find a random engager or admin if email is prefilled
          if (email) {
              const user = storageService.getUserByEmail(email);
              if (user) {
                  onLogin(user);
                  return;
              }
          }
          alert("Passkey simulation: Please enter your email first to identify the account.");
      }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Pay</h1>
          <p className="text-gray-500">
            {isLogin ? 'Welcome back! Sign in to continue.' : 'Create an account to start earning.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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

          {!isLogin && (
             <div>
               <label className="block text-sm font-medium mb-1">I want to...</label>
               <Select value={role} onChange={e => setRole(e.target.value as Role)}>
                 <option value="engager">Earn Money (Engager)</option>
                 <option value="creator">Promote Content (Creator/Brand)</option>
               </Select>
             </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg">
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>

          {isLogin && (
              <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                  </div>
              </div>
          )}

          {isLogin && (
              <Button type="button" variant="outline" className="w-full" onClick={handleBiometricLogin} disabled={isScanning}>
                 <Fingerprint className={`w-5 h-5 mr-2 ${isScanning ? 'animate-pulse text-indigo-500' : ''}`} />
                 {isScanning ? 'Scanning...' : 'Biometric / Passkey'}
              </Button>
          )}
        </form>

        <div className="mt-6 text-center text-sm">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};