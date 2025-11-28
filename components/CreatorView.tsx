

import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, Eye, PlayCircle, Sparkles, Wallet, Camera, Upload, Trophy, LayoutDashboard, User as UserIcon } from 'lucide-react';
import { Campaign, User, TaskType, Platform, Transaction } from '../types';
import { Card, Button, Input, Select, Badge, Modal, BankDetails } from './UIComponents';
import { generateCampaignInsights } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface CreatorViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const CreatorView: React.FC<CreatorViewProps> = ({ user, onUpdateUser }) => {
  const [view, setView] = useState<'dashboard' | 'create' | 'profile'>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositRef, setDepositRef] = useState('');

  useEffect(() => {
    const myCampaigns = storageService.getCampaigns().filter(c => c.creatorId === user.id);
    setCampaigns(myCampaigns);
  }, [view, user.id]);

  // Form State
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    platform: 'instagram',
    type: 'like',
    rewardPerTask: 0.10,
    totalBudget: 10.00
  });

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if(!newCampaign.title) {
      alert("Please enter a campaign title.");
      return;
    }

    if(!newCampaign.totalBudget || !newCampaign.rewardPerTask) {
      alert("Please set a budget and reward amount.");
      return;
    }

    if (user.balance < newCampaign.totalBudget) {
      alert("Insufficient funds! Please add money to your wallet to launch this campaign.");
      setShowDepositModal(true);
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      creatorId: user.id,
      creatorName: user.name,
      platform: newCampaign.platform as Platform,
      type: newCampaign.type as TaskType,
      title: newCampaign.title,
      description: newCampaign.description || '',
      targetUrl: newCampaign.targetUrl || '',
      rewardPerTask: Number(newCampaign.rewardPerTask),
      totalBudget: Number(newCampaign.totalBudget),
      remainingBudget: Number(newCampaign.totalBudget),
      status: 'active',
      completedCount: 0,
      createdAt: Date.now()
    };

    // Save to DB
    storageService.createCampaign(campaign);
    
    // Deduct Budget
    const updatedUser = { ...user, balance: user.balance - campaign.totalBudget };
    storageService.updateUser(updatedUser);
    onUpdateUser(updatedUser);

    setCampaigns([campaign, ...campaigns]);
    setView('dashboard');
    alert("Campaign launched successfully!");
  };

  const getAiInsight = async (c: Campaign) => {
    setLoadingInsight(true);
    const result = await generateCampaignInsights(c.title, c.platform, c.completedCount);
    setInsight(result);
    setLoadingInsight(false);
  }

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
      };
      reader.readAsDataURL(file);
    }
  };

  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Create New Campaign</h2>
          <Button variant="ghost" onClick={() => setView('dashboard')}>Cancel</Button>
        </div>
        <Card>
          <form onSubmit={handleCreateCampaign} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Campaign Title</label>
              <Input 
                placeholder="e.g., Launch Post Engagement" 
                value={newCampaign.title || ''}
                onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description / Instructions</label>
              <Input 
                placeholder="Instructions for engagers..." 
                value={newCampaign.description || ''}
                onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Link (Post URL)</label>
              <Input 
                placeholder="https://instagram.com/p/..." 
                value={newCampaign.targetUrl || ''}
                onChange={e => setNewCampaign({...newCampaign, targetUrl: e.target.value})}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Platform</label>
                <Select 
                  value={newCampaign.platform}
                  onChange={e => setNewCampaign({...newCampaign, platform: e.target.value as Platform})}
                >
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Action Type</label>
                <Select 
                   value={newCampaign.type}
                   onChange={e => setNewCampaign({...newCampaign, type: e.target.value as TaskType})}
                >
                  <option value="like">Like</option>
                  <option value="follow">Follow</option>
                  <option value="comment">Comment</option>
                  <option value="share">Share</option>
                  <option value="view">View</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cost per Action ($)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0.05"
                  value={newCampaign.rewardPerTask}
                  onChange={e => setNewCampaign({...newCampaign, rewardPerTask: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Budget ($)</label>
                <Input 
                  type="number" 
                  step="5.00" 
                  min="5.00"
                  value={newCampaign.totalBudget}
                  onChange={e => setNewCampaign({...newCampaign, totalBudget: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Estimated Reach</span>
                <span className="font-bold">{Math.floor((newCampaign.totalBudget || 0) / (newCampaign.rewardPerTask || 1))} Engagements</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-75 border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                <span>Wallet Balance: ${user.balance.toFixed(2)}</span>
                {user.balance < (newCampaign.totalBudget || 0) && (
                   <span className="text-red-500 font-bold">Insufficient Funds</span>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={user.balance < (newCampaign.totalBudget || 0)}>
              {user.balance < (newCampaign.totalBudget || 0) ? 'Add Funds to Launch' : 'Launch Campaign & Pay'}
            </Button>
            {user.balance < (newCampaign.totalBudget || 0) && (
              <p className="text-center text-sm text-indigo-600 cursor-pointer hover:underline" onClick={() => setShowDepositModal(true)}>
                Click here to add funds via Bank Transfer
              </p>
            )}
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold">Creator Portal</h1>
           <p className="text-gray-500 text-sm">Manage your campaigns and growth</p>
        </div>
        <div className="flex items-center space-x-2">
           <Button variant="outline" onClick={() => setView('profile')}>
             <UserIcon className="w-4 h-4 mr-2"/> My Profile
           </Button>
           <Button onClick={() => setView('create')}>
             <Plus className="w-4 h-4 mr-2" /> New Campaign
           </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-1">
        <button 
           onClick={() => setView('dashboard')} 
           className={`px-4 py-2 text-sm font-medium flex items-center ${view === 'dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
           <LayoutDashboard className="w-4 h-4 mr-2"/> Dashboard
        </button>
        <button 
           onClick={() => setView('profile')} 
           className={`px-4 py-2 text-sm font-medium flex items-center ${view === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
        >
           <UserIcon className="w-4 h-4 mr-2"/> Profile
        </button>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none">
                    <div className="text-blue-100 text-sm mb-1">Active Campaigns</div>
                    <div className="text-3xl font-bold">{campaigns.filter(c => c.status === 'active').length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-gray-500 text-sm mb-1">Total Engagement</div>
                    <div className="text-3xl font-bold flex items-center text-indigo-600">
                        <TrendingUp className="w-6 h-6 mr-1" />
                        {campaigns.reduce((acc, c) => acc + c.completedCount, 0)}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-gray-500 text-sm mb-1">Budget Spent</div>
                    <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                        ${(campaigns.reduce((acc, c) => acc + (c.totalBudget - c.remainingBudget), 0)).toFixed(2)}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Your Campaigns</h3>
                        {campaigns.length === 0 && <p className="text-gray-500">No campaigns yet. Create one!</p>}
                        {campaigns.map(c => (
                        <Card key={c.id} className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                                <Badge color={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
                                <span className="font-semibold text-gray-900 dark:text-white">{c.title}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {c.platform} • {c.type} • ${c.rewardPerTask}/action
                            </div>
                            </div>
                            <div className="text-center md:text-right px-4">
                                <div className="text-2xl font-bold">{c.completedCount}</div>
                                <div className="text-xs text-gray-500">Completions</div>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <Button variant="outline" size="sm" onClick={() => getAiInsight(c)}>
                                <Sparkles className="w-3 h-3 mr-1" /> AI Insight
                                </Button>
                            </div>
                        </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <Card className="bg-gradient-to-b from-indigo-600 to-purple-700 text-white h-full">
                        <h3 className="font-bold mb-4 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2" /> AI Assistant
                        </h3>
                        <p className="text-indigo-100 text-sm mb-4">
                        Get real-time suggestions on how to improve your campaign ROI.
                        </p>
                        
                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm min-h-[150px] flex items-center justify-center mb-4">
                        {loadingInsight ? (
                            <div className="animate-pulse">Analyzing campaign data...</div>
                        ) : insight ? (
                            <p className="text-sm italic">"{insight}"</p>
                        ) : (
                            <p className="text-sm text-indigo-200 text-center">Select a campaign to generate insights.</p>
                        )}
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-white/20">
                        <div className="text-xs uppercase tracking-wider text-indigo-200 mb-2 flex items-center">
                            <Wallet className="w-4 h-4 mr-1"/> Wallet Balance
                        </div>
                        <div className="text-3xl font-bold">${user.balance.toFixed(2)}</div>
                        <Button className="w-full mt-4 bg-white text-indigo-600 hover:bg-indigo-50 font-bold" onClick={() => setShowDepositModal(true)}>
                            Add Funds
                        </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
      )}

      {view === 'profile' && (
          <div className="max-w-3xl mx-auto animate-slide-up">
              <Card className="overflow-hidden mb-6">
                <div className="h-40 bg-gradient-to-r from-purple-500 to-indigo-600 -m-6 mb-6"></div>
                
                <div className="flex flex-col items-center -mt-20 mb-6">
                    <div className="relative group">
                        <img 
                            src={user.avatar} 
                            className="w-36 h-36 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-lg bg-white" 
                            alt="Avatar" 
                        />
                        <label className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg hover:scale-110 transform">
                            <Camera className="w-5 h-5" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} />
                        </label>
                    </div>
                    <h2 className="text-3xl font-bold mt-4">{user.name}</h2>
                    <p className="text-gray-500">{user.email}</p>
                    <div className="mt-3 flex space-x-2">
                        <Badge color="yellow" className="text-sm px-3 py-1">Creator Account</Badge>
                        <Badge color={user.verificationStatus === 'verified' ? 'green' : 'gray'} className="text-sm px-3 py-1">
                            {user.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <div className="text-gray-500 text-sm">Campaigns Run</div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{campaigns.length}</div>
                    </div>
                    <div className="text-center border-l border-r border-gray-100 dark:border-gray-700">
                        <div className="text-gray-500 text-sm">Total Spent</div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                             ${(campaigns.reduce((acc, c) => acc + (c.totalBudget - c.remainingBudget), 0)).toFixed(0)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-500 text-sm">Engagement Generated</div>
                        <div className="text-2xl font-bold text-indigo-600">
                            {campaigns.reduce((acc, c) => acc + c.completedCount, 0)}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 -m-6 mt-0 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold mb-2">About</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {user.bio || "No bio added yet. Go to Settings to update your profile description."}
                    </p>
                </div>
              </Card>

              {/* Campaign Performance Section */}
              <Card className="mb-6">
                 <h3 className="font-bold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-600"/> Campaign Performance
                 </h3>
                 <div className="space-y-4">
                     {campaigns.length === 0 && <p className="text-gray-500 text-sm">No campaigns to track.</p>}
                     {campaigns.map(c => {
                         const progress = Math.min(100, Math.round(((c.totalBudget - c.remainingBudget) / c.totalBudget) * 100));
                         return (
                             <div key={c.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                                 <div className="flex justify-between items-center mb-2">
                                     <div className="text-sm font-bold">{c.title}</div>
                                     <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                         {progress}% Complete
                                     </div>
                                 </div>
                                 <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden mb-1">
                                    <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                 </div>
                                 <div className="flex justify-between text-xs text-gray-500">
                                     <span>{c.completedCount} Engagements</span>
                                     <span>${c.remainingBudget.toFixed(2)} Remaining</span>
                                 </div>
                             </div>
                         )
                     })}
                 </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <h3 className="font-bold mb-4 flex items-center">
                          <Wallet className="w-5 h-5 mr-2 text-indigo-600"/> Financial Overview
                      </h3>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-sm text-gray-500">Current Balance</span>
                              <span className="font-bold">${user.balance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-sm text-gray-500">Total Deposited</span>
                              <span className="font-bold">$0.00</span> 
                          </div>
                          <Button className="w-full mt-2" onClick={() => setShowDepositModal(true)}>Add Funds</Button>
                      </div>
                  </Card>
                  
                  <Card className="flex flex-col justify-center items-center text-center p-8">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-4">
                          <Upload className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-lg mb-2">Update Avatar</h3>
                      <p className="text-sm text-gray-500 mb-4">
                          Keep your brand fresh by updating your profile picture regularly.
                      </p>
                      <label className="btn btn-primary cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                          Choose Image
                          <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} />
                      </label>
                  </Card>
              </div>
          </div>
      )}

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
};

export default CreatorView;
