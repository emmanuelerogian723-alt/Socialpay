import React, { useState } from 'react';
import { User } from '../types';
import { Card, Button, Input } from './UIComponents';
import { storageService } from '../services/storageService';
import { Save, User as UserIcon, Lock, Bell } from 'lucide-react';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    bio: user.bio || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedUser = { ...user, name: formData.name, bio: formData.bio };
      storageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);
      setLoading(false);
      alert('Profile updated successfully!');
    }, 800);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Password updated successfully (Mock)');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      
      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <UserIcon className="w-5 h-5 mr-2 text-indigo-600" /> Profile Information
        </h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
             <img src={user.avatar} alt="Profile" className="w-16 h-16 rounded-full border-2 border-indigo-100" />
             <div>
                <Button type="button" variant="outline" size="sm">Change Avatar</Button>
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium mb-1">Full Name</label>
             <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
             />
          </div>

          <div>
             <label className="block text-sm font-medium mb-1">Email (Read Only)</label>
             <Input value={user.email} disabled className="bg-gray-100" />
          </div>

          <div>
             <label className="block text-sm font-medium mb-1">Bio</label>
             <textarea 
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                rows={3}
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
             />
          </div>

          <Button type="submit" isLoading={loading}>Save Profile</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2 text-indigo-600" /> Security
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
           <div>
             <label className="block text-sm font-medium mb-1">New Password</label>
             <Input 
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
             />
           </div>
           <div>
             <label className="block text-sm font-medium mb-1">Confirm Password</label>
             <Input 
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
             />
           </div>
           <Button type="submit" variant="secondary" isLoading={loading} disabled={!formData.password}>Update Password</Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2 text-indigo-600" /> Notifications
        </h3>
        <div className="space-y-2">
           <label className="flex items-center space-x-2">
             <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" defaultChecked />
             <span className="text-sm">Email Notifications</span>
           </label>
           <label className="flex items-center space-x-2">
             <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" defaultChecked />
             <span className="text-sm">Push Notifications for New Tasks</span>
           </label>
           <label className="flex items-center space-x-2">
             <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" defaultChecked />
             <span className="text-sm">Marketing Updates</span>
           </label>
        </div>
      </Card>
    </div>
  );
};

export default SettingsView;
