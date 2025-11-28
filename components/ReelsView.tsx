import React, { useState, useEffect } from 'react';
import { Video, User } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Modal } from './UIComponents';
import { Heart, MessageCircle, Share2, Plus, Play, X, Send, ArrowLeft, Grid, Users } from 'lucide-react';

interface ReelsViewProps {
  user: User;
}

const ReelsView: React.FC<ReelsViewProps> = ({ user }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  // Profile View State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Comment Modal
  const [showComments, setShowComments] = useState(false);
  const [currentComments, setCurrentComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    setVideos(storageService.getVideos());
  }, [isUploading]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl) return;

    const newVideo: Video = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      url: newVideoUrl,
      caption: caption,
      likes: 0,
      comments: 0,
      timestamp: Date.now()
    };

    storageService.addVideo(newVideo);
    setNewVideoUrl('');
    setCaption('');
    setIsUploading(false);
    alert('Video posted successfully!');
  };

  const handleLike = (videoId: string) => {
      // Toggle logic usually, here just increment for demo
      const vids = [...videos];
      const idx = vids.findIndex(v => v.id === videoId);
      if(idx !== -1) {
          vids[idx].likes += 1;
          setVideos(vids);
          // In real app, persist this
      }
  };

  const openComments = (video: Video) => {
      setActiveVideoId(video.id);
      setCurrentComments(video.commentsList || []); // Assuming type update, else empty
      setShowComments(true);
  };

  const handlePostComment = () => {
      if(!newComment || !activeVideoId) return;
      // Mock update
      const vids = [...videos];
      const idx = vids.findIndex(v => v.id === activeVideoId);
      if(idx !== -1) {
          const commentPayload = { text: newComment, user: user.name, avatar: user.avatar };
          vids[idx].comments += 1;
          
          if (!vids[idx].commentsList) {
             vids[idx].commentsList = [];
          }
          vids[idx].commentsList!.push(commentPayload);

          setVideos(vids);
          setCurrentComments([...currentComments, commentPayload]);
          setNewComment('');
      }
  };

  // Helper to get profile data based on ID
  const getProfileData = () => {
    if (!viewingProfileId) return null;
    const profileVideos = videos.filter(v => v.userId === viewingProfileId);
    // In a real app we'd fetch the user object, here we infer from their videos
    const profileUser = profileVideos[0] || videos.find(v => v.userId === viewingProfileId) || {
        userName: 'Unknown User',
        userAvatar: 'https://via.placeholder.com/150',
        userId: viewingProfileId
    };
    return { user: profileUser, videos: profileVideos };
  };

  const profileData = getProfileData();

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col relative">
      
      {/* Header Actions */}
      {!viewingProfileId && (
        <div className="absolute top-4 right-4 z-20">
           <button 
             onClick={() => setIsUploading(true)} 
             className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>
      )}

      {/* Main Feed */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-2xl bg-black">
        {videos.map(video => (
          <div key={video.id} className="snap-start w-full h-full relative flex items-center justify-center bg-gray-900">
            {/* Video Player */}
            <video 
              src={video.url} 
              className="w-full h-full object-cover" 
              controls={false}
              loop
              autoPlay
              muted // Muted needed for autoplay usually
              onClick={(e) => e.currentTarget.muted = !e.currentTarget.muted}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none"></div>

            {/* Right Side Actions */}
            <div className="absolute bottom-24 right-4 flex flex-col items-center space-y-6 z-10 text-white">
                {/* Follow Button Avatar on Right */}
                <div className="relative mb-2">
                    <img 
                      src={video.userAvatar} 
                      className="w-12 h-12 rounded-full border-2 border-white object-cover" 
                      onClick={() => setViewingProfileId(video.userId)}
                    />
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer shadow-sm">
                        <Plus className="w-3 h-3 text-white" />
                    </div>
                </div>

                <button className="flex flex-col items-center group" onClick={() => handleLike(video.id)}>
                    <div className="bg-gray-800/50 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">
                       <Heart className="w-7 h-7 fill-white text-white group-hover:fill-red-500 group-hover:text-red-500 transition-colors" />
                    </div>
                    <span className="text-xs font-bold shadow-black drop-shadow-md">{video.likes}</span>
                </button>

                <button className="flex flex-col items-center group" onClick={() => openComments(video)}>
                    <div className="bg-gray-800/50 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-white/20 transition-colors">
                       <MessageCircle className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-bold shadow-black drop-shadow-md">{video.comments}</span>
                </button>

                <button className="flex flex-col items-center group">
                    <div className="bg-gray-800/50 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-white/20 transition-colors">
                       <Share2 className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs font-bold shadow-black drop-shadow-md">Share</span>
                </button>
            </div>

            {/* Bottom Info - PROMINENT USERNAME */}
            <div className="absolute bottom-6 left-4 right-20 z-10 text-white">
                <button 
                  onClick={() => setViewingProfileId(video.userId)}
                  className="flex items-center space-x-3 mb-3 hover:bg-white/10 p-2 -ml-2 rounded-lg transition-colors w-max"
                >
                    <img src={video.userAvatar} className="w-11 h-11 rounded-full border-2 border-indigo-500 object-cover" />
                    <div className="text-left">
                       <h3 className="font-bold text-lg leading-none shadow-black drop-shadow-md">@{video.userName}</h3>
                       <p className="text-[10px] text-gray-300 uppercase tracking-wider mt-1">View Profile</p>
                    </div>
                </button>
                
                <p className="text-sm line-clamp-2 opacity-95 mb-2 font-medium">{video.caption}</p>
                
                <div className="flex items-center text-xs opacity-70 bg-white/10 px-2 py-1 rounded-full w-max">
                    <span className="mr-2 animate-pulse">🎵</span>
                    <span>Original Sound - {video.userName}</span>
                </div>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
           <div className="h-full flex flex-col items-center justify-center text-white p-10 text-center">
              <Play className="w-16 h-16 opacity-50 mb-4" />
              <h2 className="text-xl font-bold">No Reels Yet</h2>
              <p className="text-gray-400">Be the first to upload a video!</p>
              <Button className="mt-4" onClick={() => setIsUploading(true)}>Upload Video</Button>
           </div>
        )}
      </div>

      {/* User Profile Overlay */}
      {viewingProfileId && profileData && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-30 overflow-y-auto animate-slide-up flex flex-col">
          {/* Nav */}
          <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
            <button onClick={() => setViewingProfileId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg truncate">@{profileData.user.userName}</span>
          </div>

          {/* Profile Header */}
          <div className="p-6 flex flex-col items-center text-center">
             <img src={profileData.user.userAvatar} className="w-24 h-24 rounded-full border-4 border-indigo-500 mb-4 object-cover" />
             <h2 className="text-xl font-bold mb-1">@{profileData.user.userName}</h2>
             <div className="flex space-x-6 my-4 text-sm">
                <div className="flex flex-col">
                   <span className="font-bold text-lg">{profileData.videos.length}</span>
                   <span className="text-gray-500">Posts</span>
                </div>
                <div className="flex flex-col">
                   <span className="font-bold text-lg">12.5K</span>
                   <span className="text-gray-500">Followers</span>
                </div>
                <div className="flex flex-col">
                   <span className="font-bold text-lg">{profileData.videos.reduce((acc, v) => acc + v.likes, 0)}</span>
                   <span className="text-gray-500">Likes</span>
                </div>
             </div>
             <div className="flex space-x-2 w-full max-w-xs">
                <Button className="flex-1">Follow</Button>
                <Button variant="outline" className="flex-1">Message</Button>
             </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 border-t border-gray-100 dark:border-gray-800">
             <div className="flex items-center justify-center p-3 border-b border-gray-100 dark:border-gray-800">
               <Grid className="w-5 h-5 mr-2" /> <span className="text-xs font-bold uppercase tracking-wider">Videos</span>
             </div>
             <div className="grid grid-cols-3 gap-0.5 pb-20">
                {profileData.videos.map(v => (
                   <div key={v.id} className="aspect-[3/4] bg-gray-800 relative group cursor-pointer">
                      <video src={v.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-end p-2">
                         <span className="text-white text-xs font-bold flex items-center">
                           <Play className="w-3 h-3 mr-1 fill-white" /> {v.likes}
                         </span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isUploading} onClose={() => setIsUploading(false)} title="Upload Reel">
          <form onSubmit={handlePost} className="space-y-4">
            <Input 
              placeholder="Paste Video URL (mp4)" 
              value={newVideoUrl}
              onChange={e => setNewVideoUrl(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">Note: For this demo, please paste a direct link to an MP4 file.</p>
            <Input 
              placeholder="Write a caption..." 
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <Button type="submit" className="w-full">Post Reel</Button>
          </form>
      </Modal>

      {/* Comments Drawer (Mock) */}
      {showComments && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-900 rounded-t-2xl h-2/3 flex flex-col animate-slide-up">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold">Comments</h3>
                  <button onClick={() => setShowComments(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentComments.length === 0 && <p className="text-gray-500 text-center text-sm py-10">No comments yet. Say something nice!</p>}
                  {currentComments.map((c, i) => (
                      <div key={i} className="flex items-start space-x-3">
                          <img src={c.avatar} className="w-8 h-8 rounded-full" />
                          <div>
                              <div className="text-xs font-bold text-gray-500">{c.user}</div>
                              <p className="text-sm">{c.text}</p>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex space-x-2">
                  <Input 
                     placeholder="Add a comment..." 
                     value={newComment} 
                     onChange={e => setNewComment(e.target.value)}
                     className="flex-1"
                  />
                  <Button size="sm" onClick={handlePostComment} disabled={!newComment}>
                      <Send className="w-4 h-4" />
                  </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReelsView;