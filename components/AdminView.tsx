
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, DollarSign, Check, X, Bell, RefreshCw, Edit, Lock, Wallet, ArrowDownLeft, FileText, Trash2, Download, BarChart2, Layers, Briefcase } from 'lucide-react';
import { Card, Button, Badge, Input, Select } from './UIComponents';
import { storageService } from '../services/storageService';
import { Transaction, User, Campaign, Video, Gig } from '../types';

const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'reports'>('dashboard');
  
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Content Moderation State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  
  // Wallet Management Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');
  
  // Reports State
  const [reportType, setReportType] = useState('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setIsRefreshing(true);
    setUsers(await storageService.getUsers());
    setTransactions(await storageService.getTransactions());
    setCampaigns(await storageService.getCampaigns());
    setVideos(await storageService.getVideos());
    setGigs(await storageService.getGigs());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();
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
                 message: 'Your payment was received. Welcome to Social Pay!',
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

  const generateCSV = () => {
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="w-6 h-6 mr-2 text-red-600" /> Admin Dashboard
        </h1>
        <div className="flex space-x-2">
            <Button onClick={loadData} variant="outline" disabled={isRefreshing}>
               <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
        </div>
      </div>

      {/* Admin Nav */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-1">
        <button 
           onClick={() => setActiveTab('dashboard')} 
           className={`px-4 py-2 text-sm font-medium ${activeTab === 'dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
           Dashboard & Finance
        </button>
        <button 
           onClick={() => setActiveTab('content')} 
           className={`px-4 py-2 text-sm font-medium ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
           Content Moderation
        </button>
        <button 
           onClick={() => setActiveTab('reports')} 
           className={`px-4 py-2 text-sm font-medium ${activeTab === 'reports' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
           Reports
        </button>
      </div>

      {activeTab === 'dashboard' && (
      <div className="space-y-8 animate-fade-in">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Total Users</div>
              <div className="text-2xl font-bold">{users.length}</div>
           </Card>
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Pending Requests</div>
              <div className="text-2xl font-bold text-orange-400">{pendingWithdrawals.length + pendingDeposits.length}</div>
           </Card>
           <Card className="p-4 bg-gray-800 text-white border-none">
              <div className="text-gray-400 text-sm">Total Revenue (Fees)</div>
              <div className="text-2xl font-bold text-green-400">
                 ${transactions.filter(t => t.type === 'fee' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
              </div>
           </Card>
        </div>

        {/* Pending Deposits & Fees */}
        <Card>
           <h2 className="text-lg font-bold mb-4 flex items-center text-green-600">
              <ArrowDownLeft className="w-5 h-5 mr-2" /> Pending Deposits / Payments
           </h2>
           <div className="overflow-x-auto">
              <table className="w-full text-sm">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                       <th className="p-3">User</th>
                       <th className="p-3">Type</th>
                       <th className="p-3">Amount</th>
                       <th className="p-3">Reference</th>
                       <th className="p-3">Action</th>
                    </tr>
                 </thead>
                 <tbody>
                    {pendingDeposits.length === 0 && (
                       <tr><td colSpan={5} className="p-4 text-center text-gray-500">No pending deposits.</td></tr>
                    )}
                    {pendingDeposits.map(tx => (
                       <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-3 font-medium">{tx.userName}</td>
                          <td className="p-3">
                             <Badge color={tx.type === 'fee' ? 'yellow' : 'blue'}>{tx.type.toUpperCase()}</Badge>
                          </td>
                          <td className="p-3 font-bold">${tx.amount.toFixed(2)}</td>
                          <td className="p-3 text-xs text-gray-500 max-w-xs truncate">{tx.details}</td>
                          <td className="p-3 flex space-x-2">
                             <Button size="sm" variant="secondary" onClick={() => tx.type === 'fee' ? handleApproveFee(tx.id) : handleApproveDeposit(tx.id)}>
                                <Check className="w-3 h-3 mr-1" /> Confirm
                             </Button>
                             <Button size="sm" variant="danger" onClick={() => storageService.updateTransactionStatus(tx.id, 'rejected')}>
                                <X className="w-3 h-3" />
                             </Button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </Card>

        {/* Pending Withdrawals */}
        <Card>
           <h2 className="text-lg font-bold mb-4 flex items-center text-orange-600">
              <AlertTriangle className="w-5 h-5 mr-2" /> Pending Withdrawals
           </h2>
           <div className="overflow-x-auto">
              <table className="w-full text-sm">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                       <th className="p-3">User</th>
                       <th className="p-3">Amount</th>
                       <th className="p-3">Method</th>
                       <th className="p-3">Details</th>
                       <th className="p-3">Action</th>
                    </tr>
                 </thead>
                 <tbody>
                    {pendingWithdrawals.length === 0 && (
                       <tr><td colSpan={5} className="p-4 text-center text-gray-500">No pending withdrawals.</td></tr>
                    )}
                    {pendingWithdrawals.map(tx => (
                       <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-3 font-medium">{tx.userName}</td>
                          <td className="p-3 font-bold text-red-600">${tx.amount.toFixed(2)}</td>
                          <td className="p-3">{tx.method}</td>
                          <td className="p-3 text-xs text-gray-500 max-w-xs truncate" title={tx.details}>{tx.details}</td>
                          <td className="p-3 flex space-x-2">
                             <Button size="sm" variant="secondary" onClick={() => handleApproveWithdrawal(tx.id)}>
                                <Check className="w-3 h-3 mr-1" /> Approve
                             </Button>
                             <Button size="sm" variant="danger" onClick={() => handleRejectWithdrawal(tx.id)}>
                                <X className="w-3 h-3 mr-1" /> Reject
                             </Button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </Card>

        {/* User Management */}
        <Card>
           <h2 className="text-lg font-bold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" /> User Management
           </h2>
           <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left sticky top-0">
                       <th className="p-3">User</th>
                       <th className="p-3">Role</th>
                       <th className="p-3">Balance</th>
                       <th className="p-3">Verified</th>
                       <th className="p-3">Actions</th>
                    </tr>
                 </thead>
                 <tbody>
                    {users.map(u => (
                       <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-3">
                             <div className="font-medium">{u.name}</div>
                             <div className="text-xs text-gray-500">{u.email}</div>
                          </td>
                          <td className="p-3 capitalize">{u.role}</td>
                          <td className="p-3 font-bold">${u.balance.toFixed(2)}</td>
                          <td className="p-3">
                             <Badge color={u.verificationStatus === 'verified' ? 'green' : u.verificationStatus === 'pending' ? 'yellow' : 'gray'}>
                                {u.verificationStatus}
                             </Badge>
                          </td>
                          <td className="p-3 flex items-center space-x-2">
                             {u.verificationStatus === 'pending' && (
                                <Button size="sm" variant="outline" onClick={() => handleApproveVerification(u.id)}>
                                   Verify
                                </Button>
                             )}
                             <Button size="sm" variant="ghost" onClick={() => setEditingUser(u)}>
                                <Edit className="w-4 h-4" />
                             </Button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </Card>

        {/* Broadcast Message */}
        <Card>
           <h2 className="text-lg font-bold mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" /> Broadcast Notification
           </h2>
           <div className="flex gap-4">
              <Input 
                 placeholder="Type message to send to all users..." 
                 value={broadcastMsg}
                 onChange={e => setBroadcastMsg(e.target.value)}
              />
              <Button onClick={handleBroadcast} disabled={!broadcastMsg}>Send Broadcast</Button>
           </div>
        </Card>
      </div>
      )}

      {/* Content Moderation Tab */}
      {activeTab === 'content' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
             {/* Campaigns */}
             <div className="space-y-4">
                 <h3 className="font-bold flex items-center"><Layers className="w-4 h-4 mr-2"/> Campaigns</h3>
                 {campaigns.length === 0 && <p className="text-gray-500 text-sm">No campaigns found.</p>}
                 {campaigns.map(c => (
                     <Card key={c.id} className="p-3">
                        <div className="flex justify-between items-start">
                           <div>
                              <div className="font-bold text-sm">{c.title}</div>
                              <div className="text-xs text-gray-500">by {c.creatorName}</div>
                              <Badge color="blue" className="mt-1">{c.platform}</Badge>
                           </div>
                           <button onClick={() => handleDeleteCampaign(c.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4"/>
                           </button>
                        </div>
                     </Card>
                 ))}
             </div>

             {/* Reels */}
             <div className="space-y-4">
                 <h3 className="font-bold flex items-center"><FileText className="w-4 h-4 mr-2"/> Reels</h3>
                 {videos.length === 0 && <p className="text-gray-500 text-sm">No videos found.</p>}
                 {videos.map(v => (
                     <Card key={v.id} className="p-3">
                        <div className="flex justify-between items-start">
                           <div className="flex space-x-2">
                              <video src={v.url} className="w-12 h-16 object-cover rounded bg-black" />
                              <div>
                                 <div className="text-xs font-bold line-clamp-1">{v.caption || 'No caption'}</div>
                                 <div className="text-xs text-gray-500">by {v.userName}</div>
                              </div>
                           </div>
                           <button onClick={() => handleDeleteVideo(v.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4"/>
                           </button>
                        </div>
                     </Card>
                 ))}
             </div>

             {/* Gigs */}
             <div className="space-y-4">
                 <h3 className="font-bold flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Marketplace</h3>
                 {gigs.length === 0 && <p className="text-gray-500 text-sm">No gigs found.</p>}
                 {gigs.map(g => (
                     <Card key={g.id} className="p-3">
                        <div className="flex justify-between items-start">
                           <div className="flex space-x-2">
                              <img src={g.image} className="w-12 h-12 object-cover rounded" />
                              <div>
                                 <div className="text-xs font-bold line-clamp-1">{g.title}</div>
                                 <div className="text-xs text-gray-500">${g.price}</div>
                              </div>
                           </div>
                           <button onClick={() => handleDeleteGig(g.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4"/>
                           </button>
                        </div>
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
