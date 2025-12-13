
import React, { useState, useEffect } from 'react';
import { CheckCircle, DollarSign, ExternalLink, ShieldAlert, Trophy, Zap, History, Search, Upload, Lock, CreditCard, Banknote, AlertTriangle, Camera, Plus, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { Task, User, Transaction, Platform, TaskType } from '../types';
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
  
  // Verification Modal Inputs
  const [verifyHandle, setVerifyHandle] = useState('');
  const [verifyLink, setVerifyLink] = useState('');
  const [verifyImage, setVerifyImage] = useState<string | null>(null);

  // Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [minReward, setMinReward] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'reward_high' | 'reward_low'>('newest');

  // Load Data
  useEffect(() => {
    const loadData = async () => {
        try {
            const allCampaigns = await storageService.getCampaigns();
            // Convert active campaigns to tasks
            const availableTasks: Task[] = allCampaigns.flatMap(c => 
            c.status === 'active' && c.remainingBudget >= c.rewardPerTask ? [{
                id: `task-${c.id}`,
                campaignId: c.id,
                platform: c.platform,
                type: c.type,
                title: c.title,
                reward: c.rewardPerTask,
                status: 'available',
                targetUrl: c.targetUrl
            }] as Task[] : []
            );
            setTasks(availableTasks);
            
            const allTx = await storageService.getTransactions(user.id);
            setTransactions(allTx);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };
    loadData();

    // Check fee status
    if (user.role === 'engager' && user.verificationStatus === 'unpaid') {
      setShowFeeModal(true);
    }
  }, [refreshTrigger, user.id, user.verificationStatus, user.role]);

  // --- FILTERING & SORTING LOGIC ---
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || task.platform === filterPlatform;
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesReward = !minReward || task.reward >= parseFloat(minReward);
    return matchesSearch && matchesPlatform && matchesType && matchesReward;
  }).sort((a, b) => {
    if (sortBy === 'reward_high') return b.reward - a.reward;
    if (sortBy === 'reward_low') return a.reward - b.reward;
    return 0; 
  });

  const handlePayEntryFee = async () => {
    setIsProcessing(true);
    const feeTx: Transaction = {
      id: '',
      userId: user.id,
      userName: user.name,
      amount: 1.00,
      type: 'fee',
      status: 'pending',
      method: 'Bank Transfer',
      details: 'One-time access fee payment (Pending Approval)',
      timestamp: Date.now()
    };
    
    await storageService.createTransaction(feeTx);
    
    // Update user status
    const updatedUser = { ...user, verificationStatus: 'pending' as const };
    await storageService.updateUser(updatedUser);
    onUpdateUser(updatedUser);
    
    setIsProcessing(false);
    setShowFeeModal(false);
    alert("Payment reported! Please wait for Admin approval.");
  };

  const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
      setIsProcessing(true);
      // Upload to Supabase Storage
      storageService.uploadMedia(file).then(url => {
          setVerifyImage(url);
          setIsProcessing(false);
      }).catch(err => {
          alert("Upload failed");
          setIsProcessing(false);
      });
    }
  };

  const handleVerify = async () => {
    if (!verifyingTask) return;
    
    const proofContext = `
      User Handle: ${verifyHandle}
      Proof Link: ${verifyLink}
      Additional Notes: ${proofText}
      ${verifyImage ? '(User uploaded a screenshot)' : '(No screenshot)'}
    `;

    setIsProcessing(true);
    setVerificationResult(null);

    // Call AI Check
    const aiResult = await verifyEngagementProof(verifyingTask.title, verifyingTask.platform, proofContext);

    if (aiResult.isValid) {
      setVerificationResult({ success: true, message: "Verified! Reward added to wallet." });
      
      const newBalance = user.balance + verifyingTask.reward;
      const updatedUser = { ...user, balance: newBalance, xp: user.xp + 50 };
      
      await storageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);

      await storageService.createTransaction({
        id: '',
        userId: user.id,
        userName: user.name,
        amount: verifyingTask.reward,
        type: 'earning',
        status: 'completed',
        method: 'System',
        details: `Task: ${verifyingTask.title}`,
        timestamp: Date.now()
      });

      // Update Campaign Budget in DB (Simplified for example, ideally logic in backend function)
      // Note: Real apps should handle this transactionally on backend
      setTasks(prev => prev.filter(t => t.id !== verifyingTask.id));
      
      setTimeout(() => {
        closeVerifyModal();
      }, 2000);
    } else {
      setVerificationResult({ success: false, message: `Verification Failed: ${aiResult.reason}` });
    }
    
    setIsProcessing(false);
  };

  const closeVerifyModal = () => {
    setVerifyingTask(null);
    setProofText('');
    setVerifyHandle('');
    setVerifyLink('');
    setVerifyImage(null);
    setVerificationResult(null);
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      storageService.uploadMedia(file).then(async (url) => {
        const updatedUser = { ...user, avatar: url };
        await storageService.updateUser(updatedUser);
        onUpdateUser(updatedUser);
      });
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
          {/* Filters & Sorting */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                   placeholder="Search tasks..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="pl-9 h-10"
                />
              </div>
              <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
                  <Select 
                    value={filterPlatform} 
                    onChange={e => setFilterPlatform(e.target.value)}
                    className="w-32 h-10"
                  >
                      <option value="all">All Platforms</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                  </Select>

                  <Select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="w-32 h-10"
                  >
                      <option value="all">All Actions</option>
                      <option value="like">Like</option>
                      <option value="comment">Comment</option>
                      <option value="follow">Follow</option>
                      <option value="share">Share</option>
                      <option value="view">View</option>
                  </Select>
                  
                  <Select 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-40 h-10 font-medium"
                  >
                      <option value="newest">Newest First</option>
                      <option value="reward_high">Reward: High to Low</option>
                      <option value="reward_low">Reward: Low to High</option>
                  </Select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
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
                  {task.targetUrl && (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-xs py-2"
                        onClick={() => window.open(task.targetUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Open Link
                      </Button>
                  )}
                  <Button 
                    className="flex-1 text-xs py-2 bg-indigo-600 hover:bg-indigo-700" 
                    onClick={() => setVerifyingTask(task)}
                  >
                    Complete & Earn
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
          <WalletSection 
            user={user} 
            transactions={transactions} 
            onUpdateUser={onUpdateUser}
            onWithdrawRequest={async (amount, method, details) => {
                await storageService.createTransaction({
                  id: '',
                  userId: user.id,
                  userName: user.name,
                  amount,
                  type: 'withdrawal',
                  status: 'pending',
                  method,
                  details,
                  timestamp: Date.now()
                });
                const updated = { ...user, balance: user.balance - amount };
                await storageService.updateUser(updated);
                onUpdateUser(updated);
                alert("Withdrawal request submitted for review.");
            }}
          />
      )}

      {/* Verification Modal */}
      <Modal 
        isOpen={!!verifyingTask} 
        onClose={closeVerifyModal}
        title={verificationResult?.success ? 'Task Completed!' : `Verify Task: ${verifyingTask?.platform}`}
        maxWidth="max-w-lg"
      >
        {verificationResult?.success ? (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
             <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Awesome Job!</h3>
             <p className="text-gray-500 dark:text-gray-400 text-center">{verificationResult.message}</p>
             <div className="mt-6 flex items-center space-x-2 text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full">
                <DollarSign className="w-4 h-4" />
                <span>Reward Added</span>
             </div>
          </div>
        ) : (
           <>
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm font-semibold">{verifyingTask?.title}</p>
                <p className="text-xs text-green-600 font-bold mt-1">Reward: ${verifyingTask?.reward.toFixed(2)}</p>
                {verifyingTask?.targetUrl && (
                    <a href={verifyingTask.targetUrl} target="_blank" className="text-xs text-indigo-500 underline block mt-1">
                        Go to Task
                    </a>
                )}
            </div>
            
            <div className="space-y-4">
              <div>
                 <label className="block text-sm font-medium mb-1">Your Social Handle/Username</label>
                 <Input 
                   placeholder="@username" 
                   value={verifyHandle}
                   onChange={e => setVerifyHandle(e.target.value)}
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium mb-1">Link to your Proof (Post/Comment)</label>
                 <Input 
                   placeholder="https://..." 
                   value={verifyLink}
                   onChange={e => setVerifyLink(e.target.value)}
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium mb-1">Upload Screenshot</label>
                 <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                    {verifyImage ? (
                        <div className="relative">
                            <img src={verifyImage} className="max-h-32 mx-auto rounded" />
                            <button onClick={() => setVerifyImage(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"><ShieldAlert className="w-3 h-3"/></button>
                        </div>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Click to upload proof</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleProofImageUpload} />
                        </label>
                    )}
                 </div>
              </div>
              
              {verificationResult && !verificationResult.success && (
                  <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-start animate-slide-up">
                      <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{verificationResult.message}</span>
                  </div>
               )}
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t border-gray-100 dark:border-gray-700 mt-4">
              <Button variant="ghost" onClick={closeVerifyModal}>Cancel</Button>
              <Button onClick={handleVerify} isLoading={isProcessing} disabled={!verifyHandle && !verifyLink && !verifyImage}>
                Submit Proof
              </Button>
            </div>
           </>
        )}
      </Modal>
    </div>
  );
};

// --- Sub Component: Wallet Section ---
const WalletSection: React.FC<{ 
  user: User; 
  transactions: Transaction[];
  onUpdateUser: (u: User) => void;
  onWithdrawRequest: (amount: number, method: string, details: string) => Promise<void> 
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
    if (method === 'Bank Transfer' && (!bankName || !accountNumber)) return alert("Please fill in bank details");
    if (method !== 'Bank Transfer' && !accountNumber) return alert("Please enter wallet address");
    
    setShowConfirm(true);
  };

  const confirmWithdrawal = async () => {
    setLoading(true);
    const amt = parseFloat(withdrawAmount);
    const details = method === 'Crypto (USDT)' 
      ? `Wallet: ${accountNumber} (Network: TRC20)`
      : `${bankName} - ${accountNumber}, Country: ${country}`;
    
    // Process request (simulate delay + API call)
    await new Promise(resolve => setTimeout(resolve, 1000));
    await onWithdrawRequest(amt, method, details);
    
    // Cleanup
    setWithdrawAmount('');
    setBankName('');
    setAccountNumber('');
    setLoading(false);
    setShowConfirm(false);
  };

  const handleDeposit = async () => {
     if(!depositAmount || !depositRef) return alert("Please fill in all details");
     
     const tx: Transaction = {
       id: '',
       userId: user.id,
       userName: user.name,
       amount: parseFloat(depositAmount),
       type: 'deposit',
       status: 'pending',
       method: 'Bank Transfer',
       details: `Ref/Name: ${depositRef}`,
       timestamp: Date.now()
     };

     await storageService.createTransaction(tx);
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
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <Select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Crypto (USDT)">Crypto (USDT)</option>
              </Select>
            </div>

            {method === 'Bank Transfer' ? (
                <>
                   <div>
                     <label className="block text-sm font-medium mb-1">Bank Name</label>
                     <Input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Chase, Access Bank" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Account Number</label>
                     <Input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0000000000" />
                   </div>
                </>
            ) : (
                <div>
                   <label className="block text-sm font-medium mb-1">Wallet Address (TRC20)</label>
                   <Input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="T..." />
                </div>
            )}

            <Button type="submit" className="w-full" disabled={user.balance < 5}>
              Request Withdrawal
            </Button>
          </form>
        </Card>
      </div>
      
      {/* Transaction History */}
      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <History className="w-5 h-5 mr-2 text-gray-500" /> Recent Transactions
        </h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {transactions.length === 0 && <p className="text-gray-500 text-sm">No transactions yet.</p>}
          {transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
               <div>
                 <div className="font-bold text-sm flex items-center">
                    {tx.type === 'earning' && <Zap className="w-3 h-3 mr-1 text-yellow-500" />}
                    {tx.type === 'withdrawal' && <ArrowUpDown className="w-3 h-3 mr-1 text-red-500" />}
                    {tx.type === 'deposit' && <Plus className="w-3 h-3 mr-1 text-green-500" />}
                    <span className="capitalize">{tx.type}</span>
                 </div>
                 <div className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</div>
                 <div className="text-xs text-gray-400 truncate max-w-[150px]">{tx.details}</div>
               </div>
               <div className="text-right">
                  <div className={`font-bold ${
                      tx.type === 'earning' || tx.type === 'deposit' ? 'text-green-600' : 
                      tx.type === 'withdrawal' || tx.type === 'fee' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {tx.type === 'withdrawal' || tx.type === 'fee' ? '-' : '+'}${tx.amount.toFixed(2)}
                  </div>
                  <Badge color={tx.status === 'completed' ? 'green' : tx.status === 'pending' ? 'yellow' : 'red'}>
                    {tx.status}
                  </Badge>
               </div>
            </div>
          ))}
        </div>
      </Card>

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
            </div>
            <Button className="w-full" onClick={handleDeposit}>
               Submit Payment Notification
            </Button>
         </div>
      </Modal>

      <Modal isOpen={showConfirm} onClose={() => !loading && setShowConfirm(false)} title="Confirm Withdrawal">
          <div className="space-y-4">
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg flex items-start">
                  <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <p className="text-sm">Please verify your details carefully. Withdrawals cannot be reversed once processed.</p>
              </div>
              
              <div className="border rounded-lg p-4 space-y-2 bg-gray-50 dark:bg-gray-800">
                  <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-bold text-lg text-red-600">-${parseFloat(withdrawAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-gray-500">Method:</span>
                      <span className="font-medium">{method}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-gray-500">Details:</span>
                      <span className="font-medium text-right break-all pl-4">{method === 'Bank Transfer' ? `${bankName} - ${accountNumber}` : accountNumber}</span>
                  </div>
              </div>

              <div className="flex space-x-3 pt-4">
                  <Button variant="ghost" onClick={() => setShowConfirm(false)} className="flex-1" disabled={loading}>Cancel</Button>
                  <Button onClick={confirmWithdrawal} className="flex-1" isLoading={loading}>Confirm & Withdraw</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
}

export default EngagerView;
