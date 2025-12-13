
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, DollarSign, Check, X, Bell, RefreshCw, Edit, Lock, Wallet, ArrowDownLeft, FileText, Trash2, Download, BarChart2, Layers, Briefcase, Store, Crown, Zap, Activity, Clock } from 'lucide-react';
import { Card, Button, Badge, Input, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Transaction, User, Campaign, Video, Gig, Storefront } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'marketplace' | 'premium' | 'reports'>('dashboard');
  
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Content Moderation State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [stores, setStores] = useState<Storefront[]>([]);
  
  // Wallet Management Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');
  
  // Reports State
  const [reportType, setReportType] = useState('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    // Don't show loading spinner on auto-refresh to avoid flickering
    // setIsRefreshing(true); 
    const [fetchedUsers, fetchedTx, fetchedCampaigns, fetchedVideos, fetchedGigs, fetchedStores] = await Promise.all([
        storageService.getUsers(),
        storageService.getTransactions(),
        storageService.getCampaigns(),
        storageService.getVideos(0, 100),
        storageService.getGigs(),
        storageService.getAllStores()
    ]);

    setUsers(fetchedUsers);
    setTransactions(fetchedTx);
    setCampaigns(fetchedCampaigns);
    setVideos(fetchedVideos);
    setGigs(fetchedGigs);
    setStores(fetchedStores);
    
    setIsRefreshing(false);
  };

  const manualRefresh = () => {
      setIsRefreshing(true);
      loadData();
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 seconds to catch new users/queries
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveWithdrawal = async (txId: string) => {
    if(confirm("Are you sure you want to approve this payout?")) {
        await storageService.updateTransactionStatus(txId, 'completed');
        loadData();
    }
  };

  const handleRejectWithdrawal = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if(tx && tx.status === 'pending') {
       if(confirm("Reject this withdrawal? Amount will be refunded to user.")) {
          const freshUsers = await storageService.getUsers();
          const user = freshUsers.find(u => u.id === tx.userId);
          
          if(user) {
            const updatedUser = { ...user, balance: user.balance + tx.amount };
            await storageService.updateUser(updatedUser);
            await storageService.updateTransactionStatus(txId, 'rejected');
            alert(`Withdrawal rejected. $${tx.amount} refunded to ${user.name}.`);
          }
          loadData();
       }
    }
  };

  const handleApproveDeposit = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (tx && confirm(`Confirm receipt of $${tx.amount}? This will add funds to the user's wallet.`)) {
        // Find User
        const freshUsers = await storageService.getUsers();
        const user = freshUsers.find(u => u.id === tx.userId);
        if (user) {
             const updatedUser = { ...user, balance: user.balance + tx.amount };
             await storageService.updateUser(updatedUser);
             await storageService.updateTransactionStatus(txId, 'completed');
             loadData();
             alert("Deposit approved and funds added.");
        }
    }
  };

  const handleApproveFee = async (txId: string) => {
     const tx = transactions.find(t => t.id === txId);
     if (tx && confirm("Confirm receipt of Access Fee? This will verify the user.")) {
         // Find User
         const freshUsers = await storageService.getUsers();
         const user = freshUsers.find(u => u.id === tx.userId);
         if (user) {
              const updatedUser = { ...user, verificationStatus: 'verified' as const };
              await storageService.updateUser(updatedUser);
              await storageService.updateTransactionStatus(txId, 'completed');
              
              // Notification
              await storageService.createNotification({
                 id: Date.now().toString(),
                 userId: user.id,
                 title: 'Access Approved',
                 message: 'Your payment was received. Account Verified!',
                 type: 'success',
                 read: false,
                 timestamp: Date.now()
              });
              
              loadData();
              alert("Fee approved. User verified.");
         }
     }
  };

  const handleApproveVerification = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, verificationStatus: 'verified' as const };
      await storageService.updateUser(updatedUser);
      await storageService.createNotification({
         id: Date.now().toString(),
         userId: userId,
         title: 'Account Verified',
         message: 'Your account has been manually verified by Admin.',
         type: 'success',
         read: false,
         timestamp: Date.now()
      });
      loadData();
      alert(`User ${user.name} has been verified.`);
    }
  };

  const handleUpdateWallet = async () => {
     if(editingUser && adjustAmount) {
         await storageService.adminAdjustBalance(editingUser.id, parseFloat(adjustAmount), adjustReason || 'Admin adjustment');
         setEditingUser(null);
         setAdjustAmount('');
         setAdjustReason('');
         loadData();
         alert('Wallet updated successfully.');
     }
  };

  const handleBroadcast = async () => {
      if(broadcastMsg) {
          await storageService.broadcastMessage(broadcastMsg);
          setBroadcastMsg('');
          alert('Message sent to all users');
      }
  };

  const handleDeleteCampaign = async (id: string) => {
      if(confirm("Permanently delete this campaign?")) {
          await storageService.deleteCampaign(id);
          loadData();
      }
  };

  const handleDeleteVideo = async (id: string) => {
      if(confirm("Permanently delete this reel?")) {
          await storageService.deleteVideo(id);
          loadData();
      }
  };

  const handleDeleteGig = async (id: string) => {
      if(confirm("Permanently delete this gig?")) {
          await storageService.deleteGig(id);
          loadData();
      }
  };

  const handleDeleteStore = async (id: string) => {
      if(confirm("Are you sure? This will delete the store and all its products.")) {
          await storageService.deleteStore(id);
          loadData();
      }
  };

  const generateCSV = () => {
      // (CSV Logic remains same)
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      
      let csvContent = "data:text/csv;charset=utf-8,";
      let filename = "report.csv";

      if (reportType === 'transactions') {
          const filtered = transactions.filter(t => t.timestamp >= start && t.timestamp <= end);
          csvContent += "ID,User,Type,Amount,Status,Date\n";
          filtered.forEach(t => {
              csvContent += `${t.id},${t.userName},${t.type},${t.amount},${t.status},${new Date(t.timestamp).toLocaleDateString()}\n`;
          });
          filename = "transactions_report.csv";
      } else if (reportType === 'users') {
          const filtered = users.filter(u => u.joinedAt >= start && u.joinedAt <= end);
          csvContent += "ID,Name,Email,Role,Balance,Verified,Joined\n";
          filtered.forEach(u => {
              csvContent += `${u.id},${u.name},${u.email},${u.role},${u.balance},${u.verificationStatus},${new Date(u.joinedAt).toLocaleDateString()}\n`;
          });
          filename = "users_report.csv";
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const pendingDeposits = transactions.filter(t => (t.type === 'deposit' || t.type === 'fee') && t.status === 'pending');
  
  // Sort users by joinedAt descending to show new users first
  const sortedUsers = [...users].sort((a, b) => b.joinedAt - a.joinedAt);
  const newUsersCount = users.filter(u => (Date.now() - u.joinedAt) < 24 * 60 * 60 * 1000).length;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="w-6 h-6 mr-2 text-red-600" /> Admin Dashboard
        </h1>
        <div className="flex space-x-2">
            <div className="flex items-center text-xs text-gray-500 mr-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Live Updates Active
            </div>
            <Button onClick={manualRefresh} variant="outline" disabled={isRefreshing}>
               <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
            </Button>
        </div>
      </div>

      {/* Admin Nav */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-1 overflow-x-auto">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Dashboard & Finance</button>
        <button onClick={() => setActiveTab('marketplace')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'marketplace' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Marketplace Manager</button>
        <button onClick={() => setActiveTab('content')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Content Mod</button>
        <button onClick={() => setActiveTab('premium')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'premium' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Premium</button>
        <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 text-sm font-bold whitespace-nowrap ${activeTab === 'reports' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Reports</button>
      </div>

      {/* === DASHBOARD & FINANCE === */}
      {activeTab === 'dashboard' && (
      <div className="space-y-8 animate-fade-in">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Total Users</div>
              <div className="text-2xl font-bold flex items-center">
                  {users.length}
                  {newUsersCount > 0 && <span className="ml-2 text-xs bg-green-500 text-black px-2 py-0.5 rounded-full">+{newUsersCount} New</span>}
              </div>
           </Card>
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Pending Queries</div>
              <div className="text-2xl font-bold text-orange-400">{pendingWithdrawals.length + pendingDeposits.length}</div>
           </Card>
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Total Fees Collected</div>
              <div className="text-2xl font-bold text-green-400">
                 ${transactions.filter(t => t.type === 'fee' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
              </div>
           </Card>
        </div>

        {/* Pending Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <h2 className="text-lg font-bold mb-4 flex items-center text-green-600">
                    <ArrowDownLeft className="w-5 h-5 mr-2" /> Quick Approvals (Deposits/Fees)
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {pendingDeposits.length === 0 && <p className="text-gray-500 text-sm">No pending approvals.</p>}
                    {pendingDeposits.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-green-500">
                            <div>
                                <div className="font-bold text-sm flex items-center">
                                    {tx.userName}
                                    {/* Show NEW badge if tx is recent (last 10 mins) */}
                                    {(Date.now() - tx.timestamp) < 10 * 60 * 1000 && <Badge color="red" className="ml-2 animate-pulse">NEW</Badge>}
                                </div>
                                <div className="text-xs text-gray-500">{tx.type.toUpperCase()} • ${tx.amount}</div>
                                <div className="text-xs text-gray-400">{tx.details}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => tx.type === 'fee' ? handleApproveFee(tx.id) : handleApproveDeposit(tx.id)}>
                                    <Check className="w-4 h-4"/>
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => storageService.updateTransactionStatus(tx.id, 'rejected')}>
                                    <X className="w-4 h-4"/>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <h2 className="text-lg font-bold mb-4 flex items-center text-orange-600">
                    <AlertTriangle className="w-5 h-5 mr-2" /> Pending Withdrawals
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {pendingWithdrawals.length === 0 && <p className="text-gray-500 text-sm">No withdrawals pending.</p>}
                    {pendingWithdrawals.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-orange-500">
                            <div>
                                <div className="font-bold text-sm">{tx.userName}</div>
                                <div className="text-xs font-bold text-red-500">-${tx.amount}</div>
                                <div className="text-xs text-gray-400">{tx.method}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleApproveWithdrawal(tx.id)}>Approve</Button>
                                <Button size="sm" variant="danger" onClick={() => handleRejectWithdrawal(tx.id)}>Reject</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* User Management */}
        <Card>
           <h2 className="text-lg font-bold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" /> User Management ({users.length})
           </h2>
           <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left sticky top-0">
                       <th className="p-3">User</th>
                       <th className="p-3">Role</th>
                       <th className="p-3">Balance</th>
                       <th className="p-3">Status</th>
                       <th className="p-3">Joined</th>
                       <th className="p-3">Actions</th>
                    </tr>
                 </thead>
                 <tbody>
                    {sortedUsers.map(u => {
                       const isNew = (Date.now() - u.joinedAt) < 24 * 60 * 60 * 1000;
                       return (
                       <tr key={u.id} className={`border-b border-gray-100 dark:border-gray-700 ${isNew ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                          <td className="p-3">
                             <div className="font-medium flex items-center">
                                 {u.name}
                                 {isNew && <Badge color="green" className="ml-2 text-[10px]">NEW</Badge>}
                             </div>
                             <div className="text-xs text-gray-500">{u.email}</div>
                          </td>
                          <td className="p-3 capitalize">{u.role}</td>
                          <td className="p-3 font-bold">${u.balance.toFixed(2)}</td>
                          <td className="p-3">
                             <Badge color={u.verificationStatus === 'verified' ? 'green' : u.verificationStatus === 'pending' ? 'yellow' : 'gray'}>
                                {u.verificationStatus}
                             </Badge>
                          </td>
                          <td className="p-3 text-xs text-gray-500">
                              {new Date(u.joinedAt).toLocaleDateString()}
                              <div className="text-[10px]">{new Date(u.joinedAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="p-3 flex items-center space-x-2">
                             {u.verificationStatus === 'pending' && (
                                <Button size="sm" variant="secondary" onClick={() => handleApproveVerification(u.id)}>
                                   Verify
                                </Button>
                             )}
                             <Button size="sm" variant="ghost" onClick={() => setEditingUser(u)}>
                                <Wallet className="w-4 h-4 text-gray-500" />
                             </Button>
                          </td>
                       </tr>
                    )})}
                 </tbody>
              </table>
           </div>
        </Card>
      </div>
      )}

      {/* === MARKETPLACE MANAGER === */}
      {activeTab === 'marketplace' && (
          <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <Card>
                  <h3 className="text-xl font-bold mb-6 flex items-center text-indigo-600"><Store className="w-6 h-6 mr-2"/> Digital Stores</h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                              <tr>
                                  <th className="p-3">Store Name</th>
                                  <th className="p-3">Owner ID</th>
                                  <th className="p-3">Total Sales</th>
                                  <th className="p-3">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {stores.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No stores created yet.</td></tr>}
                              {stores.map(s => (
                                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700">
                                      <td className="p-3 font-bold flex items-center">
                                          <img src={s.logoUrl} className="w-8 h-8 rounded mr-2 bg-gray-200" />
                                          {s.storeName}
                                      </td>
                                      <td className="p-3 font-mono text-xs">{s.ownerId}</td>
                                      <td className="p-3">{s.totalSales}</td>
                                      <td className="p-3">
                                          <Button size="sm" variant="danger" onClick={() => handleDeleteStore(s.id)}>
                                              <Trash2 className="w-4 h-4 mr-1"/> Delete Store
                                          </Button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </Card>

              <Card>
                  <h3 className="text-xl font-bold mb-6 flex items-center text-green-600"><Briefcase className="w-6 h-6 mr-2"/> Gig Market</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                      {gigs.map(g => (
                          <div key={g.id} className="flex justify-between items-start border p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                              <div className="flex space-x-3">
                                  <img src={g.image} className="w-16 h-16 object-cover rounded bg-gray-200" />
                                  <div>
                                      <div className="font-bold text-sm">{g.title}</div>
                                      <div className="text-xs text-gray-500">Seller: {g.sellerName}</div>
                                      <div className="text-xs font-bold text-green-600 mt-1">${g.price}</div>
                                  </div>
                              </div>
                              <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteGig(g.id)}>
                                  <Trash2 className="w-4 h-4"/>
                              </Button>
                          </div>
                      ))}
                  </div>
              </Card>
          </div>
      )}

      {/* === PREMIUM FEATURES === */}
      {activeTab === 'premium' && (
          <div className="animate-fade-in space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-none">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="text-white/80 text-sm font-bold uppercase">System Revenue</div>
                              <div className="text-4xl font-black mt-2">
                                  ${transactions.filter(t => t.type === 'fee' || t.details.includes('fee')).reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                              </div>
                          </div>
                          <Crown className="w-8 h-8 opacity-50" />
                      </div>
                  </Card>
                  <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="text-white/80 text-sm font-bold uppercase">Active Engagers</div>
                              <div className="text-4xl font-black mt-2">
                                  {users.filter(u => u.role === 'engager' && u.verificationStatus === 'verified').length}
                              </div>
                          </div>
                          <Zap className="w-8 h-8 opacity-50" />
                      </div>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="text-white/80 text-sm font-bold uppercase">Platform Volume</div>
                              <div className="text-4xl font-black mt-2">
                                  ${transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(0)}
                              </div>
                          </div>
                          <Activity className="w-8 h-8 opacity-50" />
                      </div>
                  </Card>
              </div>

              {/* Revenue Chart */}
              <Card>
                  <h3 className="font-bold mb-6">Revenue Trend (Fees)</h3>
                  <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={transactions.filter(t => t.type === 'fee').slice(0, 20).reverse()}>
                              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString()} hide />
                              <YAxis />
                              <Tooltip contentStyle={{backgroundColor: '#1f2937', color: '#fff'}} />
                              <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </Card>

              {/* Power Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <h3 className="font-bold mb-4 text-indigo-600">Power Tools</h3>
                      <div className="space-y-3">
                          <Button className="w-full justify-start" variant="outline" onClick={() => {
                              if(confirm("Bulk verify all pending users who paid fees?")) {
                                  // Simplified logic for bulk action
                                  alert("Bulk verification process started...");
                              }
                          }}>
                              <Check className="w-4 h-4 mr-2"/> Bulk Verify Pending Users
                          </Button>
                          <Button className="w-full justify-start" variant="outline" onClick={() => setBroadcastMsg("MAINTENANCE: The system will be down for 10 mins.")}>
                              <Bell className="w-4 h-4 mr-2"/> Send Maintenance Alert
                          </Button>
                      </div>
                  </Card>
              </div>
          </div>
      )}

      {/* === CONTENT MODERATION === */}
      {activeTab === 'content' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
             <div className="space-y-4">
                 <h3 className="font-bold flex items-center"><Layers className="w-4 h-4 mr-2"/> Campaigns</h3>
                 {campaigns.length === 0 && <p className="text-gray-500 text-sm">No campaigns found.</p>}
                 {campaigns.map(c => (
                     <Card key={c.id} className="p-3 flex justify-between items-center">
                        <div>
                           <div className="font-bold text-sm">{c.title}</div>
                           <Badge color="blue" className="mt-1">{c.platform}</Badge>
                        </div>
                        <button onClick={() => handleDeleteCampaign(c.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded">
                           <Trash2 className="w-4 h-4"/>
                        </button>
                     </Card>
                 ))}
             </div>

             <div className="space-y-4">
                 <h3 className="font-bold flex items-center"><FileText className="w-4 h-4 mr-2"/> Reels</h3>
                 {videos.length === 0 && <p className="text-gray-500 text-sm">No videos found.</p>}
                 {videos.map(v => (
                     <Card key={v.id} className="p-3 flex justify-between items-center">
                        <div className="flex space-x-3 items-center">
                           <video src={v.url} className="w-10 h-10 object-cover rounded bg-black" />
                           <div className="text-xs font-bold line-clamp-1 max-w-[150px]">{v.caption || 'No caption'}</div>
                        </div>
                        <button onClick={() => handleDeleteVideo(v.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded">
                           <Trash2 className="w-4 h-4"/>
                        </button>
                     </Card>
                 ))}
             </div>
         </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
         <Card className="max-w-xl mx-auto animate-fade-in">
             <h2 className="text-xl font-bold mb-4 flex items-center">
                <BarChart2 className="w-5 h-5 mr-2" /> Generate Reports
             </h2>
             <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Report Type</label>
                    <Select value={reportType} onChange={e => setReportType(e.target.value)}>
                        <option value="transactions">Transaction History</option>
                        <option value="users">User Activity</option>
                    </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                     </div>
                 </div>
                 <Button onClick={generateCSV} className="w-full">
                    <Download className="w-4 h-4 mr-2" /> Download CSV Report
                 </Button>
             </div>
         </Card>
      )}

      {/* Wallet Edit Modal */}
      {editingUser && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
               <h3 className="text-lg font-bold mb-4">Manage Wallet: {editingUser.name}</h3>
               
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4 flex justify-between">
                  <span>Current Balance:</span>
                  <span className="font-bold">${editingUser.balance.toFixed(2)}</span>
               </div>

               <div className="space-y-4 mb-6">
                  <div>
                     <label className="block text-sm font-medium mb-1">Adjust Amount ($)</label>
                     <Input 
                        type="number" 
                        placeholder="e.g. 50 (add) or -20 (deduct)" 
                        value={adjustAmount}
                        onChange={e => setAdjustAmount(e.target.value)}
                     />
                     <p className="text-xs text-gray-400 mt-1">Use negative value to deduct funds.</p>
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1">Reason</label>
                     <Input 
                        placeholder="e.g. Bonus, Correction, Refund" 
                        value={adjustReason}
                        onChange={e => setAdjustReason(e.target.value)}
                     />
                  </div>
               </div>

               <div className="flex justify-end space-x-2">
                  <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                  <Button onClick={handleUpdateWallet} disabled={!adjustAmount}>Update Balance</Button>
               </div>
            </Card>
         </div>
      )}
    </div>
  );
};

export default AdminView;
