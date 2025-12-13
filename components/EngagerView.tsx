
import React, { useState, useEffect } from 'react';
import { CheckCircle, DollarSign, ExternalLink, ShieldAlert, Trophy, Zap, History, Search, Upload, Lock, CreditCard, Banknote, AlertTriangle, Camera, Plus, Clock, Filter, ArrowUpDown, User as UserIcon, Mail } from 'lucide-react';
import { Task, User, Transaction, Platform, TaskType } from '../types';
import { Card, Button, Badge, Input, Select, Modal, BankDetails } from './UIComponents';
import { verifyEngagementProof } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { usePaystackPayment } from 'react-paystack';

interface EngagerViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
  refreshTrigger: number;
}

// REPLACE WITH YOUR ACTUAL PUBLIC KEY
const PAYSTACK_PUBLIC_KEY = 'pk_test_392323232323232323232323232323'; 

const EngagerView: React.FC<EngagerViewProps> = ({ user, onUpdateUser, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'wallet' | 'leaderboard' | 'profile'>('profile'); 
  const [tasks, setTasks] = useState<Task[]>([]);
  const [verifyingTask, setVerifyingTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{success: boolean, message: string} | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
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
    // If user is unpaid, default to profile view initially so they aren't confused by empty tasks
    if (user.verificationStatus === 'unpaid' && activeTab === 'tasks') {
        setActiveTab('profile');
    }

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
  }, [refreshTrigger, user.id]);

  const handlePayEntryFeeManual = async () => {
    setIsProcessing(true);
    const feeTx: Transaction = {
      id: '',
      userId: user.id,
      userName: user.name,
      amount: 1.00,
      type: 'fee',
      status: 'pending',
      method: 'External/Bank',
      details: 'One-time access fee payment (Pending Approval)',
      timestamp: Date.now()
    };
    
    await storageService.createTransaction(feeTx);
    const updatedUser = { ...user, verificationStatus: 'pending' as const };
    await storageService.updateUser(updatedUser);
    onUpdateUser(updatedUser);
    
    setIsProcessing(false);
    alert("Payment reported! Dashboard unlocked (Read-Only Wallet).");
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

  const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
      setIsProcessing(true);
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
    setIsProcessing(true);
    setVerificationResult(null);

    const proofContext = `User Handle: ${verifyHandle}\nProof Link: ${verifyLink}\nNotes: ${proofText}\n${verifyImage ? '(Screenshot uploaded)' : ''}`;
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

      setTasks(prev => prev.filter(t => t.id !== verifyingTask.id));
      setTimeout(closeVerifyModal, 2000);
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

  // --- COMPONENT: Fee Payment Card ---
  const FeePaymentContent = () => (
      <Card className="max-w-md mx-auto text-center p-8 animate-slide-up">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">One-Time Access Fee</h2>
          <p className="text-gray-500 mb-6">
            To ensure quality and unlock earning tasks, please pay the <strong>$1.00</strong> (approx ₦1,500) verification fee.
          </p>
          
          <Button 
            onClick={() => window.open('https://paystack.shop/pay/socialpay', '_blank')} 
            isLoading={isProcessing} 
            className="w-full py-3 text-lg shadow-xl shadow-green-200 dark:shadow-none bg-green-600 hover:bg-green-700 mb-4"
          >
             Pay Instantly with Paystack
          </Button>

          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR MANUAL TRANSFER</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          
          <BankDetails />

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 mb-4">
             After completing payment via the Link or Transfer, click the button below to notify Admin for approval.
          </div>

          <Button variant="outline" onClick={handlePayEntryFeeManual} isLoading={isProcessing} className="w-full py-2">
             I Have Paid
          </Button>
      </Card>
  );

  // --- COMPONENT: Locked Wallet ---
  const LockedWalletView = () => (
      <div className="relative">
          <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl text-center border border-yellow-200 max-w-sm">
                  <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Wallet Locked</h3>
                  <p className="text-gray-500 mb-4 text-sm">
                      Your fee payment is pending Admin approval. Withdrawals are disabled until verified.
                  </p>
                  <Button variant="outline" size="sm" disabled>Awaiting Verification</Button>
              </div>
          </div>
          {/* Render Wallet in background (disabled) */}
          <WalletSection 
            user={user} 
            transactions={transactions} 
            onUpdateUser={onUpdateUser}
            onWithdrawRequest={async () => {}}
            isLocked={true}
          />
      </div>
  );

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || task.platform === filterPlatform;
    const matchesType = filterType === 'all' || task.type === filterType;
    return matchesSearch && matchesPlatform && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'reward_high') return b.reward - a.reward;
    if (sortBy === 'reward_low') return a.reward - b.reward;
    return 0; 
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Pending Status Banner */}
      {user.verificationStatus === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-4 rounded-xl flex items-start gap-3 animate-slide-up">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
              <div>
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-400">Verification Pending</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                      You can engage and earn, but withdrawals are locked until Admin confirms your fee.
                  </p>
              </div>
          </div>
      )}

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

      {/* --- TASKS VIEW --- */}
      {activeTab === 'tasks' && (
        user.verificationStatus === 'unpaid' ? (
            <div className="py-8">
                <FeePaymentContent />
            </div>
        ) : (
            <div className="space-y-4 animate-slide-up">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 bg-indigo-600 text-white border-none"><div className="text-indigo-100 text-xs">Balance</div><div className="text-2xl font-bold">${user.balance.toFixed(2)}</div></Card>
                <Card className="p-4"><div className="text-gray-500 text-xs">Tasks</div><div className="text-2xl font-bold text-green-600">{transactions.filter(t => t.type === 'earning').length}</div></Card>
                <Card className="p-4"><div className="text-gray-500 text-xs">XP</div><div className="text-2xl font-bold text-yellow-500">{user.xp}</div></Card>
                <Card className="p-4"><div className="text-gray-500 text-xs">Rank</div><div className="text-2xl font-bold text-blue-500">{user.xp > 1000 ? 'Gold' : 'Silver'}</div></Card>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                <Input placeholder="Search tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1" />
                <Select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="w-32">
                    <option value="all">Platform</option><option value="instagram">IG</option><option value="tiktok">TikTok</option><option value="youtube">YT</option>
                </Select>
            </div>

            {/* Task List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map(task => (
                <Card key={task.id} className="hover:shadow-lg transition-all relative overflow-hidden group border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start mb-3">
                        <Badge color="blue">{task.platform}</Badge>
                        <span className="font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800">
                            ${task.reward.toFixed(2)}
                        </span>
                    </div>
                    <h3 className="font-semibold text-base mb-4 line-clamp-2 min-h-[3rem]">{task.title}</h3>
                    <div className="flex space-x-2">
                        {task.targetUrl && (
                            <Button variant="outline" className="flex-1 text-xs" onClick={() => window.open(task.targetUrl, '_blank')}>
                                <ExternalLink className="w-3 h-3 mr-1" /> Open
                            </Button>
                        )}
                        <Button className="flex-1 text-xs" onClick={() => setVerifyingTask(task)}>
                            Complete
                        </Button>
                    </div>
                </Card>
                ))}
            </div>
            </div>
        )
      )}

      {/* --- WALLET VIEW --- */}
      {activeTab === 'wallet' && (
          user.verificationStatus === 'unpaid' ? (
              <div className="py-8"><FeePaymentContent /></div>
          ) : user.verificationStatus === 'pending' ? (
              <LockedWalletView />
          ) : (
              <WalletSection 
                user={user} 
                transactions={transactions} 
                onUpdateUser={onUpdateUser}
                onWithdrawRequest={async (amount, method, details) => {
                    await storageService.createTransaction({
                      id: '', userId: user.id, userName: user.name, amount, type: 'withdrawal', status: 'pending', method, details, timestamp: Date.now()
                    });
                    onUpdateUser({ ...user, balance: user.balance - amount });
                    alert("Withdrawal request submitted.");
                }}
              />
          )
      )}

      {/* --- PROFILE VIEW (Always Accessible) --- */}
      {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto animate-slide-up">
              <Card className="overflow-hidden mb-6">
                  <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                  <div className="px-6 pb-6 relative">
                      <div className="flex justify-between items-end -mt-12 mb-4">
                          <div className="relative group">
                              <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-white object-cover" />
                              <label className="absolute bottom-0 right-0 bg-gray-900 text-white p-1.5 rounded-full cursor-pointer hover:scale-110 transition-transform">
                                  <Camera className="w-4 h-4" />
                                  <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} />
                              </label>
                          </div>
                          <Badge color={user.verificationStatus === 'verified' ? 'green' : user.verificationStatus === 'pending' ? 'yellow' : 'red'} className="text-sm px-3 py-1">
                              {user.verificationStatus.toUpperCase()}
                          </Badge>
                      </div>
                      
                      <h2 className="text-2xl font-bold">{user.name}</h2>
                      <p className="text-gray-500 text-sm flex items-center mb-4"><Mail className="w-3 h-3 mr-1"/> {user.email}</p>
                      
                      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                          <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Tasks Done</div>
                              <div className="text-xl font-bold">{transactions.filter(t => t.type === 'earning').length}</div>
                          </div>
                          <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Earned</div>
                              <div className="text-xl font-bold text-green-600">
                                  ${transactions.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                              </div>
                          </div>
                      </div>
                  </div>
              </Card>

              {user.verificationStatus === 'unpaid' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                          <div>
                              <h4 className="font-bold text-red-800 dark:text-red-300">Account Unverified</h4>
                              <p className="text-xs text-red-600 dark:text-red-400">Pay the fee to unlock withdrawals and premium tasks.</p>
                          </div>
                      </div>
                      <Button size="sm" variant="danger" onClick={() => setActiveTab('wallet')}>Pay Now</Button>
                  </div>
              )}
          </div>
      )}

      {/* --- LEADERBOARD --- */}
      {activeTab === 'leaderboard' && (
          <div className="text-center py-10 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400 opacity-50" />
              <h3 className="text-xl font-bold">Leaderboard Coming Soon</h3>
              <p>Top earners will be displayed here.</p>
          </div>
      )}

      {/* Verification Modal (Tasks) */}
      <Modal 
        isOpen={!!verifyingTask} 
        onClose={closeVerifyModal}
        title={verificationResult?.success ? 'Task Completed!' : `Verify: ${verifyingTask?.title}`}
        maxWidth="max-w-lg"
      >
        {verificationResult?.success ? (
          <div className="flex flex-col items-center justify-center py-10">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-8 h-8" /></div>
             <h3 className="text-xl font-bold">Success!</h3>
             <p className="text-gray-500 mb-4">{verificationResult.message}</p>
          </div>
        ) : (
           <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  Submit proof that you completed: <strong>{verifyingTask?.title}</strong>
              </div>
              <div><label className="text-sm font-bold block mb-1">Your Handle</label><Input value={verifyHandle} onChange={e => setVerifyHandle(e.target.value)} placeholder="@username"/></div>
              <div><label className="text-sm font-bold block mb-1">Proof Link (Optional)</label><Input value={verifyLink} onChange={e => setVerifyLink(e.target.value)} placeholder="https://..."/></div>
              <div>
                 <label className="text-sm font-bold block mb-1">Screenshot</label>
                 <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer relative">
                    {verifyImage ? <span className="text-green-600 font-bold">Image Selected</span> : <span className="text-gray-400">Click to Upload</span>}
                    <input type="file" className="absolute inset-0 opacity-0" onChange={handleProofImageUpload} accept="image/*" />
                 </div>
              </div>
              {verificationResult && <div className="text-red-500 text-sm font-bold">{verificationResult.message}</div>}
              <Button className="w-full mt-2" onClick={handleVerify} isLoading={isProcessing}>Submit Proof</Button>
           </div>
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
  onWithdrawRequest: (amount: number, method: string, details: string) => Promise<void>;
  isLocked?: boolean;
}> = ({ user, transactions, onUpdateUser, onWithdrawRequest, isLocked = false }) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // Paystack Deposit
  const exchangeRate = 1500;
  const depositKobo = depositAmount ? parseFloat(depositAmount) * exchangeRate * 100 : 0;
  const depositConfig = {
      reference: (new Date()).getTime().toString(),
      email: user.email,
      amount: depositKobo,
      publicKey: PAYSTACK_PUBLIC_KEY,
  };
  const initializeDeposit = usePaystackPayment(depositConfig);

  const onSuccessDeposit = async (reference: any) => {
      const amountUSD = parseFloat(depositAmount);
      const tx: Transaction = {
       id: reference.reference,
       userId: user.id,
       userName: user.name,
       amount: amountUSD,
       type: 'deposit',
       status: 'completed',
       method: 'Paystack Card',
       details: `Wallet Deposit (Ref: ${reference.reference})`,
       timestamp: Date.now()
     };
     await storageService.createTransaction(tx);
     const updatedUser = { ...user, balance: user.balance + amountUSD };
     await storageService.updateUser(updatedUser);
     onUpdateUser(updatedUser);
     setShowDepositModal(false);
     setDepositAmount('');
     alert("Deposit Successful!");
  };

  const handleWithdraw = async (e: React.FormEvent) => {
      e.preventDefault();
      if(isLocked) return;
      const amt = parseFloat(withdrawAmount);
      if(amt > user.balance) return alert("Insufficient funds");
      if(amt < 5) return alert("Min withdrawal $5");
      
      setLoading(true);
      await onWithdrawRequest(amt, method, details);
      setWithdrawAmount('');
      setDetails('');
      setLoading(false);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isLocked ? 'opacity-50 pointer-events-none filter blur-[1px]' : ''}`}>
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-none">
           <div className="flex justify-between items-start">
              <div><p className="text-indigo-200 text-sm mb-1">Available Balance</p><h2 className="text-4xl font-bold">${user.balance.toFixed(2)}</h2></div>
              <Button size="sm" variant="secondary" onClick={() => setShowDepositModal(true)} disabled={isLocked}><Plus className="w-4 h-4 mr-1" /> Add Funds</Button>
           </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center"><Banknote className="w-5 h-5 mr-2 text-green-600" /> Request Withdrawal</h3>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Amount ($)</label><Input type="number" min="5" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required disabled={isLocked} /></div>
            <div><label className="block text-sm font-medium mb-1">Method</label><Select value={method} onChange={e => setMethod(e.target.value)} disabled={isLocked}><option>Bank Transfer</option><option>Crypto (USDT)</option></Select></div>
            <div><label className="block text-sm font-medium mb-1">Details (Acct No / Wallet)</label><Input value={details} onChange={e => setDetails(e.target.value)} required disabled={isLocked} /></div>
            <Button type="submit" className="w-full" disabled={isLocked || loading}>Request Withdrawal</Button>
          </form>
        </Card>
      </div>
      
      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center"><History className="w-5 h-5 mr-2 text-gray-500" /> Transactions</h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center border-b pb-3">
               <div>
                 <div className="font-bold text-sm capitalize">{tx.type}</div>
                 <div className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</div>
               </div>
               <div className="text-right">
                  <div className={`font-bold ${tx.type === 'earning' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'earning' ? '+' : '-'}${tx.amount.toFixed(2)}</div>
                  <Badge color={tx.status === 'completed' ? 'green' : 'yellow'}>{tx.status}</Badge>
               </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Add Funds">
         <div className="space-y-4">
            <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount ($)" />
            <p className="text-xs text-gray-500">Approx: ₦{(parseFloat(depositAmount||'0')*exchangeRate).toLocaleString()}</p>
            <Button className="w-full bg-green-600" onClick={() => initializeDeposit(onSuccessDeposit, ()=>{})} disabled={!depositAmount}>Pay with Paystack</Button>
         </div>
      </Modal>
    </div>
  );
}

export default EngagerView;
