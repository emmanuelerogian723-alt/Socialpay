
import React, { useState, useEffect } from 'react';
import { User, CommunityPost } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button } from './UIComponents';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon } from 'lucide-react';

interface CommunityViewProps {
  user: User;
}

const CommunityView: React.FC<CommunityViewProps> = ({ user }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = () => {
    setPosts(storageService.getCommunityPosts());
  };

  const handleCreatePost = () => {
    if (!newContent.trim()) return;

    const post: CommunityPost = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: newContent,
      image: newImage || undefined,
      likes: 0,
      comments: 0,
      timestamp: Date.now(),
      likedBy: []
    };

    storageService.createCommunityPost(post);
    setNewContent('');
    setNewImage(null);
    loadPosts();
  };

  const handleLike = (postId: string) => {
    storageService.likeCommunityPost(postId, user.id);
    loadPosts();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setNewImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex space-x-3">
                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                    <textarea 
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-lg min-h-[80px] text-gray-900 dark:text-gray-100 placeholder-gray-400" 
                        placeholder="What's happening?"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                    ></textarea>
                    
                    {newImage && (
                        <div className="relative mb-3">
                            <img src={newImage} className="rounded-lg max-h-64 w-full object-cover" />
                            <button onClick={() => setNewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">✕</button>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex space-x-2">
                             <label className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full cursor-pointer transition-colors text-indigo-600">
                                 <ImageIcon className="w-5 h-5" />
                                 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                             </label>
                        </div>
                        <Button onClick={handleCreatePost} disabled={!newContent.trim()}>
                            Tweet
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            {posts.map(post => (
                <Card key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex space-x-3">
                        <img src={post.userAvatar} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{post.userName}</span>
                                <span className="text-sm text-gray-500">@{post.userName.toLowerCase().replace(/\s/g, '')}</span>
                                <span className="text-sm text-gray-400">· {new Date(post.timestamp).toLocaleDateString()}</span>
                            </div>
                            
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-3">{post.content}</p>
                            
                            {post.image && (
                                <img src={post.image} className="rounded-xl w-full max-h-96 object-cover mb-3 border border-gray-100 dark:border-gray-700" />
                            )}

                            <div className="flex justify-between text-gray-500 max-w-md">
                                <button className="flex items-center space-x-2 hover:text-indigo-500 transition-colors group">
                                    <MessageCircle className="w-4 h-4 group-hover:bg-indigo-50 rounded-full" />
                                    <span className="text-xs">{post.comments}</span>
                                </button>
                                <button 
                                    className={`flex items-center space-x-2 transition-colors group ${post.likedBy.includes(user.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                                    onClick={() => handleLike(post.id)}
                                >
                                    <Heart className={`w-4 h-4 ${post.likedBy.includes(user.id) ? 'fill-current' : ''}`} />
                                    <span className="text-xs">{post.likes}</span>
                                </button>
                                <button className="flex items-center space-x-2 hover:text-green-500 transition-colors">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    </div>
  );
};

export default CommunityView;
