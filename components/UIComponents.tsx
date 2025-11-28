import React from 'react';
import { Loader2, X, Copy, Check } from 'lucide-react';

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

export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' }> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props} 
    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white placeholder-gray-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 transition-colors ${props.className}`} 
  />
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