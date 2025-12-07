
import React, { useState, useEffect, useRef } from 'react';
import { User, MusicTrack } from '../types';
import { storageService } from '../services/storageService';
import { Card, Button, Input, Modal, Badge } from './UIComponents';
import { Play, Pause, SkipForward, SkipBack, Music, Upload, Headphones, Mic, Volume2, Grid, Disc, Plus, DollarSign } from 'lucide-react';

interface MusicHubViewProps {
  user: User;
}

const MusicHubView: React.FC<MusicHubViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'studio' | 'upload'>('discover');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  
  // Player State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
      loadTracks();
  }, []);

  const loadTracks = async () => {
      setTracks(await storageService.getMusicTracks());
  };

  const handlePlay = (track: MusicTrack) => {
      if (currentTrack?.id === track.id) {
          if (isPlaying) {
              audioRef.current?.pause();
              setIsPlaying(false);
          } else {
              audioRef.current?.play();
              setIsPlaying(true);
          }
      } else {
          setCurrentTrack(track);
          setIsPlaying(true);
          // Auto play happens via effect or autoPlay prop, handled below
          // Record play & pay artist
          storageService.recordMusicPlay(track.id, track.artistId, track.price);
      }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center">
                <Music className="w-6 h-6 mr-2 text-pink-500" /> Music Hub
            </h1>
            <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('discover')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'discover' ? 'bg-white dark:bg-gray-700 shadow text-pink-500' : 'text-gray-500'}`}
                >
                    Discover
                </button>
                <button 
                    onClick={() => setActiveTab('studio')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'studio' ? 'bg-white dark:bg-gray-700 shadow text-cyan-500' : 'text-gray-500'}`}
                >
                    Beat Studio
                </button>
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-700 shadow text-indigo-500' : 'text-gray-500'}`}
                >
                    Upload
                </button>
            </div>
        </div>

        {/* --- DISCOVER TAB --- */}
        {activeTab === 'discover' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                {tracks.map(track => (
                    <Card key={track.id} className="overflow-hidden group hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800">
                        <div className="relative h-48 bg-gray-900">
                            <img src={track.coverUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <button 
                                onClick={() => handlePlay(track)}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors"
                            >
                                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                    {currentTrack?.id === track.id && isPlaying ? (
                                        <Pause className="w-6 h-6 text-black" />
                                    ) : (
                                        <Play className="w-6 h-6 text-black ml-1" />
                                    )}
                                </div>
                            </button>
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white font-bold">
                                {track.genre}
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-lg truncate">{track.title}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-sm text-gray-500">{track.artistName}</span>
                                <div className="flex items-center text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                    <Headphones className="w-3 h-3 mr-1" /> {track.plays}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                {tracks.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <Disc className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No tracks uploaded yet. Be the first!</p>
                    </div>
                )}
            </div>
        )}

        {/* --- BEAT STUDIO TAB --- */}
        {activeTab === 'studio' && <BeatSequencer />}

        {/* --- UPLOAD TAB --- */}
        {activeTab === 'upload' && <TrackUpload user={user} onSuccess={() => {setActiveTab('discover'); loadTracks();}} />}

        {/* --- GLOBAL PLAYER --- */}
        {currentTrack && (
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between z-50 shadow-2xl animate-slide-up">
                <audio 
                    ref={audioRef} 
                    src={currentTrack.audioUrl} 
                    autoPlay 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                />
                
                <div className="flex items-center space-x-4">
                    <img src={currentTrack.coverUrl} className="w-12 h-12 rounded bg-gray-200 object-cover" />
                    <div>
                        <div className="font-bold text-sm">{currentTrack.title}</div>
                        <div className="text-xs text-gray-500">{currentTrack.artistName}</div>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <button className="text-gray-400 hover:text-gray-600"><SkipBack className="w-5 h-5"/></button>
                    <button 
                        onClick={() => {
                            if(isPlaying) audioRef.current?.pause();
                            else audioRef.current?.play();
                        }}
                        className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5 ml-1"/>}
                    </button>
                    <button className="text-gray-400 hover:text-gray-600"><SkipForward className="w-5 h-5"/></button>
                </div>

                <div className="hidden md:flex items-center space-x-2 w-32">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>
        )}
    </div>
  );
};

// --- SUB-COMPONENT: Beat Sequencer ---
const BeatSequencer: React.FC = () => {
    const STEPS = 16;
    const ROWS = ['Kick', 'Snare', 'HiHat', 'Clap'];
    const [grid, setGrid] = useState<boolean[][]>(
        Array(4).fill(null).map(() => Array(STEPS).fill(false))
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [bpm, setBpm] = useState(120);

    // Audio Context (Mock Synthesis)
    const audioCtx = useRef<AudioContext | null>(null);

    useEffect(() => {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => { audioCtx.current?.close(); }
    }, []);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            const stepTime = (60 / bpm) * 1000 / 4;
            interval = setInterval(() => {
                setCurrentStep(prev => {
                    const next = (prev + 1) % STEPS;
                    playColumn(next);
                    return next;
                });
            }, stepTime);
        }
        return () => clearInterval(interval);
    }, [isPlaying, bpm, grid]);

    const playColumn = (step: number) => {
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;
        const time = ctx.currentTime;

        grid.forEach((row, i) => {
            if (row[step]) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                if (i === 0) { // Kick
                    osc.frequency.setValueAtTime(150, time);
                    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
                    gain.gain.setValueAtTime(1, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
                } else if (i === 1) { // Snare
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(100, time);
                    gain.gain.setValueAtTime(0.5, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                } else if (i === 2) { // HiHat
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800, time);
                    gain.gain.setValueAtTime(0.3, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
                } else { // Clap (Simulated noise)
                     osc.type = 'sawtooth';
                     osc.frequency.setValueAtTime(500, time);
                     gain.gain.setValueAtTime(0.4, time);
                     gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                }

                osc.start(time);
                osc.stop(time + 0.5);
            }
        });
    };

    const toggleCell = (r: number, c: number) => {
        const newGrid = [...grid];
        newGrid[r][c] = !newGrid[r][c];
        setGrid(newGrid);
    };

    return (
        <Card className="p-6 bg-gray-900 text-white animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-red-500' : 'bg-green-500'}`}
                    >
                        {isPlaying ? <Pause /> : <Play />}
                    </button>
                    <div>
                        <div className="text-xs text-gray-400">TEMPO</div>
                        <div className="font-mono font-bold text-xl">{bpm} BPM</div>
                    </div>
                    <input 
                        type="range" min="60" max="180" value={bpm} 
                        onChange={e => setBpm(Number(e.target.value))} 
                        className="w-32"
                    />
                </div>
                <div className="text-cyan-400 font-bold flex items-center">
                    <Grid className="w-5 h-5 mr-2" /> BEAT STUDIO
                </div>
            </div>

            <div className="space-y-2">
                {grid.map((row, r) => (
                    <div key={r} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-gray-400 font-bold uppercase">{ROWS[r]}</div>
                        {row.map((active, c) => (
                            <button
                                key={c}
                                onClick={() => toggleCell(r, c)}
                                className={`
                                    w-8 h-10 rounded transition-all 
                                    ${active ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-gray-800'}
                                    ${currentStep === c ? 'border border-white/50' : 'border border-transparent'}
                                    ${c % 4 === 0 ? 'ml-2' : ''}
                                `}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <p className="mt-4 text-xs text-center text-gray-500">Tap grid to toggle beats. Use play button to preview.</p>
        </Card>
    );
};

// --- SUB-COMPONENT: Track Upload ---
const TrackUpload: React.FC<{ user: User, onSuccess: () => void }> = ({ user, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('Pop');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!title || !audioFile || !coverFile) return alert("Please fill all fields");
        setIsUploading(true);
        
        try {
            const audioUrl = await storageService.uploadMedia(audioFile);
            const coverUrl = await storageService.uploadMedia(coverFile);

            const track: MusicTrack = {
                id: Date.now().toString(),
                artistId: user.id,
                artistName: user.name,
                title,
                genre,
                coverUrl,
                audioUrl,
                plays: 0,
                price: 0.005,
                createdAt: Date.now()
            };

            await storageService.uploadMusicTrack(track);
            alert("Track uploaded successfully!");
            onSuccess();
        } catch (e) {
            console.error(e);
            alert("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="max-w-lg mx-auto">
            <h3 className="text-lg font-bold mb-4">Upload New Track</h3>
            <div className="space-y-4">
                <Input placeholder="Track Title" value={title} onChange={e => setTitle(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium mb-1">Genre</label>
                    <select 
                        value={genre} onChange={e => setGenre(e.target.value)}
                        className="w-full p-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700"
                    >
                        <option>Pop</option><option>Hip Hop</option><option>Electronic</option><option>R&B</option><option>Rock</option><option>Afrobeat</option>
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                        <label className="cursor-pointer block">
                            <Music className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                            <span className="text-xs block font-bold text-indigo-500">Select Audio File</span>
                            <span className="text-[10px] text-gray-400 block mt-1">{audioFile ? audioFile.name : 'MP3/WAV'}</span>
                            <input type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                        <label className="cursor-pointer block">
                            <Disc className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                            <span className="text-xs block font-bold text-indigo-500">Select Cover Art</span>
                            <span className="text-[10px] text-gray-400 block mt-1">{coverFile ? coverFile.name : 'JPG/PNG'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center text-sm text-green-700 dark:text-green-400">
                    <DollarSign className="w-4 h-4 mr-2"/>
                    <span>You will earn <strong>$0.005</strong> per play.</span>
                </div>

                <Button className="w-full" onClick={handleUpload} isLoading={isUploading} disabled={!audioFile || !coverFile}>
                    Upload & Publish
                </Button>
            </div>
        </Card>
    );
};

export default MusicHubView;
