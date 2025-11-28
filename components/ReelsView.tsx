
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, User, VideoEditingData, Draft, ChatMessage } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Modal, Badge } from './UIComponents';
import { Heart, MessageCircle, Share2, Plus, Play, X, Send, ArrowLeft, Grid, Users, Upload, Sparkles, Scissors, Type, Sticker, Music, Check, Volume2, VolumeX, Save, FileVideo, Eye, Clock, MessageSquare } from 'lucide-react';

interface ReelsViewProps {
  user: User;
}

// --- CONSTANTS ---
const FILTERS = [
  { name: 'Normal', class: '' },
  { name: 'Vibrant', class: 'saturate-150 contrast-110' },
  { name: 'Vintage', class: 'sepia contrast-125 brightness-90' },
  { name: 'B&W', class: 'grayscale contrast-125' },
  { name: 'Dreamy', class: 'brightness-110 contrast-90 hue-rotate-15' },
  { name: 'Cyber', class: 'hue-rotate-180 contrast-125 saturate-150' },
];

const EMOJIS = ['🔥', '❤️', '😂', '😍', '👏', '🎉', '👀', '💯', '✨', '🚀'];

const ReelsView: React.FC<ReelsViewProps> = ({ user }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Profile View State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Comment Modal
  const [showComments, setShowComments] = useState(false);
  const [currentComments, setCurrentComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);

  // Animation States
  const [heartAnim, setHeartAnim] = useState<{ id: string, x: number, y: number } | null>(null);

  // Intersection Observer for Autoplay
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setVideos(storageService.getVideos());
    setDrafts(storageService.getDrafts(user.id));
  }, [user.id, viewingProfileId]); // Reload when profile view changes to update stats

  // Autoplay & View Counting
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const videoId = (entry.target as HTMLElement).dataset.videoid;
      if (!videoId) return;
      
      const videoEl = videoRefs.current[videoId];
      if (entry.isIntersecting) {
        setActiveVideoId(videoId);
        if (videoEl) {
          videoEl.currentTime = 0;
          videoEl.play().catch(() => {});
          
          // Increment Views after 2 seconds of watch time
          setTimeout(() => {
             if(videoEl && !videoEl.paused) {
                 storageService.incrementVideoView(videoId);
             }
          }, 2000);
        }
      } else {
        if (videoEl) videoEl.pause();
      }
    });
  }, []);

  useEffect(() => {
    // Only attach observer if we are not in profile view or uploading
    if (!viewingProfileId && !isUploading && !selectedVideo) {
        observer.current = new IntersectionObserver(handleObserver, {
        threshold: 0.6,
        });
        const elements = document.querySelectorAll('.reel-video-container');
        elements.forEach((el) => observer.current?.observe(el));
    }
    return () => observer.current?.disconnect();
  }, [videos, handleObserver, viewingProfileId, isUploading, selectedVideo]);

  // Social Actions
  const handleLike = (videoId: string, doubleTap = false) => {
      const vids = [...videos];
      const idx = vids.findIndex(v => v.id === videoId);
      if(idx !== -1) {
          vids[idx].likes += 1;
          setVideos(vids);
          // Also update selected video if open
          if (selectedVideo && selectedVideo.id === videoId) {
             setSelectedVideo({...vids[idx]});
          }
      }
  };

  const handleDoubleTap = (e: React.MouseEvent, videoId: string) => {
     const rect = (e.target as HTMLElement).getBoundingClientRect();
     const x = e.clientX - rect.left;
     const y = e.clientY - rect.top;
     
     setHeartAnim({ id: videoId, x, y });
     setTimeout(() => setHeartAnim(null), 800);
     handleLike(videoId, true);
  };

  const handleFollow = (targetId: string) => {
     storageService.toggleFollow(user.id, targetId);
     // Force re-render of profile
     setVideos(storageService.getVideos()); 
  };

  const openComments = (video: Video) => {
      setCommentVideoId(video.id);
      setCurrentComments(video.commentsList || []);
      setShowComments(true);
  };

  const handlePostComment = () => {
      if(!newComment || !commentVideoId) return;
      const vids = [...videos];
      const idx = vids.findIndex(v => v.id === commentVideoId);
      if(idx !== -1) {
          const commentPayload = { text: newComment, user: user.name, avatar: user.avatar };
          vids[idx].comments += 1;
          if (!vids[idx].commentsList) vids[idx].commentsList = [];
          vids[idx].commentsList!.push(commentPayload);
          setVideos(vids);
          setCurrentComments([...(vids[idx].commentsList || [])]);
          setNewComment('');
          
          if (selectedVideo && selectedVideo.id === commentVideoId) {
              setSelectedVideo({...vids[idx]});
          }
      }
  };

  // Chat Logic
  const loadChat = (targetId: string) => {
      setChatMessages(storageService.getMessages(user.id, targetId));
      setShowChat(true);
  };

  const handleSendMessage = () => {
      if(!chatInput || !viewingProfileId) return;
      const msg: ChatMessage = {
          id: Date.now().toString(),
          senderId: user.id,
          receiverId: viewingProfileId,
          text: chatInput,
          timestamp: Date.now()
      };
      storageService.sendMessage(msg);
      setChatMessages([...chatMessages, msg]);
      setChatInput('');
  };

  // --- EDITOR STATE ---
  const [editorStep, setEditorStep] = useState<'upload' | 'trim' | 'edit' | 'details'>('upload');
  const [newVideoFile, setNewVideoFile] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<VideoEditingData>({
    filter: '',
    stickers: [],
    textOverlays: [],
    trim: { start: 0, end: 10 }
  });
  const [activeTool, setActiveTool] = useState<'filter' | 'text' | 'sticker'>('filter');
  const [inputText, setInputText] = useState('');
  const [inputColor, setInputColor] = useState('#FFFFFF');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);

  // Refs for Trimming
  const editorVideoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) return alert("Max 50MB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVideoFile(reader.result as string);
        setEditorStep('trim');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDraft = () => {
      if (!newVideoFile) return;
      const draft: Draft = {
          id: Date.now().toString(),
          userId: user.id,
          videoFile: newVideoFile,
          caption,
          tags,
          editingData,
          timestamp: Date.now()
      };
      storageService.saveDraft(draft);
      setDrafts(storageService.getDrafts(user.id));
      alert("Draft saved successfully!");
      setIsUploading(false);
      resetEditor();
  };

  const loadDraft = (draft: Draft) => {
      setNewVideoFile(draft.videoFile);
      setCaption(draft.caption);
      setTags(draft.tags);
      setEditingData(draft.editingData);
      setEditorStep('edit');
      setIsUploading(true);
  };

  const resetEditor = () => {
      setEditorStep('upload');
      setNewVideoFile(null);
      setEditingData({ filter: '', stickers: [], textOverlays: [], trim: { start: 0, end: 10 } });
      setCaption('');
      setTags('');
      setUploadProgress(0);
      setActiveTool('filter');
  };

  const handlePost = () => {
      if (!newVideoFile) return;
      if (uploadProgress > 0) return; // Prevent double clicks
      
      // Simulate Upload Progress
      let progress = 0;
      const interval = setInterval(() => {
         progress += 10;
         setUploadProgress(progress);
         if (progress >= 100) {
             clearInterval(interval);
             // Small delay to ensure state updates
             setTimeout(() => finalizePost(), 200);
         }
      }, 200);
  };

  const finalizePost = () => {
      try {
          const tagList = tags.split(/[\s,]+/).filter(t => t).map(t => t.startsWith('#') ? t : `#${t}`);
          
          const newVideo: Video = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            url: newVideoFile!,
            caption: caption,
            likes: 0,
            views: 0,
            comments: 0,
            commentsList: [],
            tags: tagList,
            editingData: editingData,
            timestamp: Date.now()
          };

          storageService.addVideo(newVideo);
          setVideos(storageService.getVideos());
          setIsUploading(false);
          resetEditor();
          alert('Reel posted successfully!');
      } catch (e) {
          console.error("Failed to post video", e);
          alert('Failed to post reel. Your browser storage might be full. Try a smaller video.');
          setIsUploading(false);
          setUploadProgress(0);
      }
  };

  const addSticker = (emoji: string) => {
      setEditingData(prev => ({ 
          ...prev, 
          stickers: [...prev.stickers, { id: Date.now().toString(), emoji, x: 50, y: 50 }] 
      }));
  };

  const addTextOverlay = () => {
      if (!inputText) return;
      setEditingData(prev => ({ 
          ...prev, 
          textOverlays: [...prev.textOverlays, { id: Date.now().toString(), text: inputText, x: 50, y: 50, color: inputColor }] 
      }));
      setInputText('');
  };

  // Profile Data Helper
  const getProfileData = () => {
    if (!viewingProfileId) return null;
    const profileUser = storageService.getUserById(viewingProfileId);
    if (!profileUser) return null;
    
    // Calculate stats dynamically
    const userVideos = videos.filter(v => v.userId === viewingProfileId);
    const totalLikes = userVideos.reduce((acc, v) => acc + v.likes, 0);
    const totalViews = userVideos.reduce((acc, v) => acc + (v.views || 0), 0);
    const followersCount = profileUser.followers?.length || 0;
    const isFollowing = profileUser.followers?.includes(user.id);

    return { user: profileUser, videos: userVideos, stats: { totalLikes, totalViews, followersCount, isFollowing } };
  };
  const profileData = getProfileData();

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col relative bg-black rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Actions */}
      {!viewingProfileId && !isUploading && !selectedVideo && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-4">
           <button 
             onClick={() => setIsUploading(true)} 
             className="bg-gray-900/50 text-white p-3 rounded-full backdrop-blur-md hover:bg-indigo-600 transition-all border border-white/10"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>
      )}

      {/* Main Feed */}
      {!isUploading && !viewingProfileId && !selectedVideo && (
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full">
            {videos.map(video => (
            <div 
                key={video.id} 
                data-videoid={video.id}
                className="reel-video-container snap-start w-full h-full relative flex items-center justify-center bg-gray-900"
            >
                {/* Video Player */}
                <div 
                    className={`relative w-full h-full ${video.editingData?.filter || ''}`}
                    onDoubleClick={(e) => handleDoubleTap(e, video.id)}
                >
                    <video 
                        ref={el => { videoRefs.current[video.id] = el; }}
                        src={video.url} 
                        className="w-full h-full object-cover" 
                        loop
                        muted={muted}
                        playsInline
                        // Simulate trimming
                        onTimeUpdate={(e) => {
                            if(video.editingData?.trim) {
                                const v = e.currentTarget;
                                if (v.currentTime > video.editingData.trim.end) {
                                    v.currentTime = video.editingData.trim.start;
                                }
                            }
                        }}
                    />
                    
                    {/* Overlays */}
                    {video.editingData?.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl pointer-events-none drop-shadow-lg" style={{ left: `${s.x}%`, top: `${s.y}%` }}>{s.emoji}</div>
                    ))}
                    {video.editingData?.textOverlays.map(t => (
                        <div key={t.id} className="absolute text-xl font-bold font-sans pointer-events-none drop-shadow-md" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }}>{t.text}</div>
                    ))}

                    {/* Like Animation */}
                    {heartAnim?.id === video.id && (
                        <div className="absolute pointer-events-none" style={{ left: heartAnim.x - 60, top: heartAnim.y - 60 }}>
                             <Heart className="w-32 h-32 fill-red-500 text-red-500 animate-bounce-soft drop-shadow-2xl opacity-90 scale-150 duration-300" />
                        </div>
                    )}
                </div>
                
                {/* Controls */}
                <button onClick={() => setMuted(!muted)} className="absolute top-4 left-4 z-20 bg-black/30 p-2 rounded-full backdrop-blur-sm text-white">
                    {muted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                </button>

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none"></div>

                {/* Right Side Actions */}
                <div className="absolute bottom-24 right-4 flex flex-col items-center space-y-6 z-20 text-white">
                    <div className="relative mb-2 group">
                        <img 
                            src={video.userAvatar} 
                            className="w-12 h-12 rounded-full border-2 border-white object-cover cursor-pointer hover:scale-110 transition-transform" 
                            onClick={() => setViewingProfileId(video.userId)}
                        />
                    </div>
                    <button className="flex flex-col items-center" onClick={() => handleLike(video.id)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1 hover:bg-red-500/20">
                            <Heart className={`w-8 h-8 ${video.likes > 0 ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                        </div>
                        <span className="text-xs font-bold">{video.likes}</span>
                    </button>
                    <button className="flex flex-col items-center" onClick={() => openComments(video)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-bold">{video.comments}</span>
                    </button>
                    <button className="flex flex-col items-center">
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1">
                            <Share2 className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-bold">Share</span>
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-4 left-4 right-20 z-20 text-white">
                    <button onClick={() => setViewingProfileId(video.userId)} className="flex items-center space-x-2 mb-3 hover:bg-white/10 p-2 -ml-2 rounded-lg w-max">
                        <span className="font-bold text-lg">@{video.userName}</span>
                        {video.userId === 'admin-01' && <Badge color="blue" className="text-[10px]">Official</Badge>}
                    </button>
                    <p className="text-sm line-clamp-2 opacity-95 mb-2 font-medium">{video.caption}</p>
                    <div className="flex items-center text-xs opacity-80 bg-white/10 px-3 py-1.5 rounded-full w-max">
                        <Music className="w-3 h-3 mr-2 animate-spin-slow" />
                        <span>Original Audio • {video.userName}</span>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}

      {/* --- EDITOR MODAL --- */}
      <Modal 
        isOpen={isUploading} 
        onClose={resetEditor} 
        title={editorStep === 'upload' ? "Create Reel" : editorStep === 'trim' ? "Trim Video" : editorStep === 'edit' ? "Editor Studio" : "Post Details"}
        maxWidth="max-w-2xl"
      >
          {/* Progress Overlay */}
          {uploadProgress > 0 && (
              <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <h3 className="text-xl font-bold">Uploading Reel...</h3>
                  <p className="text-gray-500">{uploadProgress}%</p>
              </div>
          )}

          {editorStep === 'upload' && (
             <div className="py-4 space-y-6">
                 {/* Upload Box */}
                 <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                     <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" id="reel-upload" />
                     <label htmlFor="reel-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <span className="font-bold text-lg">Select Video</span>
                        <span className="text-sm text-gray-500 mt-2">Up to 60 seconds</span>
                     </label>
                 </div>

                 {/* Drafts List */}
                 {drafts.length > 0 && (
                     <div>
                         <h3 className="font-bold mb-3 flex items-center text-gray-500 text-sm uppercase tracking-wider">
                             <FileVideo className="w-4 h-4 mr-2"/> Saved Drafts
                         </h3>
                         <div className="grid grid-cols-3 gap-3">
                             {drafts.map(d => (
                                 <div key={d.id} onClick={() => loadDraft(d)} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 cursor-pointer hover:ring-2 ring-indigo-500 relative">
                                     <div className="aspect-[9/16] bg-black rounded mb-2 overflow-hidden">
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <Play className="w-6 h-6" />
                                        </div>
                                     </div>
                                     <div className="text-xs font-medium truncate">{d.caption || 'Untitled Draft'}</div>
                                     <div className="text-[10px] text-gray-500">{new Date(d.timestamp).toLocaleDateString()}</div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          )}

          {editorStep === 'trim' && newVideoFile && (
              <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <video 
                        ref={editorVideoRef}
                        src={newVideoFile} 
                        className="max-h-full w-full" 
                        onLoadedMetadata={(e) => {
                            const dur = e.currentTarget.duration;
                            setVideoDuration(dur);
                            setEditingData(prev => ({...prev, trim: { start: 0, end: dur }}));
                        }}
                        controls
                      />
                  </div>
                  
                  <div className="px-4 py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                          <span>Start: {editingData.trim?.start.toFixed(1)}s</span>
                          <span>End: {editingData.trim?.end.toFixed(1)}s</span>
                      </div>
                      <div className="relative h-2 bg-gray-300 rounded-full">
                          <input 
                              type="range" min="0" max={videoDuration} step="0.1"
                              value={editingData.trim?.start}
                              onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if(val < (editingData.trim?.end || 0)) {
                                      setEditingData({...editingData, trim: { ...editingData.trim!, start: val }});
                                      if(editorVideoRef.current) editorVideoRef.current.currentTime = val;
                                  }
                              }}
                              className="w-full cursor-pointer z-10"
                          />
                          <input 
                              type="range" min="0" max={videoDuration} step="0.1"
                              value={editingData.trim?.end}
                              onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if(val > (editingData.trim?.start || 0)) {
                                      setEditingData({...editingData, trim: { ...editingData.trim!, end: val }});
                                  }
                              }}
                              className="w-full cursor-pointer z-20"
                          />
                      </div>
                      <p className="text-xs text-center text-gray-500 mt-2">Adjust start and end sliders</p>
                  </div>

                  <Button onClick={() => setEditorStep('edit')} className="w-full">Next: Add Effects</Button>
              </div>
          )}

          {editorStep === 'edit' && newVideoFile && (
             <div className="flex flex-col h-[500px]">
                 <div className="flex-1 bg-black relative rounded-lg overflow-hidden flex items-center justify-center mb-4">
                     <video src={newVideoFile} className={`max-h-full max-w-full ${editingData.filter}`} autoPlay loop muted />
                     
                     {/* Overlay Preview */}
                     {editingData.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl" style={{ left: `${s.x}%`, top: `${s.y}%` }}>{s.emoji}</div>
                     ))}
                     {editingData.textOverlays.map(t => (
                        <div key={t.id} className="absolute text-xl font-bold" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }}>{t.text}</div>
                     ))}
                 </div>

                 {/* Tools */}
                 <div className="space-y-4">
                     <div className="flex space-x-2 justify-center">
                         <Button size="sm" variant={activeTool === 'filter' ? 'primary' : 'ghost'} onClick={() => setActiveTool('filter')}><Sparkles className="w-4 h-4 mr-2"/>Filters</Button>
                         <Button size="sm" variant={activeTool === 'text' ? 'primary' : 'ghost'} onClick={() => setActiveTool('text')}><Type className="w-4 h-4 mr-2"/>Text</Button>
                         <Button size="sm" variant={activeTool === 'sticker' ? 'primary' : 'ghost'} onClick={() => setActiveTool('sticker')}><Sticker className="w-4 h-4 mr-2"/>Stickers</Button>
                     </div>

                     <div className="h-32 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-y-auto">
                         {activeTool === 'filter' && (
                             <div className="flex space-x-2 overflow-x-auto pb-2">
                                 {FILTERS.map(f => (
                                     <button 
                                       key={f.name} 
                                       onClick={() => setEditingData({...editingData, filter: f.class})}
                                       className={`flex-shrink-0 w-20 h-20 rounded bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-xs font-medium border-2 ${editingData.filter === f.class ? 'border-indigo-500' : 'border-transparent'}`}
                                     >
                                         <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 mb-1 ${f.class}`}></div>
                                         {f.name}
                                     </button>
                                 ))}
                             </div>
                         )}
                         {activeTool === 'text' && (
                             <div className="flex space-x-2">
                                 <Input placeholder="Enter text..." value={inputText} onChange={e => setInputText(e.target.value)} />
                                 <input type="color" value={inputColor} onChange={e => setInputColor(e.target.value)} className="h-10 w-10 rounded cursor-pointer" />
                                 <Button onClick={addTextOverlay}>Add</Button>
                             </div>
                         )}
                         {activeTool === 'sticker' && (
                             <div className="grid grid-cols-5 gap-2 text-2xl">
                                 {EMOJIS.map(emoji => (
                                     <button key={emoji} onClick={() => addSticker(emoji)} className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 transition-colors">
                                         {emoji}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>

                     <Button onClick={() => setEditorStep('details')} className="w-full">Next: Add Details</Button>
                 </div>
             </div>
          )}

          {editorStep === 'details' && (
              <div className="space-y-4">
                  <div className="flex space-x-4">
                      <div className="w-1/3 aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
                         <video src={newVideoFile!} className={`w-full h-full object-cover ${editingData.filter}`} />
                         <div className="absolute bottom-2 left-2 text-white text-xs font-bold">Preview</div>
                      </div>
                      <div className="w-2/3 space-y-4">
                          <div>
                              <label className="block text-sm font-medium mb-1">Caption</label>
                              <textarea 
                                className="w-full p-2 rounded-lg border dark:bg-gray-800 dark:border-gray-700" 
                                rows={4}
                                placeholder="Write a catchy caption..."
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                              ></textarea>
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                              <Input placeholder="#viral, #dance, #comedy" value={tags} onChange={e => setTags(e.target.value)} />
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                      <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
                          <Save className="w-4 h-4 mr-2" /> Save Draft
                      </Button>
                      <Button className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white" onClick={handlePost}>
                          Post Reel
                      </Button>
                  </div>
              </div>
          )}
      </Modal>

      {/* --- PROFILE OVERLAY --- */}
      {profileData && (
          <div className="absolute inset-0 z-40 bg-white dark:bg-gray-900 animate-slide-up overflow-y-auto">
              {/* Profile Header */}
              <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 z-10">
                  <button onClick={() => setViewingProfileId(null)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                      <ArrowLeft className="w-6 h-6"/>
                  </button>
                  <h2 className="font-bold text-lg">{profileData.user.name}</h2>
                  <button onClick={() => loadChat(profileData.user.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                      <Send className="w-5 h-5" />
                  </button>
              </div>

              <div className="p-6 text-center">
                  <div className="relative inline-block mb-4">
                      <img src={profileData.user.avatar} className="w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-gray-800 mx-auto" />
                      {profileData.user.role === 'admin' && <Badge color="blue" className="absolute bottom-0 right-0">Admin</Badge>}
                      {profileData.user.role === 'creator' && <Badge color="yellow" className="absolute bottom-0 right-0">Creator</Badge>}
                  </div>
                  <h1 className="text-xl font-bold mb-1">@{profileData.user.name}</h1>
                  <p className="text-gray-500 text-sm mb-4">{profileData.user.bio || "No bio yet."}</p>

                  <div className="flex justify-center space-x-8 mb-6">
                      <div className="text-center">
                          <div className="font-bold text-lg">{profileData.stats.followersCount}</div>
                          <div className="text-xs text-gray-500">Followers</div>
                      </div>
                      <div className="text-center">
                          <div className="font-bold text-lg">{profileData.stats.totalLikes}</div>
                          <div className="text-xs text-gray-500">Likes</div>
                      </div>
                      <div className="text-center">
                          <div className="font-bold text-lg">{profileData.stats.totalViews}</div>
                          <div className="text-xs text-gray-500">Views</div>
                      </div>
                  </div>

                  <div className="flex space-x-3 justify-center mb-8">
                      {profileData.user.id !== user.id && (
                          <Button 
                            onClick={() => handleFollow(profileData.user.id)} 
                            variant={profileData.stats.isFollowing ? 'outline' : 'primary'}
                            className="w-32"
                          >
                              {profileData.stats.isFollowing ? 'Following' : 'Follow'}
                          </Button>
                      )}
                      <Button variant="outline" onClick={() => loadChat(profileData.user.id)}>Message</Button>
                  </div>
              </div>

              {/* Video Grid */}
              <div className="border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-center p-3 border-b border-gray-100 dark:border-gray-800">
                      <Grid className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-0.5">
                      {profileData.videos.map(v => (
                          <div key={v.id} className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative cursor-pointer" onClick={() => setSelectedVideo(v)}>
                              <video src={v.url} className="w-full h-full object-cover" />
                              <div className="absolute bottom-1 left-1 flex items-center text-white text-[10px] font-bold drop-shadow-md">
                                  <Play className="w-3 h-3 mr-1 fill-white" /> {v.views}
                              </div>
                          </div>
                      ))}
                  </div>
                  {profileData.videos.length === 0 && (
                      <div className="py-20 text-center text-gray-400 text-sm">No reels posted yet.</div>
                  )}
              </div>
          </div>
      )}

      {/* --- SINGLE VIDEO OVERLAY (From Profile) --- */}
      {selectedVideo && (
        <div className="absolute inset-0 z-50 bg-black animate-slide-up">
            <div className="relative w-full h-full">
                <button 
                  onClick={() => setSelectedVideo(null)} 
                  className="absolute top-4 left-4 z-30 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                <div 
                    className={`relative w-full h-full ${selectedVideo.editingData?.filter || ''}`}
                    onDoubleClick={(e) => handleDoubleTap(e, selectedVideo.id)}
                >
                    <video 
                        src={selectedVideo.url} 
                        className="w-full h-full object-cover" 
                        autoPlay
                        loop
                        playsInline
                        controls={false}
                        onClick={(e) => {
                             const v = e.currentTarget;
                             v.paused ? v.play() : v.pause();
                        }}
                    />
                     {/* Overlays */}
                    {selectedVideo.editingData?.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl pointer-events-none drop-shadow-lg" style={{ left: `${s.x}%`, top: `${s.y}%` }}>{s.emoji}</div>
                    ))}
                    {selectedVideo.editingData?.textOverlays.map(t => (
                        <div key={t.id} className="absolute text-xl font-bold font-sans pointer-events-none drop-shadow-md" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }}>{t.text}</div>
                    ))}

                    {/* Like Animation */}
                    {heartAnim?.id === selectedVideo.id && (
                        <div className="absolute pointer-events-none" style={{ left: heartAnim.x - 60, top: heartAnim.y - 60 }}>
                             <Heart className="w-32 h-32 fill-red-500 text-red-500 animate-bounce-soft drop-shadow-2xl opacity-90 scale-150 duration-300" />
                        </div>
                    )}
                </div>

                 {/* Right Side Actions */}
                <div className="absolute bottom-24 right-4 flex flex-col items-center space-y-6 z-20 text-white">
                    <button className="flex flex-col items-center" onClick={() => handleLike(selectedVideo.id)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1 hover:bg-red-500/20">
                            <Heart className={`w-8 h-8 ${selectedVideo.likes > 0 ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                        </div>
                        <span className="text-xs font-bold">{selectedVideo.likes}</span>
                    </button>
                    <button className="flex flex-col items-center" onClick={() => openComments(selectedVideo)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-bold">{selectedVideo.comments}</span>
                    </button>
                    <button className="flex flex-col items-center">
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1">
                            <Share2 className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-bold">Share</span>
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-4 left-4 right-20 z-20 text-white">
                    <div className="font-bold text-lg mb-1">@{selectedVideo.userName}</div>
                    <p className="text-sm line-clamp-2 opacity-95 mb-2 font-medium">{selectedVideo.caption}</p>
                    <div className="flex items-center text-xs opacity-80 bg-white/10 px-3 py-1.5 rounded-full w-max mt-2">
                        <Music className="w-3 h-3 mr-2 animate-spin-slow" />
                        <span>Original Audio • {selectedVideo.userName}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- COMMENTS MODAL --- */}
      <Modal isOpen={showComments} onClose={() => setShowComments(false)} title="Comments">
          <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-4 p-2">
                  {currentComments.length === 0 && <p className="text-center text-gray-500 mt-10">No comments yet. Be the first!</p>}
                  {currentComments.map((c, i) => (
                      <div key={i} className="flex space-x-3">
                          <img src={c.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                          <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{c.user}</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                  <Input 
                      placeholder="Add a comment..." 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handlePostComment()}
                  />
                  <Button size="sm" onClick={handlePostComment}>Post</Button>
              </div>
          </div>
      </Modal>

      {/* --- CHAT MODAL --- */}
      <Modal isOpen={showChat} onClose={() => setShowChat(false)} title="Chat">
          <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {chatMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                              m.senderId === user.id 
                              ? 'bg-indigo-600 text-white rounded-br-none' 
                              : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm'
                          }`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {chatMessages.length === 0 && <p className="text-center text-xs text-gray-400 my-auto">Start the conversation!</p>}
              </div>
              <div className="mt-4 flex gap-2">
                  <Input 
                      placeholder="Type a message..." 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button size="sm" onClick={handleSendMessage} disabled={!chatInput}><Send className="w-4 h-4" /></Button>
              </div>
          </div>
      </Modal>

    </div>
  );
};

export default ReelsView;
