
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, X, Copy, Check, ScanFace, Award, Fingerprint } from 'lucide-react';
import { Certificate } from '../types';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost', 
  size?: 'sm' | 'md' | 'lg',
  isLoading?: boolean 
}> = ({ 
  children, variant = 'primary', size = 'md', className = '', isLoading, ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md hover:shadow-lg",
    secondary: "bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-500 shadow-sm",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
    outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
  };

  return (
    <button className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'; className?: string }> = ({ children, color = 'blue', className = '' }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-1 dark:text-gray-300">{label}</label>}
    <input 
      {...props} 
      className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white placeholder-gray-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors ${className}`} 
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    {...props} 
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white text-sm ${props.className}`} 
  >
    {props.children}
  </select>
);

export const ToastContainer: React.FC<{ notifications: any[], onDismiss: (id: string) => void }> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className="pointer-events-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border-l-4 border-indigo-500 min-w-[300px] animate-slide-up flex items-start justify-between">
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{n.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{n.message}</p>
          </div>
          <button onClick={() => onDismiss(n.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const Modal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  maxWidth?: string; 
}> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${maxWidth} z-10 overflow-hidden animate-slide-up flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const BankDetails: React.FC = () => {
  const [copied, setCopied] = React.useState(false);
  const accountNum = "7415707015";

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-3">Bank Transfer Details</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Bank Name:</span>
          <span className="font-semibold">First City Monument Bank</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Account Name:</span>
          <span className="font-semibold text-right">Emmanuel Ene Rejoice Gideon</span>
        </div>
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 mt-2">
          <span className="font-mono font-bold text-lg tracking-widest">{accountNum}</span>
          <button 
            onClick={handleCopy} 
            className="text-indigo-600 hover:text-indigo-700 flex items-center text-xs font-medium"
          >
            {copied ? <Check className="w-4 h-4 mr-1"/> : <Copy className="w-4 h-4 mr-1"/>}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: Human Verification Modal ---
export const HumanVerificationModal: React.FC<{ isOpen: boolean, onClose: () => void, onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'intro' | 'scanning' | 'success'>('intro');
    const videoRef = useRef<HTMLVideoElement>(null);

    const startScan = async () => {
        setStep('scanning');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            // Simulate AI check delay
            setTimeout(() => {
                stream.getTracks().forEach(track => track.stop());
                setStep('success');
            }, 3000);
        } catch (e) {
            alert("Camera access denied. Please enable camera to verify.");
            setStep('intro');
        }
    };

    const handleFinish = () => {
        onSuccess();
        setStep('intro'); // reset for next time if needed
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Identity Verification">
            {step === 'intro' && (
                <div className="text-center space-y-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <ScanFace className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Verify You Are Human</h3>
                        <p className="text-gray-500 text-sm mt-2">
                            To maintain a secure marketplace, we require all sellers to pass a quick liveness check. This prevents bots and fraud.
                        </p>
                    </div>
                    <ul className="text-left text-sm space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Position your face in the frame</li>
                        <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Ensure good lighting</li>
                        <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Takes less than 5 seconds</li>
                    </ul>
                    <Button onClick={startScan} className="w-full">Start Verification</Button>
                </div>
            )}

            {step === 'scanning' && (
                <div className="text-center">
                    <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-indigo-500 mb-4 bg-black">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-scan"></div>
                    </div>
                    <p className="font-bold text-indigo-600 animate-pulse">Analyzing Biometrics...</p>
                    <p className="text-xs text-gray-500">Please hold still</p>
                </div>
            )}

            {step === 'success' && (
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-green-700">Verification Complete</h3>
                        <p className="text-gray-500 text-sm mt-2">You are now verified as a human seller.</p>
                    </div>
                    <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700">Continue</Button>
                </div>
            )}
        </Modal>
    );
};

// --- NEW COMPONENT: Certificate Card ---
export const CertificateCard: React.FC<{ cert: Certificate, userName: string }> = ({ cert, userName }) => {
    const themeStyles = {
        gold: "from-yellow-400 to-yellow-600 border-yellow-300 text-yellow-900",
        silver: "from-gray-300 to-gray-500 border-gray-400 text-gray-900",
        bronze: "from-orange-300 to-orange-500 border-orange-400 text-orange-900",
        platinum: "from-cyan-300 to-blue-500 border-cyan-400 text-cyan-900"
    };

    return (
        <div className={`relative overflow-hidden rounded-xl border-4 bg-gradient-to-br ${themeStyles[cert.theme]} p-6 shadow-xl transform hover:scale-105 transition-transform cursor-default`}>
            {/* Watermark/Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-white/90 p-3 rounded-full shadow-lg mb-3">
                    <Award className="w-8 h-8 text-black" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-1 opacity-80">SocialPay Certified</h4>
                <h3 className="text-xl font-black mb-2 font-serif">{cert.title}</h3>
                <p className="text-xs font-medium mb-4 opacity-90 max-w-[200px]">{cert.description}</p>
                
                <div className="w-full border-t border-black/10 my-2"></div>
                
                <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wide opacity-70">
                    <span>Issued to: {userName}</span>
                    <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
            </div>
            
            {/* Shiny effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none"></div>
        </div>
    );
};
