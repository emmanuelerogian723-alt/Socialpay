
import React, { useState, useEffect, useRef } from 'react';
import { User, CommunityPost, CommunityComment } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Modal } from './UIComponents';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon, Mic, Video, X, Play, Pause, Trash2 } from 'lucide-react';

interface CommunityViewProps {
  user: User;
}

const CommunityView: React.FC<CommunityViewProps> = ({ user }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState<string | null>(null);
  const [newAudio, setNewAudio] = useState<string | null>(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Comment Modal State
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeComments, setActiveComments] = useState<CommunityComment[]>([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setPosts(await storageService.getCommunityPosts());
  };

  const handleCreatePost = async () => {
    if (!newContent.trim() && !newImage && !newVideo && !newAudio) return;

    const post: CommunityPost = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: newContent,
      image: newImage || undefined,
      video: newVideo || undefined,
      audio: newAudio || undefined,
      likes: 0,
      comments: 0,
      commentsList: [],
      timestamp: Date.now(),
      likedBy: []
    };

    await storageService.createCommunityPost(post);
    setNewContent('');
    setNewImage(null);
    setNewVideo(null);
    setNewAudio(null);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    await storageService.likeCommunityPost(postId, user.id);
    loadPosts();
  };

  const handleShare = (post: CommunityPost) => {
      // Simulate share by copying to clipboard
      const shareUrl = `${window.location.origin}/community/post/${post.id}`;
      navigator.clipboard.writeText(`Check out this post by ${post.userName}: ${shareUrl}`);
      
      // Try native share if available
      if (navigator.share) {
          navigator.share({
              title: `Post by ${post.userName}`,
              text: post.content,
              url: shareUrl
          }).catch(console.error);
      } else {
          alert("Link copied to clipboard!");
      }
  };

  const handleOpenComments = (post: CommunityPost) => {
      setSelectedPostId(post.id);
      setActiveComments(post.commentsList || []);
      setShowComments(true);
  };

  const handleSubmitComment = async () => {
      if(!selectedPostId || !commentText.trim()) return;
      
      const newComment: CommunityComment = {
          id: Date.now().toString(),
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          text: commentText,
          timestamp: Date.now()
      };

      await storageService.commentOnCommunityPost(selectedPostId, newComment);
      
      // Update local state
      setActiveComments(prev => [...prev, newComment]);
      setCommentText('');
      
      // Update global posts list to reflect comment count change immediately
      loadPosts();
  };

  // --- MEDIA HANDLERS ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setNewImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 20 * 1024 * 1024) return alert("Video too large. Max 20MB.");
          const reader = new FileReader();
          reader.onloadend = () => setNewVideo(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.onloadend = () => {
                  setNewAudio(reader.result as string);
              };
              reader.readAsDataURL(audioBlob);
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert("Could not access microphone.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
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
                    
                    {/* Media Previews */}
                    {newImage && (
                        <div className="relative mb-3">
                            <img src={newImage} className="rounded-lg max-h-64 w-full object-cover" />
                            <button onClick={() => setNewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"><X className="w-4 h-4"/></button>
                        </div>
                    )}
                    {newVideo && (
                        <div className="relative mb-3">
                            <video src={newVideo} controls className="rounded-lg max-h-64 w-full bg-black" />
                            <button onClick={() => setNewVideo(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"><X className="w-4 h-4"/></button>
                        </div>
                    )}
                    {newAudio && (
                        <div className="relative mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center">
                            <audio src={newAudio} controls className="w-full h-8" />
                            <button onClick={() => setNewAudio(null)} className="ml-2 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex space-x-2 items-center">
                             <label className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full cursor-pointer transition-colors text-indigo-600" title="Image">
                                 <ImageIcon className="w-5 h-5" />
                                 <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                             </label>
                             <label className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full cursor-pointer transition-colors text-indigo-600" title="Video">
                                 <Video className="w-5 h-5" />
                                 <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                             </label>
                             <button 
                                className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600'}`}
                                onClick={isRecording ? stopRecording : startRecording}
                                title="Voice Note"
                             >
                                 <Mic className="w-5 h-5" />
                             </button>
                             {isRecording && <span className="text-xs text-red-500 font-bold">Recording...</span>}
                        </div>
                        <Button onClick={handleCreatePost} disabled={!newContent.trim() && !newImage && !newVideo && !newAudio}>
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
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{post.userName}</span>
                                <span className="text-sm text-gray-500">@{post.userName.toLowerCase().replace(/\s/g, '')}</span>
                                <span className="text-sm text-gray-400">· {new Date(post.timestamp).toLocaleDateString()}</span>
                            </div>
                            
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-3 break-words">{post.content}</p>
                            
                            {post.image && (
                                <img src={post.image} className="rounded-xl w-full max-h-96 object-cover mb-3 border border-gray-100 dark:border-gray-700" />
                            )}
                            {post.video && (
                                <video src={post.video} controls className="rounded-xl w-full max-h-96 bg-black mb-3" />
                            )}
                            {post.audio && (
                                <div className="mb-3 w-full">
                                    <audio src={post.audio} controls className="w-full" />
                                </div>
                            )}

                            <div className="flex justify-between text-gray-500 max-w-md pt-2">
                                <button 
                                    className="flex items-center space-x-2 hover:text-indigo-500 transition-colors group"
                                    onClick={() => handleOpenComments(post)}
                                >
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
                                <button 
                                    className="flex items-center space-x-2 hover:text-green-500 transition-colors"
                                    onClick={() => handleShare(post)}
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        {/* --- COMMENTS MODAL --- */}
        <Modal isOpen={showComments} onClose={() => setShowComments(false)} title="Replies" maxWidth="max-w-xl">
            <div className="flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto space-y-4 p-2">
                    {activeComments.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                            No replies yet. Start the conversation!
                        </div>
                    )}
                    {activeComments.map(c => (
                        <div key={c.id} className="flex space-x-3 border-b border-gray-50 dark:border-gray-800 pb-3 last:border-0">
                            <img src={c.userAvatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.userName}</span>
                                    <span className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.text}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2">
                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" />
                        <Input 
                            placeholder="Tweet your reply..." 
                            value={commentText} 
                            onChange={e => setCommentText(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSubmitComment()}
                        />
                        <Button size="sm" onClick={handleSubmitComment} disabled={!commentText.trim()}>Reply</Button>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default CommunityView;
