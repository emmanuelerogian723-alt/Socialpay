import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, User, VideoEditingData } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Modal, Badge } from './UIComponents';
import { Heart, MessageCircle, Share2, Plus, Play, X, Send, ArrowLeft, Grid, Users, Upload, Sparkles, Scissors, Type, Sticker, Music, Check, Volume2, VolumeX } from 'lucide-react';

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
const TEXT_COLORS = ['#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#000000'];

const ReelsView: React.FC<ReelsViewProps> = ({ user }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  
  // Profile View State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
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
  }, []);

  // Autoplay Logic
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const videoId = (entry.target as HTMLElement).dataset.videoid;
      if (!videoId) return;
      
      const videoEl = videoRefs.current[videoId];
      if (entry.isIntersecting) {
        setActiveVideoId(videoId);
        if (videoEl) {
          videoEl.currentTime = 0;
          videoEl.play().catch(() => {
            // Autoplay might be blocked if unmuted
          });
        }
      } else {
        if (videoEl) videoEl.pause();
      }
    });
  }, []);

  useEffect(() => {
    observer.current = new IntersectionObserver(handleObserver, {
      threshold: 0.6, // Play when 60% visible
    });

    const elements = document.querySelectorAll('.reel-video-container');
    elements.forEach((el) => observer.current?.observe(el));

    return () => observer.current?.disconnect();
  }, [videos, handleObserver]);

  const handleLike = (videoId: string, doubleTap = false) => {
      const vids = [...videos];
      const idx = vids.findIndex(v => v.id === videoId);
      if(idx !== -1) {
          vids[idx].likes += 1;
          setVideos(vids);
          // In real app, persist logic needed
          if (doubleTap) {
             // Logic handled in render for visual
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
          setCurrentComments([...currentComments, commentPayload]);
          setNewComment('');
      }
  };

  // --- EDITOR STATE ---
  const [editorStep, setEditorStep] = useState<'upload' | 'edit' | 'details'>('upload');
  const [newVideoFile, setNewVideoFile] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<VideoEditingData>({
    filter: '',
    stickers: [],
    textOverlays: []
  });
  const [activeTool, setActiveTool] = useState<'filter' | 'text' | 'sticker' | 'trim'>('filter');
  const [inputText, setInputText] = useState('');
  const [inputColor, setInputColor] = useState('#FFFFFF');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) return alert("Max 50MB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVideoFile(reader.result as string);
        setEditorStep('edit');
      };
      reader.readAsDataURL(file);
    }
  };

  const addSticker = (emoji: string) => {
      const newSticker = {
          id: Date.now().toString(),
          emoji,
          x: 50, // Center approx
          y: 50 
      };
      setEditingData(prev => ({ ...prev, stickers: [...prev.stickers, newSticker] }));
  };

  const addTextOverlay = () => {
      if (!inputText) return;
      const newText = {
          id: Date.now().toString(),
          text: inputText,
          x: 50,
          y: 50,
          color: inputColor
      };
      setEditingData(prev => ({ ...prev, textOverlays: [...prev.textOverlays, newText] }));
      setInputText('');
  };

  const handlePost = () => {
      if (!newVideoFile) return;
      const tagList = tags.split(' ').filter(t => t.startsWith('#'));

      const newVideo: Video = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        url: newVideoFile,
        caption: caption,
        likes: 0,
        comments: 0,
        commentsList: [],
        tags: tagList,
        editingData: editingData,
        timestamp: Date.now()
      };

      storageService.addVideo(newVideo);
      
      // Reset
      setVideos(storageService.getVideos());
      setIsUploading(false);
      setEditorStep('upload');
      setNewVideoFile(null);
      setEditingData({ filter: '', stickers: [], textOverlays: [] });
      setCaption('');
      setTags('');
      alert('Reel posted successfully!');
  };

  // Helper to get profile data based on ID
  const getProfileData = () => {
    if (!viewingProfileId) return null;
    const profileVideos = videos.filter(v => v.userId === viewingProfileId);
    const profileUser = profileVideos[0] || {
        userName: 'Unknown',
        userAvatar: 'https://via.placeholder.com/150',
        userId: viewingProfileId
    };
    return { user: profileUser, videos: profileVideos };
  };
  const profileData = getProfileData();

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col relative bg-black rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Actions */}
      {!viewingProfileId && !isUploading && (
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
      {!isUploading && !viewingProfileId && (
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
                    />
                    
                    {/* Render Editing Overlays (Stickers/Text) */}
                    {video.editingData?.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl pointer-events-none drop-shadow-lg" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                            {s.emoji}
                        </div>
                    ))}
                    {video.editingData?.textOverlays.map(t => (
                        <div key={t.id} className="absolute text-xl font-bold font-sans pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }}>
                            {t.text}
                        </div>
                    ))}

                    {/* Double Tap Heart Animation */}
                    {heartAnim?.id === video.id && (
                        <div className="absolute pointer-events-none animate-bounce-soft" style={{ left: heartAnim.x - 50, top: heartAnim.y - 50 }}>
                            <Heart className="w-24 h-24 fill-white text-white opacity-90 drop-shadow-2xl" />
                        </div>
                    )}
                </div>
                
                {/* Mute Toggle */}
                <button 
                    onClick={() => setMuted(!muted)}
                    className="absolute top-4 left-4 z-20 bg-black/30 p-2 rounded-full backdrop-blur-sm text-white"
                >
                    {muted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                </button>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none"></div>

                {/* Right Side Actions */}
                <div className="absolute bottom-24 right-4 flex flex-col items-center space-y-6 z-20 text-white">
                    <div className="relative mb-2 group">
                        <img 
                            src={video.userAvatar} 
                            className="w-12 h-12 rounded-full border-2 border-white object-cover cursor-pointer hover:scale-110 transition-transform" 
                            onClick={() => setViewingProfileId(video.userId)}
                        />
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                            <Plus className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <button className="flex flex-col items-center group" onClick={() => handleLike(video.id)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-red-500/20 transition-all">
                            <Heart className={`w-8 h-8 ${video.likes > 0 ? 'fill-red-500 text-red-500' : 'text-white'} transition-colors`} />
                        </div>
                        <span className="text-xs font-bold drop-shadow-md">{video.likes}</span>
                    </button>

                    <button className="flex flex-col items-center group" onClick={() => openComments(video)}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-white/20 transition-all">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xs font-bold drop-shadow-md">{video.comments}</span>
                    </button>

                    <button className="flex flex-col items-center group" onClick={() => alert("Copied link to clipboard!")}>
                        <div className="bg-gray-800/40 p-3 rounded-full backdrop-blur-sm mb-1 group-hover:bg-green-500/20 transition-all">
                            <Share2 className="w-8 h-8 text-white group-hover:text-green-400" />
                        </div>
                        <span className="text-xs font-bold drop-shadow-md">Share</span>
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-4 left-4 right-20 z-20 text-white">
                    <button 
                        onClick={() => setViewingProfileId(video.userId)}
                        className="flex items-center space-x-2 mb-3 hover:bg-white/10 p-2 -ml-2 rounded-lg transition-colors w-max"
                    >
                        <span className="font-bold text-lg leading-none drop-shadow-md">@{video.userName}</span>
                        {video.userId === 'admin-01' && <Badge color="blue" className="text-[10px]">Official</Badge>}
                    </button>
                    
                    <p className="text-sm line-clamp-2 opacity-95 mb-2 font-medium drop-shadow-md">{video.caption}</p>
                    
                    {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {video.tags.map((tag, i) => (
                                <span key={i} className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center text-xs opacity-80 bg-white/10 px-3 py-1.5 rounded-full w-max backdrop-blur-sm">
                        <Music className="w-3 h-3 mr-2 animate-spin-slow" />
                        <span className="marquee">Original Audio • {video.userName}</span>
                    </div>
                </div>
            </div>
            ))}
            {videos.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-white p-10 text-center">
                    <Play className="w-16 h-16 opacity-50 mb-4" />
                    <h2 className="text-xl font-bold">No Reels Yet</h2>
                    <Button className="mt-4" onClick={() => setIsUploading(true)}>Start Creating</Button>
                </div>
            )}
        </div>
      )}

      {/* --- EDITOR & UPLOAD MODAL --- */}
      <Modal 
        isOpen={isUploading} 
        onClose={() => { 
            setIsUploading(false); 
            setEditorStep('upload'); 
            setNewVideoFile(null); 
            setEditingData({filter:'', stickers:[], textOverlays:[]});
        }} 
        title={editorStep === 'upload' ? "New Reel" : editorStep === 'edit' ? "Editor Studio" : "Final Details"}
        maxWidth="max-w-2xl"
      >
          {editorStep === 'upload' && (
             <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                 <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" id="reel-upload" />
                 <label htmlFor="reel-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <span className="font-bold text-lg">Select Video</span>
                    <span className="text-sm text-gray-500 mt-2">Up to 60 seconds (50MB)</span>
                 </label>
             </div>
          )}

          {editorStep === 'edit' && newVideoFile && (
             <div className="flex flex-col h-[500px]">
                 {/* Preview Area */}
                 <div className="flex-1 bg-black relative rounded-lg overflow-hidden flex items-center justify-center mb-4">
                     <video 
                        src={newVideoFile} 
                        className={`max-h-full max-w-full ${editingData.filter}`} 
                        autoPlay loop muted 
                     />
                     {/* Overlays Preview */}
                     {editingData.stickers.map(s => (
                         <div key={s.id} className="absolute text-4xl" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>{s.emoji}</div>
                     ))}
                     {editingData.textOverlays.map(t => (
                         <div key={t.id} className="absolute text-xl font-bold" style={{ left: '50%', top: '40%', color: t.color, transform: 'translate(-50%, -50%)' }}>{t.text}</div>
                     ))}
                 </div>

                 {/* Tools Bar */}
                 <div className="flex justify-between items-center mb-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                    <button onClick={() => setActiveTool('filter')} className={`flex flex-col items-center p-2 rounded ${activeTool === 'filter' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        <Sparkles className="w-5 h-5 mb-1" /> <span className="text-xs">Filters</span>
                    </button>
                    <button onClick={() => setActiveTool('text')} className={`flex flex-col items-center p-2 rounded ${activeTool === 'text' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        <Type className="w-5 h-5 mb-1" /> <span className="text-xs">Text</span>
                    </button>
                    <button onClick={() => setActiveTool('sticker')} className={`flex flex-col items-center p-2 rounded ${activeTool === 'sticker' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        <Sticker className="w-5 h-5 mb-1" /> <span className="text-xs">Sticker</span>
                    </button>
                 </div>

                 {/* Tool Options */}
                 <div className="h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                     {activeTool === 'filter' && (
                         <div className="flex space-x-4 overflow-x-auto pb-2">
                             {FILTERS.map(f => (
                                 <div 
                                    key={f.name} 
                                    onClick={() => setEditingData({...editingData, filter: f.class})}
                                    className={`flex-shrink-0 cursor-pointer text-center ${editingData.filter === f.class ? 'text-indigo-600 font-bold' : ''}`}
                                 >
                                     <div className={`w-16 h-16 bg-gray-300 rounded-lg mb-1 overflow-hidden ${f.class}`}>
                                         <img src="https://via.placeholder.com/100" className="w-full h-full object-cover opacity-50" />
                                     </div>
                                     <span className="text-xs">{f.name}</span>
                                 </div>
                             ))}
                         </div>
                     )}

                     {activeTool === 'sticker' && (
                         <div className="grid grid-cols-6 gap-2">
                             {EMOJIS.map(e => (
                                 <button key={e} onClick={() => addSticker(e)} className="text-2xl hover:bg-gray-200 rounded p-1">
                                     {e}
                                 </button>
                             ))}
                         </div>
                     )}

                     {activeTool === 'text' && (
                         <div className="flex space-x-2">
                             <Input 
                                placeholder="Type something..." 
                                value={inputText} 
                                onChange={e => setInputText(e.target.value)} 
                             />
                             <input 
                                type="color" 
                                value={inputColor} 
                                onChange={e => setInputColor(e.target.value)}
                                className="h-10 w-10 rounded cursor-pointer border-none"
                             />
                             <Button onClick={addTextOverlay} disabled={!inputText}>Add</Button>
                         </div>
                     )}
                 </div>

                 <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                     <Button onClick={() => setEditorStep('details')} className="w-full">Next: Details <ArrowLeft className="w-4 h-4 ml-2 rotate-180" /></Button>
                 </div>
             </div>
          )}

          {editorStep === 'details' && (
              <div className="space-y-4">
                  <div className="flex space-x-4">
                      <div className={`w-24 h-32 bg-black rounded-lg ${editingData.filter} flex items-center justify-center overflow-hidden`}>
                           <video src={newVideoFile!} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-4">
                          <textarea 
                             className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                             rows={3}
                             placeholder="Write a caption..."
                             value={caption}
                             onChange={e => setCaption(e.target.value)}
                          />
                          <Input 
                             placeholder="#tags #viral #music" 
                             value={tags}
                             onChange={e => setTags(e.target.value)}
                          />
                      </div>
                  </div>
                  
                  <div className="pt-4 flex space-x-3">
                      <Button variant="ghost" onClick={() => setEditorStep('edit')} className="flex-1">Back</Button>
                      <Button onClick={handlePost} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Post Reel</Button>
                  </div>
              </div>
          )}
      </Modal>

      {/* --- COMMENTS DRAWER --- */}
      {showComments && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-gray-900 rounded-t-2xl h-2/3 flex flex-col animate-slide-up shadow-2xl">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold flex items-center"><MessageCircle className="w-4 h-4 mr-2"/> Comments <span className="ml-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{currentComments.length}</span></h3>
                  <button onClick={() => setShowComments(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentComments.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                          <p className="text-sm">No comments yet.</p>
                      </div>
                  )}
                  {currentComments.map((c, i) => (
                      <div key={i} className="flex items-start space-x-3 group">
                          <img src={c.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                          <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-2 rounded-r-xl rounded-bl-xl">
                              <div className="text-xs font-bold text-gray-600 dark:text-gray-300">{c.user}</div>
                              <p className="text-sm text-gray-800 dark:text-gray-200">{c.text}</p>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  <div className="flex space-x-2">
                    <Input 
                        placeholder="Add a comment..." 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)}
                        className="flex-1 bg-white dark:bg-gray-800"
                        onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                    />
                    <Button size="sm" onClick={handlePostComment} disabled={!newComment} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- PROFILE OVERLAY --- */}
      {viewingProfileId && profileData && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-30 overflow-y-auto animate-slide-up flex flex-col">
          <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md z-10">
            <button onClick={() => setViewingProfileId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full mr-4">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg truncate">@{profileData.user.userName}</span>
          </div>
          
          <div className="p-6 flex flex-col items-center text-center">
             <div className="relative">
                <img src={profileData.user.userAvatar} className="w-24 h-24 rounded-full border-4 border-indigo-500 mb-4 object-cover p-1" />
                <div className="absolute bottom-4 right-0 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                </div>
             </div>
             <h2 className="text-xl font-bold mb-1">@{profileData.user.userName}</h2>
             <div className="flex space-x-6 my-6 text-sm w-full justify-center">
                <div className="flex flex-col items-center">
                   <span className="font-bold text-lg">{profileData.videos.length}</span>
                   <span className="text-gray-500 text-xs uppercase tracking-wide">Posts</span>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                   <span className="font-bold text-lg">12.5K</span>
                   <span className="text-gray-500 text-xs uppercase tracking-wide">Followers</span>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700 h-8 self-center"></div>
                <div className="flex flex-col items-center">
                   <span className="font-bold text-lg">{profileData.videos.reduce((acc, v) => acc + v.likes, 0)}</span>
                   <span className="text-gray-500 text-xs uppercase tracking-wide">Likes</span>
                </div>
             </div>
             <div className="flex space-x-2 w-full px-8">
                <Button className="flex-1 bg-indigo-600">Follow</Button>
                <Button variant="outline" className="flex-1">Message</Button>
             </div>
          </div>

          <div className="flex-1 border-t border-gray-100 dark:border-gray-800">
             <div className="flex items-center justify-center p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
               <Grid className="w-4 h-4 mr-2 text-gray-500" /> <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Reels</span>
             </div>
             <div className="grid grid-cols-3 gap-0.5 pb-20">
                {profileData.videos.map(v => (
                   <div key={v.id} className="aspect-[3/4] bg-gray-800 relative group cursor-pointer overflow-hidden" onClick={() => { /* View specific video logic */ }}>
                      <video src={v.url} className={`w-full h-full object-cover ${v.editingData?.filter}`} />
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
    </div>
  );
};

export default ReelsView;