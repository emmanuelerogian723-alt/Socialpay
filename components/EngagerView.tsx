import React, { useState, useEffect } from 'react';
import { CheckCircle, DollarSign, ExternalLink, ShieldAlert, Trophy, Zap, History, Search, Upload, Lock, CreditCard, Banknote, AlertTriangle, Camera, Plus, Clock } from 'lucide-react';
import { Task, User, Transaction } from '../types';
import { Card, Button, Badge, Input, Select, Modal, BankDetails } from './UIComponents';
import { verifyEngagementProof } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface EngagerViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
  refreshTrigger: number;
}

const EngagerView: React.FC<EngagerViewProps> = ({ user, onUpdateUser, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'wallet' | 'leaderboard' | 'profile'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [verifyingTask, setVerifyingTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{success: boolean, message: string} | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showFeeModal, setShowFeeModal] = useState(false);

  // Load Data
  useEffect(() => {
    const allCampaigns = storageService.getCampaigns();
    const availableTasks: Task[] = allCampaigns.flatMap(c => 
      c.status === 'active' && c.remainingBudget >= c.rewardPerTask ? [{
        id: `task-${c.id}`,
        campaignId: c.id,
        platform: c.platform,
        type: c.type,
        title: c.title,
        reward: c.rewardPerTask,
        status: 'available'
      }] as Task[] : []
    );
    setTasks(availableTasks);
    
    const allTx = storageService.getTransactions();
    setTransactions(allTx.filter(t => t.userId === user.id));

    // Check fee status
    if (user.role === 'engager' && user.verificationStatus === 'unpaid') {
      setShowFeeModal(true);
    }
  }, [refreshTrigger, user.id, user.verificationStatus, user.role]);

  const handlePayEntryFee = () => {
    setIsProcessing(true);
    // Create a pending transaction for the fee
    const feeTx: Transaction = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      amount: 1.00,
      type: 'fee',
      status: 'pending',
      method: 'Bank Transfer',
      details: 'One-time access fee payment (Pending Approval)',
      timestamp: Date.now()
    };
    
    storageService.createTransaction(feeTx);
    
    // Update user status to pending
    const updatedUser: User = { ...user, verificationStatus: 'pending' };
    storageService.updateUser(updatedUser);
    onUpdateUser(updatedUser);
    
    setIsProcessing(false);
    setShowFeeModal(false);
    alert("Payment reported! Please wait for Admin approval.");
  };

  const handleVerify = async () => {
    if (!verifyingTask || !proofText) return;
    
    setIsProcessing(true);
    setVerificationResult(null);

    const aiResult = await verifyEngagementProof(verifyingTask.title, verifyingTask.platform, proofText);

    if (aiResult.isValid) {
      setVerificationResult({ success: true, message: "Verified! Reward added to wallet." });
      
      const newBalance = user.balance + verifyingTask.reward;
      const updatedUser = { ...user, balance: newBalance, xp: user.xp + 50 };
      
      storageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);

      storageService.createTransaction({
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        amount: verifyingTask.reward,
        type: 'earning',
        status: 'completed',
        method: 'System',
        details: `Task: ${verifyingTask.title}`,
        timestamp: Date.now()
      });

      const campaigns = storageService.getCampaigns();
      const campaign = campaigns.find(c => c.id === verifyingTask.campaignId);
      if (campaign) {
        campaign.remainingBudget -= verifyingTask.reward;
        campaign.completedCount += 1;
        if(campaign.remainingBudget < campaign.rewardPerTask) campaign.status = 'completed';
        storageService.updateCampaign(campaign);
      }

      setTasks(prev => prev.filter(t => t.id !== verifyingTask.id));
      
      setTimeout(() => {
        setVerifyingTask(null);
        setProofText('');
        setVerificationResult(null);
      }, 2000);
    } else {
      setVerificationResult({ success: false, message: `Verification Failed: ${aiResult.reason}` });
    }
    
    setIsProcessing(false);
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large. Please upload an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedUser = { ...user, avatar: reader.result as string };
        storageService.updateUser(updatedUser);
        onUpdateUser(updatedUser);
        storageService.createNotification({
          id: Date.now().toString(),
          userId: user.id,
          title: 'Profile Updated',
          message: 'Your profile picture has been updated successfully.',
          type: 'success',
          read: false,
          timestamp: Date.now()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Fee Modal (Blocking)
  if (showFeeModal) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 animate-slide-up">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-soft">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">One-Time Access Fee</h2>
          <p className="text-gray-500 mb-6">
            To ensure quality and prevent spam, we require a small one-time verification fee of <strong>$1.00</strong>.
          </p>
          
          <BankDetails />

          <p className="text-xs text-gray-500 mb-4">
             After making the transfer, click the button below. Your account will be activated upon Admin verification.
          </p>
          
          <Button onClick={handlePayEntryFee} isLoading={isProcessing} className="w-full py-3 text-lg shadow-xl shadow-indigo-200 dark:shadow-none">
             I Have Sent the Payment
          </Button>
        </Card>
      </div>
    );
  }

  // Pending Verification State
  if (user.verificationStatus === 'pending' && user.role === 'engager') {
     return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
           <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Clock className="w-10 h-10" />
           </div>
           <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
           <p className="text-gray-500 max-w-md">
              We have received your fee payment report. The Admin is currently reviewing your transaction. You will be notified once your account is active.
           </p>
           <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Check Status</Button>
        </div>
     );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg transform hover:scale-[1.02] transition-transform">
          <div className="text-indigo-100 text-sm mb-1">Wallet Balance</div>
          <div className="text-2xl font-bold flex items-center">
            <DollarSign className="w-5 h-5 mr-1" />
            {user.balance.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4 transform hover:scale-[1.02] transition-transform">
          <div className="text-gray-500 text-sm mb-1">XP Points</div>
          <div className="text-2xl font-bold flex items-center text-yellow-600">
            <Zap className="w-5 h-5 mr-1 fill-yellow-500" />
            {user.xp}
          </div>
        </Card>
        <Card className="p-4 transform hover:scale-[1.02] transition-transform">
          <div className="text-gray-500 text-sm mb-1">Tasks Done</div>
          <div className="text-2xl font-bold flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-1" />
            {transactions.filter(t => t.type === 'earning').length}
          </div>
        </Card>
        <Card className="p-4 transform hover:scale-[1.02] transition-transform">
          <div className="text-gray-500 text-sm mb-1">Rank</div>
          <div className="text-2xl font-bold flex items-center text-blue-600">
            <Trophy className="w-5 h-5 mr-1" />
            {user.xp > 1000 ? 'Gold' : user.xp > 500 ? 'Silver' : 'Bronze'}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1">
        {(['tasks', 'wallet', 'leaderboard', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap transition-colors rounded-t-lg ${
              activeTab === tab 
              ? 'bg-white dark:bg-gray-800 text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tasks View */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <Search className="w-5 h-5 text-gray-400 ml-2" />
            <Input placeholder="Search tasks by platform..." className="border-none focus:ring-0 bg-transparent shadow-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-full text-center py-20 text-gray-500">
                <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p>No active tasks available right now. Check back later!</p>
              </div>
            ) : tasks.map(task => (
              <Card key={task.id} className="hover:shadow-lg transition-all relative overflow-hidden group border border-gray-100 dark:border-gray-700">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div className="flex items-center space-x-2">
                     <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                        ${task.platform === 'instagram' ? 'bg-pink-100 text-pink-700' : 
                          task.platform === 'youtube' ? 'bg-red-100 text-red-700' :
                          task.platform === 'tiktok' ? 'bg-black text-white' :
                          'bg-blue-100 text-blue-700'}`}>
                        {task.platform}
                     </span>
                     <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded capitalize">{task.type}</span>
                  </div>
                  <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800 flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />{task.reward.toFixed(2)}
                  </span>
                </div>
                
                <h3 className="font-semibold text-base mb-4 pl-2 pr-2 line-clamp-2 min-h-[3rem] flex items-center">{task.title}</h3>
                
                <div className="flex space-x-2 pl-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs py-2"
                    onClick={() => window.open(`https://${task.platform}.com`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Link
                  </Button>
                  <Button 
                    className="flex-1 text-xs py-2 bg-indigo-600 hover:bg-indigo-700" 
                    onClick={() => setVerifyingTask(task)}
                  >
                    Earn ${task.reward.toFixed(2)}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Wallet View */}
      {activeTab === 'wallet' && (
        <div className="animate-slide-up">
          <WalletSection 
            user={user} 
            transactions={transactions} 
            onUpdateUser={onUpdateUser}
            onWithdrawRequest={(amount, method, details) => {
              const newTx: Transaction = {
                id: Date.now().toString(),
                userId: user.id,
                userName: user.name,
                amount: amount,
                type: 'withdrawal',
                status: 'pending',
                method: method,
                details: details,
                timestamp: Date.now()
              };
              storageService.createTransaction(newTx);
              const updatedUser = { ...user, balance: user.balance - amount };
              storageService.updateUser(updatedUser);
              onUpdateUser(updatedUser);
              setTransactions([newTx, ...transactions]);
            }} 
          />
        </div>
      )}

      {/* Profile View */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto animate-slide-up">
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 -m-6 mb-6"></div>
            
            <div className="flex flex-col items-center -mt-16 mb-6">
              <div className="relative group">
                <img 
                  src={user.avatar} 
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-lg bg-white" 
                  alt="Avatar" 
                />
                <label className="absolute bottom-0 right-2 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg hover:scale-110 transform">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} />
                </label>
              </div>
              <h2 className="text-2xl font-bold mt-4">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <div className="mt-2 flex items-center space-x-2">
                 <Badge color={user.verificationStatus === 'verified' ? 'green' : 'red'}>
                    {user.verificationStatus === 'verified' ? 'Verified Member' : 'Pending Verification'}
                 </Badge>
                 <Badge color="yellow">XP: {user.xp}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
               <div className="space-y-4">
                 <div>
                   <label className="text-sm font-medium text-gray-500">Bio</label>
                   <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                     {user.bio || "No bio yet. Add one in Settings!"}
                   </div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-gray-500">Member Since</label>
                   <div className="font-semibold">{new Date(user.joinedAt).toLocaleDateString()}</div>
                 </div>
               </div>
               
               <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <Trophy className="w-8 h-8 text-indigo-500 mb-2" />
                  <div className="font-bold text-lg">Current Rank</div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xl uppercase tracking-wider">
                    {user.xp > 1000 ? 'Gold' : user.xp > 500 ? 'Silver' : 'Bronze'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Earn {500 - (user.xp % 500)} more XP to level up!</p>
               </div>
            </div>
            
            <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6 text-center">
               <label className="inline-flex flex-col items-center justify-center w-full p-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload new avatar</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG or GIF (MAX. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} />
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* Leaderboard View (Simple Mock) */}
      {activeTab === 'leaderboard' && (
        <Card className="max-w-2xl mx-auto text-center py-10 animate-slide-up">
           <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce-soft" />
           <h2 className="text-xl font-bold">Weekly Leaderboard</h2>
           <p className="text-gray-500 mb-6">Competitions start every Monday. Earn XP to climb the ranks!</p>
           <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 rounded-lg border border-yellow-100 dark:border-yellow-800 shadow-sm">
                 <div className="flex items-center space-x-4">
                    <span className="font-bold text-yellow-600 text-xl w-6">1</span>
                    <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                    <span className="font-bold text-lg">Top Earner</span>
                 </div>
                 <Badge color="yellow">2500 XP</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                 <div className="flex items-center space-x-4">
                    <span className="font-bold text-gray-400 text-xl w-6">2</span>
                    <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                    <span className="font-medium">Social Guru</span>
                 </div>
                 <span className="font-bold text-gray-600">1800 XP</span>
              </div>
           </div>
        </Card>
      )}

      {/* Verification Modal */}
      <Modal 
        isOpen={!!verifyingTask} 
        onClose={() => { setVerifyingTask(null); setVerificationResult(null); }}
        title={`Verify Task: ${verifyingTask?.platform}`}
      >
            <p className="text-sm text-gray-500 mb-4">{verifyingTask?.title}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Proof of Work</label>
              <Input 
                placeholder="Paste link to your comment or profile..." 
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste the URL of your post, comment, or screenshot link.
              </p>
            </div>

            {verificationResult && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${verificationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <div className="flex items-center">
                  {verificationResult.success ? <CheckCircle className="w-4 h-4 mr-2"/> : <ShieldAlert className="w-4 h-4 mr-2"/>}
                  {verificationResult.message}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="ghost" onClick={() => { setVerifyingTask(null); setVerificationResult(null); }}>Cancel</Button>
              <Button onClick={handleVerify} isLoading={isProcessing} disabled={!proofText}>
                Submit Proof
              </Button>
            </div>
      </Modal>
    </div>
  );
};

// --- Sub Component: Wallet Section ---
const WalletSection: React.FC<{ 
  user: User; 
  transactions: Transaction[];
  onUpdateUser: (u: User) => void;
  onWithdrawRequest: (amount: number, method: string, details: string) => void 
}> = ({ user, transactions, onUpdateUser, onWithdrawRequest }) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [method, setMethod] = useState('Bank Transfer');
  const [country, setCountry] = useState('Nigeria');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositRef, setDepositRef] = useState('');

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount.");
    if (amt > user.balance) return alert("Insufficient funds");
    if (amt < 5) return alert("Minimum withdrawal is $5.00");
    setShowConfirm(true);
  };

  const confirmWithdrawal = () => {
    setShowConfirm(false);
    setLoading(true);
    const amt = parseFloat(withdrawAmount);
    setTimeout(() => {
      const details = method === 'Crypto (USDT)' 
        ? `Wallet: ${accountNumber} (Network: TRC20)`
        : `${bankName} - ${accountNumber}, Country: ${country}`;
      
      onWithdrawRequest(amt, method, details);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setLoading(false);
    }, 1000);
  };

  const handleDeposit = () => {
     if(!depositAmount || !depositRef) return alert("Please fill in all details");
     
     const tx: Transaction = {
       id: Date.now().toString(),
       userId: user.id,
       userName: user.name,
       amount: parseFloat(depositAmount),
       type: 'deposit',
       status: 'pending',
       method: 'Bank Transfer',
       details: `Ref/Name: ${depositRef}`,
       timestamp: Date.now()
     };

     storageService.createTransaction(tx);
     setShowDepositModal(false);
     setDepositAmount('');
     setDepositRef('');
     alert("Deposit request submitted! Funds will be added after Admin approval.");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-none">
           <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-200 text-sm mb-1">Available Balance</p>
                <h2 className="text-4xl font-bold">${user.balance.toFixed(2)}</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setShowDepositModal(true)}>
                 <Plus className="w-4 h-4 mr-1" /> Add Funds
              </Button>
           </div>
           <p className="text-xs text-indigo-300 mt-4">
             Funds can be used to purchase Gigs or withdrawn to your bank.
           </p>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Banknote className="w-5 h-5 mr-2 text-green-600" /> Request Withdrawal
          </h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <Input 
                  type="number" 
                  min="5" 
                  step="0.01" 
                  max={user.balance}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  required
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Min: $5.00</span>
                <span>Max: ${user.balance.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <Select value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Bank Transfer</option>
                  <option>PayPal</option>
                  <option>Crypto (USDT)</option>
                  <option>Mobile Money</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Select value={country} onChange={e => setCountry(e.target.value)}>
                  <option>Nigeria</option>
                  <option>Ghana</option>
                  <option>Kenya</option>
                  <option>South Africa</option>
                  <option>United States</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {method === 'PayPal' ? 'Email' : method === 'Crypto (USDT)' ? 'Wallet Address' : 'Bank Name'}
              </label>
              <Input 
                  placeholder={method === 'Bank Transfer' ? 'e.g., Access Bank' : 'Enter detail...'} 
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  required={method === 'Bank Transfer'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <Input 
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={loading} disabled={user.balance < 5}>
              Request Withdrawal
            </Button>
          </form>
        </Card>
      </div>
      
      <Card className="h-full flex flex-col">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <History className="w-5 h-5 mr-2" /> Transaction History
        </h3>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 min-h-[300px]">
          {transactions.length === 0 && <p className="text-gray-500 text-center py-10">No transactions yet.</p>}
          {transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    tx.status === 'completed' ? 'bg-green-500' : tx.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'
                  }`}></span>
                  <span className="text-sm font-medium capitalize">
                    {tx.type}
                  </span>
                </div>
                <div className="text-xs text-gray-400 pl-4">{new Date(tx.timestamp).toLocaleString()}</div>
                {tx.status === 'pending' && <div className="text-xs text-orange-500 pl-4 font-medium">Awaiting Approval</div>}
              </div>
              <div className={`font-bold ${
                tx.type === 'earning' || tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'
              }`}>
                {tx.type === 'earning' || tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Withdrawal" maxWidth="max-w-sm">
            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-lg">${parseFloat(withdrawAmount || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium">{method}</span>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg text-xs mt-2 flex items-start">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Funds will be held until Admin approval. Rejected requests are refunded.</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmWithdrawal} className="flex-1">Confirm</Button>
            </div>
      </Modal>

      {/* Deposit Modal */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Add Funds">
         <BankDetails />
         
         <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium mb-1">Amount Deposited ($)</label>
               <Input 
                 type="number" 
                 value={depositAmount} 
                 onChange={e => setDepositAmount(e.target.value)} 
                 placeholder="0.00"
               />
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Sender Name / Ref ID</label>
               <Input 
                 placeholder="Name on bank account" 
                 value={depositRef} 
                 onChange={e => setDepositRef(e.target.value)} 
               />
               <p className="text-xs text-gray-500 mt-1">
                 Please provide the name of the sender so we can track your payment.
               </p>
            </div>
            <Button className="w-full" onClick={handleDeposit}>
               Submit Payment Notification
            </Button>
         </div>
      </Modal>
    </div>
  );
}

export default EngagerView;