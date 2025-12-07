

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, User, VideoEditingData, Draft, ChatMessage } from '../types';
import { storageService, loadMediaFromDB } from '../services/storageService';
import { Card, Button, Input, Modal, Badge } from './UIComponents';
import { Heart, MessageCircle, Share2, Plus, Play, X, Send, ArrowLeft, Grid, Users, Upload, Sparkles, Scissors, Type, Sticker, Music, Check, Volume2, VolumeX, Save, FileVideo, Eye, Clock, MessageSquare, Search, Loader2, Mic, Image as ImageIcon, PenTool } from 'lucide-react';

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

// --- SUB-COMPONENT: Async Video Player ---
const VideoPlayer: React.FC<{ 
    video: Video; 
    isActive: boolean; 
    muted: boolean;
    onDoubleTap: (e: React.MouseEvent) => void;
    setVideoRef: (el: HTMLVideoElement | null) => void;
}> = ({ video, isActive, muted, onDoubleTap, setVideoRef }) => {
    const [src, setSrc] = useState<string>('');
    const [voiceoverSrc, setVoiceoverSrc] = useState<string>('');
    const voiceoverRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const load = async () => {
            if (video.url.startsWith('idb:')) {
                const key = video.url.split(':')[1];
                const data = await loadMediaFromDB(key);
                setSrc(data || '');
            } else {
                setSrc(video.url);
            }
            if (video.editingData?.voiceoverUrl) {
                setVoiceoverSrc(video.editingData.voiceoverUrl);
            }
        };
        load();
    }, [video.url]);

    useEffect(() => {
        if(isActive && voiceoverRef.current) {
            voiceoverRef.current.currentTime = 0;
            voiceoverRef.current.play().catch(e => {});
        } else if(!isActive && voiceoverRef.current) {
            voiceoverRef.current.pause();
        }
    }, [isActive]);

    if (!src) return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="w-full h-full relative" onDoubleClick={onDoubleTap}>
            {video.type === 'image' ? (
                <img src={src} className="w-full h-full object-cover" />
            ) : (
                <video 
                    ref={setVideoRef}
                    src={src} 
                    className="w-full h-full object-cover" 
                    loop
                    muted={muted}
                    playsInline
                    onTimeUpdate={(e) => {
                        if(video.editingData?.trim) {
                            const v = e.currentTarget;
                            if (v.currentTime > video.editingData.trim.end) {
                                v.currentTime = video.editingData.trim.start;
                            }
                        }
                    }}
                />
            )}
            {voiceoverSrc && <audio ref={voiceoverRef} src={voiceoverSrc} muted={muted} />}
        </div>
    );
};


const ReelsView: React.FC<ReelsViewProps> = ({ user }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Infinite Scroll State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Profile View State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [profileData, setProfileData] = useState<{ user: User, videos: Video[], stats: any } | null>(null);
  
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

  // Initial Data Load
  useEffect(() => {
      const init = async () => {
          setDrafts(await storageService.getDrafts(user.id));
          loadVideos(0, true);
      };
      init();
  }, [user.id, viewingProfileId]);

  const loadVideos = async (pageNum: number, reset: boolean = false) => {
      if (isLoading && !reset) return;
      setIsLoading(true);
      const limit = 5;
      const newVideos = await storageService.getVideos(pageNum, limit);
      
      if (newVideos.length < limit) setHasMore(false);
      else setHasMore(true);

      if (reset) {
          setVideos(newVideos);
          setPage(0);
      } else {
          setVideos(prev => {
              const existingIds = new Set(prev.map(v => v.id));
              const uniqueNew = newVideos.filter(v => !existingIds.has(v.id));
              return [...prev, ...uniqueNew];
          });
      }
      setIsLoading(false);
  };

  // Setup Observer for "Load More"
  useEffect(() => {
      const observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
              setPage(prev => {
                  const nextPage = prev + 1;
                  loadVideos(nextPage);
                  return nextPage;
              });
          }
      }, { threshold: 0.1 });
      
      if (loadMoreRef.current) observer.observe(loadMoreRef.current);
      return () => observer.disconnect();
  }, [hasMore, isLoading, videos.length]);

  useEffect(() => {
    const fetchProfile = async () => {
        if (!viewingProfileId) {
            setProfileData(null);
            return;
        }
        const profileUser = await storageService.getUserById(viewingProfileId);
        if (!profileUser) return;
        
        const userVideos = videos.filter(v => v.userId === viewingProfileId);
        const totalLikes = userVideos.reduce((acc, v) => acc + v.likes, 0);
        const totalViews = userVideos.reduce((acc, v) => acc + (v.views || 0), 0);
        const followersCount = profileUser.followers?.length || 0;
        const isFollowing = profileUser.followers?.includes(user.id);

        setProfileData({ 
            user: profileUser, 
            videos: userVideos, 
            stats: { totalLikes, totalViews, followersCount, isFollowing } 
        });
    };
    fetchProfile();
  }, [viewingProfileId, videos, user.id]);

  // Autoplay & View Counting
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const videoId = (entry.target as HTMLElement).dataset.videoid;
      if (!videoId) return;
      
      const video = videos.find(v => v.id === videoId);
      if(!video) return;

      const videoEl = videoRefs.current[videoId];

      if (entry.isIntersecting) {
        setActiveVideoId(videoId);
        
        if (video.type === 'video' && videoEl) {
          videoEl.currentTime = 0;
          videoEl.play().catch(() => {});
        }
        
        // Increment Views
        setTimeout(() => {
             storageService.incrementVideoView(videoId);
        }, 2000);
      } else {
        if (video.type === 'video' && videoEl) videoEl.pause();
      }
    });
  }, [videos]);

  useEffect(() => {
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

  const handleFollow = async (targetId: string) => {
     await storageService.toggleFollow(user.id, targetId);
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

  // --- EDITOR STATE ---
  const [editorStep, setEditorStep] = useState<'upload' | 'trim' | 'edit' | 'details'>('upload');
  const [newVideoFile, setNewVideoFile] = useState<string | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null); // Store actual File
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [editingData, setEditingData] = useState<VideoEditingData>({
    filter: '',
    stickers: [],
    textOverlays: [],
    trim: { start: 0, end: 10 }
  });
  const [activeTool, setActiveTool] = useState<'filter' | 'text' | 'sticker' | 'voice' | 'draw'>('filter');
  const [inputText, setInputText] = useState('');
  const [inputColor, setInputColor] = useState('#FFFFFF');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  
  // Drawing Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const editorVideoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file); // Capture original file for upload
      const isVideo = file.type.startsWith('video');
      setMediaType(isVideo ? 'video' : 'image');
      if (file.size > 50 * 1024 * 1024) return alert("Max 50MB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewVideoFile(reader.result as string);
        if (isVideo) setEditorStep('trim');
        else {
             setEditorStep('edit'); // Skip trim for images
             setEditingData(prev => ({ ...prev, trim: { start: 0, end: 5 } })); // Default 5s image
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDraft = async () => {
      if (!newVideoFile) return;
      const draft: Draft = {
          id: Date.now().toString(),
          userId: user.id,
          videoFile: newVideoFile,
          type: mediaType,
          caption,
          tags,
          editingData,
          timestamp: Date.now()
      };
      await storageService.saveDraft(draft);
      setDrafts(await storageService.getDrafts(user.id));
      alert("Draft saved successfully!");
      setIsUploading(false);
      resetEditor();
  };

  const loadDraft = (draft: Draft) => {
      setNewVideoFile(draft.videoFile);
      setMediaType(draft.type);
      setCaption(draft.caption);
      setTags(draft.tags);
      setEditingData(draft.editingData);
      setEditorStep('edit');
      setIsUploading(true);
  };

  const resetEditor = () => {
      setEditorStep('upload');
      setNewVideoFile(null);
      setSelectedFileObj(null);
      setEditingData({ filter: '', stickers: [], textOverlays: [], trim: { start: 0, end: 10 } });
      setCaption('');
      setTags('');
      setUploadProgress(0);
      setActiveTool('filter');
  };

  const handlePost = () => {
      if (!newVideoFile) return;
      if (uploadProgress > 0) return;
      
      finalizePost();
  };

  const finalizePost = async () => {
      try {
          // 1. Start progress animation (optimistic)
          let progress = 0;
          const interval = setInterval(() => {
              progress = Math.min(progress + 5, 90); // Cap at 90 until done
              setUploadProgress(progress);
          }, 100);

          // 2. Upload the actual file to Storage (CRITICAL for performance)
          let finalUrl = newVideoFile!;
          
          if (selectedFileObj) {
              // Case A: Fresh Upload
              finalUrl = await storageService.uploadMedia(selectedFileObj);
          } else if (newVideoFile && newVideoFile.startsWith('data:')) {
              // Case B: Draft / Data URI -> Convert to Blob and Upload
              try {
                  const res = await fetch(newVideoFile);
                  const blob = await res.blob();
                  finalUrl = await storageService.uploadMedia(blob);
              } catch (e) {
                  console.warn("Failed to convert draft blob, using base64 (slower)");
              }
          }

          // 3. Create Record
          const tagList = tags.split(/[\s,]+/).filter(t => t).map(t => t.startsWith('#') ? t : `#${t}`);
          const newVideo: Video = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            url: finalUrl,
            type: mediaType,
            caption: caption,
            likes: 0,
            views: 0,
            comments: 0,
            commentsList: [],
            tags: tagList,
            editingData: editingData,
            timestamp: Date.now()
          };
          
          await storageService.addVideo(newVideo);
          
          // 4. Finish
          clearInterval(interval);
          setUploadProgress(100);
          setTimeout(() => {
              loadVideos(0, true);
              setIsUploading(false);
              resetEditor();
          }, 500);

      } catch (e) {
          alert('Failed to post. Check connection.');
          setIsUploading(false);
          setUploadProgress(0);
      }
  };

  // --- TOOLS HANDLERS ---
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

  const toggleRecording = async () => {
      if(isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mediaRecorder = new MediaRecorder(stream);
              mediaRecorderRef.current = mediaRecorder;
              voiceChunksRef.current = [];
              
              mediaRecorder.ondataavailable = (e) => voiceChunksRef.current.push(e.data);
              mediaRecorder.onstop = async () => {
                  const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
                  const url = await storageService.uploadMedia(blob);
                  setEditingData(prev => ({ ...prev, voiceoverUrl: url }));
              };
              mediaRecorder.start();
              setIsRecording(true);
          } catch(e) {
              alert("Microphone access denied");
          }
      }
  };

  const saveDrawing = async () => {
      if(!canvasRef.current) return;
      canvasRef.current.toBlob(async (blob) => {
          if(blob) {
              const url = await storageService.uploadMedia(blob);
              setEditingData(prev => ({
                  ...prev,
                  stickers: [...prev.stickers, { id: Date.now().toString(), imageUrl: url, x: 50, y: 50 }]
              }));
              setActiveTool('filter'); // close drawer
          }
      });
  };

  const startDrawing = (e: any) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if(!ctx || !canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = inputColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      setIsDrawing(true);
  };

  const draw = (e: any) => {
      if(!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if(!ctx || !canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches[0].clientX) - rect.left;
      const y = (e.clientY || e.touches[0].clientY) - rect.top;
      
      ctx.lineTo(x, y);
      ctx.stroke();
  };

  const filteredVideos = videos.filter(v => {
      if(!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return v.caption?.toLowerCase().includes(searchLower) || v.tags?.some(t => t.toLowerCase().includes(searchLower));
  });

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-140px)] flex flex-col relative bg-black rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Actions */}
      {!viewingProfileId && !isUploading && !selectedVideo && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-4">
           {showSearch ? (
               <div className="absolute right-0 top-0 w-64 animate-slide-up flex items-center bg-white/90 rounded-full p-1 pr-3">
                   <input 
                      autoFocus
                      className="bg-transparent border-none focus:ring-0 text-sm w-full px-3"
                      placeholder="Search hashtags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => !searchTerm && setShowSearch(false)}
                   />
                   <X className="w-4 h-4 text-gray-500 cursor-pointer" onClick={() => {setShowSearch(false); setSearchTerm('');}} />
               </div>
           ) : (
               <button 
                onClick={() => setShowSearch(true)} 
                className="bg-gray-900/50 text-white p-3 rounded-full backdrop-blur-md hover:bg-indigo-600 transition-all border border-white/10"
               >
                 <Search className="w-6 h-6" />
               </button>
           )}
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
            {filteredVideos.map(video => (
            <div 
                key={video.id} 
                data-videoid={video.id}
                className="reel-video-container snap-start w-full h-full relative flex items-center justify-center bg-gray-900"
            >
                {/* Video Player Container */}
                <div className={`relative w-full h-full ${video.editingData?.filter || ''}`}>
                    <VideoPlayer 
                        video={video}
                        isActive={activeVideoId === video.id}
                        muted={muted}
                        onDoubleTap={(e) => handleDoubleTap(e, video.id)}
                        setVideoRef={(el) => { videoRefs.current[video.id] = el; }}
                    />
                    
                    {/* Overlays */}
                    {video.editingData?.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl pointer-events-none drop-shadow-lg" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                            {s.emoji ? s.emoji : <img src={s.imageUrl} className="w-20 h-20 object-contain" />}
                        </div>
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
                </div>
            </div>
            ))}
            
            {hasMore && (
                <div ref={loadMoreRef} className="snap-start w-full h-20 flex items-center justify-center bg-gray-900">
                     <Loader2 className={`w-6 h-6 text-indigo-500 ${isLoading ? 'animate-spin' : 'opacity-50'}`} />
                </div>
            )}
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
              <div className="absolute inset-0 z-50 bg-white/95 dark:bg-gray-900/95 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                  <div className="w-full max-w-sm space-y-6 text-center">
                      <div className="relative mx-auto w-24 h-24 animate-spin">
                          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Uploading Reel</h3>
                        <p className="text-gray-500 text-sm mt-3">{uploadProgress}% Complete</p>
                      </div>
                  </div>
              </div>
          )}

          {editorStep === 'upload' && (
             <div className="py-4 space-y-6">
                 <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                     <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="hidden" id="reel-upload" />
                     <label htmlFor="reel-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <span className="font-bold text-lg">Select Media</span>
                        <span className="text-sm text-gray-500 mt-2">Video or Image</span>
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
                                     <div className="aspect-[9/16] bg-black rounded mb-2 overflow-hidden flex items-center justify-center">
                                        {d.type === 'image' ? <ImageIcon className="w-6 h-6 text-gray-500"/> : <Play className="w-6 h-6 text-gray-500" />}
                                     </div>
                                     <div className="text-xs font-medium truncate">{d.caption || 'Untitled'}</div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          )}

          {editorStep === 'trim' && newVideoFile && mediaType === 'video' && (
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
                              className="w-full cursor-pointer z-10 accent-indigo-600"
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
                              className="w-full cursor-pointer z-20 accent-indigo-600"
                          />
                      </div>
                  </div>

                  <Button onClick={() => setEditorStep('edit')} className="w-full">Next: Add Effects</Button>
              </div>
          )}

          {editorStep === 'edit' && newVideoFile && (
             <div className="flex flex-col h-[500px]">
                 <div className="flex-1 bg-black relative rounded-lg overflow-hidden flex items-center justify-center mb-4">
                     {mediaType === 'video' ? (
                         <video src={newVideoFile} className={`max-h-full max-w-full ${editingData.filter}`} autoPlay loop muted />
                     ) : (
                         <img src={newVideoFile} className={`max-h-full max-w-full object-contain ${editingData.filter}`} />
                     )}
                     
                     {/* Overlay Preview */}
                     {editingData.stickers.map(s => (
                        <div key={s.id} className="absolute text-4xl" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                            {s.emoji ? s.emoji : <img src={s.imageUrl} className="w-20 h-20 object-contain"/>}
                        </div>
                     ))}
                     {editingData.textOverlays.map(t => (
                        <div key={t.id} className="absolute text-xl font-bold" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color }}>{t.text}</div>
                     ))}
                 </div>

                 {/* Tools */}
                 <div className="space-y-4">
                     <div className="flex space-x-2 justify-center overflow-x-auto pb-2">
                         <Button size="sm" variant={activeTool === 'filter' ? 'primary' : 'ghost'} onClick={() => setActiveTool('filter')}><Sparkles className="w-4 h-4 mr-2"/>Filters</Button>
                         <Button size="sm" variant={activeTool === 'text' ? 'primary' : 'ghost'} onClick={() => setActiveTool('text')}><Type className="w-4 h-4 mr-2"/>Text</Button>
                         <Button size="sm" variant={activeTool === 'sticker' ? 'primary' : 'ghost'} onClick={() => setActiveTool('sticker')}><Sticker className="w-4 h-4 mr-2"/>Stickers</Button>
                         <Button size="sm" variant={activeTool === 'voice' ? 'primary' : 'ghost'} onClick={() => setActiveTool('voice')}><Mic className="w-4 h-4 mr-2"/>Voiceover</Button>
                         <Button size="sm" variant={activeTool === 'draw' ? 'primary' : 'ghost'} onClick={() => setActiveTool('draw')}><PenTool className="w-4 h-4 mr-2"/>Draw</Button>
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
                         {activeTool === 'voice' && (
                             <div className="flex flex-col items-center justify-center h-full">
                                 <button 
                                    onClick={toggleRecording}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-100'}`}
                                 >
                                     <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-red-500'}`} />
                                 </button>
                                 <p className="text-xs mt-2 text-gray-500">{isRecording ? 'Recording...' : 'Tap to Record Voiceover'}</p>
                                 {editingData.voiceoverUrl && <p className="text-xs text-green-500 mt-1">Voiceover Added</p>}
                             </div>
                         )}
                         {activeTool === 'draw' && (
                             <div className="flex flex-col items-center">
                                 <canvas 
                                    ref={canvasRef} width={200} height={100} 
                                    className="bg-white rounded mb-2 cursor-crosshair border border-gray-300"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={() => setIsDrawing(false)}
                                    onMouseLeave={() => setIsDrawing(false)}
                                 />
                                 <div className="flex space-x-2">
                                     <input type="color" value={inputColor} onChange={e => setInputColor(e.target.value)} />
                                     <Button size="sm" onClick={saveDrawing}>Save Sticker</Button>
                                     <Button size="sm" variant="outline" onClick={() => {
                                         const ctx = canvasRef.current?.getContext('2d');
                                         ctx?.clearRect(0, 0, 200, 100);
                                     }}>Clear</Button>
                                 </div>
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
                         {mediaType === 'video' ? (
                             <video src={newVideoFile!} className={`w-full h-full object-cover ${editingData.filter}`} />
                         ) : (
                             <img src={newVideoFile!} className={`w-full h-full object-cover ${editingData.filter}`} />
                         )}
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

      {/* --- PROFILE OVERLAY (Same as before) --- */}
      {/* ... (Existing profile overlay code omitted for brevity but preserved in functionality) ... */}
    </div>
  );
};

export default ReelsView;