
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User } from '../types';
import { Button, Badge, Card, Input, Modal } from './UIComponents';
import { storageService } from '../services/storageService';
import { Wifi, Users, Zap, Trophy, Play, Cpu, Gamepad2, Brain, Puzzle, Calculator, Clock, CheckCircle, XCircle, ArrowLeft, Star, MessageSquare, Send, BookOpen, MousePointer2, AlertTriangle, Check } from 'lucide-react';

interface GameCentreViewProps {
  user: User;
  onUpdateUser: (u: User) => void;
}

type GameType = 'none' | 'cyber-slash' | 'word-hunt' | 'math-master';

// --- VISUAL GAME GUIDE MODAL ---
const GameGuideModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'cyber' | 'word' | 'math'>('cyber');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Game Manual & Rules" maxWidth="max-w-2xl">
            <div className="flex flex-col h-full">
                {/* Tabs */}
                <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                    <button 
                        onClick={() => setActiveTab('cyber')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'cyber' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-400'}`}
                    >
                        Cyber Slash
                    </button>
                    <button 
                        onClick={() => setActiveTab('word')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'word' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400'}`}
                    >
                        Word Hunt
                    </button>
                    <button 
                        onClick={() => setActiveTab('math')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'math' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400'}`}
                    >
                        Math Master
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {activeTab === 'cyber' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-gray-900 rounded-xl p-6 text-center border border-cyan-500/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-cyan-500/5 z-0"></div>
                                <h3 className="text-xl font-bold text-white relative z-10 mb-4">Objective: Slice & Survive</h3>
                                <div className="flex justify-center items-end gap-8 relative z-10">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-cyan-400 shadow-[0_0_20px_cyan] mb-2 animate-bounce-soft"></div>
                                        <span className="text-xs text-cyan-300 font-bold">Data Orb</span>
                                        <span className="text-xs text-white">+100 Pts</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-yellow-400 shadow-[0_0_20px_yellow] mb-2 animate-pulse"></div>
                                        <span className="text-xs text-yellow-300 font-bold">Gold Data</span>
                                        <span className="text-xs text-white">+500 Pts</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-14 h-14 rounded-full bg-red-500 shadow-[0_0_20px_red] mb-2 flex items-center justify-center text-2xl">☠️</div>
                                        <span className="text-xs text-red-400 font-bold">Glitch Bomb</span>
                                        <span className="text-xs text-white">-500 Pts</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><MousePointer2 className="w-4 h-4 mr-2"/> How to Play</div>
                                    <p className="text-gray-500">Click and drag (or swipe) across the screen to create a blade trail. Slice the orbs before they fall.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><AlertTriangle className="w-4 h-4 mr-2"/> Warning</div>
                                    <p className="text-gray-500">Do NOT slice the Red Glitch Bombs. They will deduct points instantly.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'word' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-gray-900 rounded-xl p-6 text-center border border-purple-500/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-purple-500/5 z-0"></div>
                                <h3 className="text-xl font-bold text-white relative z-10 mb-4">Objective: Find Hidden Words</h3>
                                <div className="w-32 mx-auto grid grid-cols-3 gap-1 relative z-10">
                                    <div className="w-10 h-10 bg-green-500 text-black font-bold flex items-center justify-center rounded">C</div>
                                    <div className="w-10 h-10 bg-green-500 text-black font-bold flex items-center justify-center rounded">A</div>
                                    <div className="w-10 h-10 bg-green-500 text-black font-bold flex items-center justify-center rounded">T</div>
                                    <div className="w-10 h-10 bg-white/10 text-gray-500 flex items-center justify-center rounded">X</div>
                                    <div className="w-10 h-10 bg-white/10 text-gray-500 flex items-center justify-center rounded">Y</div>
                                    <div className="w-10 h-10 bg-white/10 text-gray-500 flex items-center justify-center rounded">Z</div>
                                </div>
                                <div className="mt-2 text-green-400 font-bold text-sm relative z-10">Drag to Select</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><MousePointer2 className="w-4 h-4 mr-2"/> Controls</div>
                                    <p className="text-gray-500">Click and drag horizontally or vertically to highlight letters. Release to submit.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><Star className="w-4 h-4 mr-2"/> Scoring</div>
                                    <p className="text-gray-500">Find all words from the bottom list before time runs out. Each word gives 200 points.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'math' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="bg-gray-900 rounded-xl p-6 text-center border border-yellow-500/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/5 z-0"></div>
                                <h3 className="text-xl font-bold text-white relative z-10 mb-4">Objective: Speed Logic</h3>
                                <div className="flex justify-center gap-4 relative z-10">
                                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                                        <div className="text-2xl font-bold text-white">5 + ? = 12</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="bg-green-500 text-black px-4 py-1 rounded font-bold">7</div>
                                        <div className="bg-red-900/50 text-gray-500 px-4 py-1 rounded">4</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><Brain className="w-4 h-4 mr-2"/> Challenge Types</div>
                                    <p className="text-gray-500">You will face basic Arithmetic, Number Sequences, and Logic Puzzles.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                    <div className="font-bold flex items-center mb-1 text-gray-900 dark:text-white"><Clock className="w-4 h-4 mr-2"/> Penalties</div>
                                    <p className="text-gray-500">Correct answers give +100 points. Wrong answers deduct 5 seconds from the clock!</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button onClick={onClose} className="w-full">Got it, Let's Play!</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- IN-GAME CHAT COMPONENT ---
const InGameChat: React.FC<{ userName: string }> = ({ userName }) => {
    const [messages, setMessages] = useState<{id: string, sender: string, text: string, isSystem?: boolean}[]>([]);
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Simulated opponents for immersion
    const botNames = ['NeonDrifter', 'CyberPunk99', 'GlitchHunter', 'NullPointer'];
    const botPhrases = [
        "gl hf!", 
        "nice reflexes", 
        "lag?", 
        "wow nice combo", 
        "gg", 
        "watch out for bombs", 
        "anyone else seeing lag?",
        "My high score is 5000"
    ];

    useEffect(() => {
        // Initial welcome
        setMessages([{ id: 'sys-1', sender: 'System', text: 'Connected to Match Room #492', isSystem: true }]);

        // Simulate incoming messages
        const interval = setInterval(() => {
            if (Math.random() > 0.8) {
                const randomBot = botNames[Math.floor(Math.random() * botNames.length)];
                const randomPhrase = botPhrases[Math.floor(Math.random() * botPhrases.length)];
                addMessage(randomBot, randomPhrase);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const addMessage = (sender: string, text: string, isSystem = false) => {
        setMessages(prev => {
            const newMsgs = [...prev, { id: Date.now().toString(), sender, text, isSystem }];
            return newMsgs.slice(-10); // Keep last 10 messages
        });
    };

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        addMessage(userName, inputText);
        setInputText('');
    };

    return (
        <div 
            className="absolute bottom-4 left-4 w-72 h-48 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg flex flex-col z-30 pointer-events-auto shadow-lg"
            onMouseDown={(e) => e.stopPropagation()} // Prevent game click-through
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className="text-xs break-words">
                        {msg.isSystem ? (
                            <span className="text-yellow-400 italic opacity-80">{msg.text}</span>
                        ) : (
                            <>
                                <span className={`font-bold ${msg.sender === userName ? 'text-cyan-400' : 'text-purple-400'}`}>
                                    {msg.sender}:
                                </span> 
                                <span className="text-gray-200 ml-1">{msg.text}</span>
                            </>
                        )}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-2 border-t border-white/10 flex gap-1">
                <input 
                    className="flex-1 bg-white/10 border-none rounded px-2 py-1 text-xs text-white placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="Chat with players..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-1 rounded">
                    <Send className="w-3 h-3" />
                </button>
            </form>
        </div>
    );
};

// --- GAME 1: CYBER SLASH (Arcade) ---
const CyberSlashGame: React.FC<{ user: User, onFinish: (score: number) => void, onExit: () => void }> = ({ user, onFinish, onExit }) => {
    const [gameState, setGameState] = useState<'scanning' | 'playing' | 'gameover'>('scanning');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [connectionStrength, setConnectionStrength] = useState(0);
    const [networkPeers, setNetworkPeers] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const scoreRef = useRef(0);
    const objectsRef = useRef<any[]>([]);
    const particlesRef = useRef<any[]>([]);
    const mousePos = useRef({ x: 0, y: 0, isDown: false });
    const trailRef = useRef<{x: number, y: number}[]>([]);

    useEffect(() => {
        if (gameState === 'scanning') {
            let interval = setInterval(() => {
                setConnectionStrength(prev => Math.min(prev + 10, 100));
                if (Math.random() > 0.7) setNetworkPeers(prev => prev + Math.floor(Math.random() * 3));
            }, 200);

            setTimeout(() => {
                clearInterval(interval);
                setGameState('playing');
                startGame();
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [gameState]);

    const startGame = () => {
        setScore(0);
        scoreRef.current = 0;
        setTimeLeft(60);
        objectsRef.current = [];
        particlesRef.current = [];
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('gameover');
                    onFinish(scoreRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const animate = () => {
            updateGame();
            drawGame();
            if (timeLeft > 0 && gameState !== 'gameover') {
                requestRef.current = requestAnimationFrame(animate);
            }
        };
        requestRef.current = requestAnimationFrame(animate);
    };

    const spawnObject = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const typeRand = Math.random();
        let type = 'orb';
        let color = '#00f2ff';
        let radius = 25;

        if (typeRand > 0.95) { type = 'golden'; color = '#ffd700'; radius = 20; } 
        else if (typeRand > 0.8) { type = 'bomb'; color = '#ff0055'; radius = 30; }

        objectsRef.current.push({
            id: Date.now() + Math.random(),
            x: Math.random() * canvas.width,
            y: canvas.height + 50,
            vx: (Math.random() - 0.5) * 10,
            vy: -(Math.random() * 10 + 12),
            radius, type, active: true, color
        });
    };

    const updateGame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (Math.random() < 0.05) spawnObject();

        objectsRef.current.forEach(obj => {
            obj.x += obj.vx;
            obj.y += obj.vy;
            obj.vy += 0.3;
            
            const dx = mousePos.current.x - obj.x;
            const dy = mousePos.current.y - obj.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (obj.active && dist < obj.radius + 10 && mousePos.current.isDown) {
                obj.active = false;
                // Explosion particles
                for(let i=0; i<10; i++) particlesRef.current.push({x: obj.x, y: obj.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1, color: obj.color});
                
                if (obj.type === 'bomb') scoreRef.current = Math.max(0, scoreRef.current - 500);
                else if (obj.type === 'golden') scoreRef.current += 500;
                else scoreRef.current += 100;
                setScore(scoreRef.current);
            }
        });

        objectsRef.current = objectsRef.current.filter(obj => obj.y < canvas.height + 100 && obj.active);
        particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.05; });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        if (mousePos.current.isDown) {
            trailRef.current.push({ x: mousePos.current.x, y: mousePos.current.y });
            if (trailRef.current.length > 10) trailRef.current.shift();
        } else {
            trailRef.current = [];
        }
    };

    const drawGame = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.fillStyle = 'rgba(10, 10, 20, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        objectsRef.current.forEach(obj => {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = obj.color;
            ctx.fill();
            ctx.shadowBlur = 20;
            ctx.shadowColor = obj.color;
            if (obj.type === 'bomb') { ctx.fillStyle = 'white'; ctx.font = '20px Arial'; ctx.fillText('☠️', obj.x - 12, obj.y + 6); }
            ctx.closePath();
        });

        particlesRef.current.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        if (trailRef.current.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
            for (let i = 1; i < trailRef.current.length; i++) {
                ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
            }
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    };

    const handleInput = (x: number, y: number, isDown: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mousePos.current = {
            x: (x - rect.left) * (canvas.width / rect.width),
            y: (y - rect.top) * (canvas.height / rect.height),
            isDown
        };
    };

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center">
            {gameState === 'scanning' && (
                <div className="text-center z-10 p-8">
                    <Wifi className="w-16 h-16 text-green-400 mx-auto animate-pulse mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Scanning Peers...</h2>
                    <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4 mx-auto">
                        <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${connectionStrength}%` }}></div>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-green-400 bg-green-900/20 px-4 py-2 rounded-full border border-green-500/30">
                        <Users className="w-4 h-4" />
                        <span>Found {networkPeers} Players</span>
                    </div>
                </div>
            )}

            {gameState === 'playing' && (
                <>
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between pointer-events-none z-20">
                         <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-white">
                             <div className="text-xs text-gray-400">SCORE</div>
                             <div className="text-2xl font-bold text-yellow-400">{score}</div>
                         </div>
                         <div className={`text-4xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                             {timeLeft}
                         </div>
                    </div>
                    
                    {/* Chat Overlay */}
                    <InGameChat userName={user.name} />

                    <canvas 
                        ref={canvasRef} 
                        width={800} height={600} 
                        className="w-full h-full cursor-crosshair touch-none"
                        onMouseDown={(e) => handleInput(e.clientX, e.clientY, true)}
                        onMouseMove={(e) => mousePos.current.isDown && handleInput(e.clientX, e.clientY, true)}
                        onMouseUp={() => mousePos.current.isDown = false}
                        onMouseLeave={() => mousePos.current.isDown = false}
                        onTouchStart={(e) => handleInput(e.touches[0].clientX, e.touches[0].clientY, true)}
                        onTouchMove={(e) => handleInput(e.touches[0].clientX, e.touches[0].clientY, true)}
                        onTouchEnd={() => mousePos.current.isDown = false}
                    />
                </>
            )}

            {gameState === 'gameover' && (
                 <div className="text-center z-10 animate-fade-in">
                     <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                     <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
                     <p className="text-gray-400 mb-6">Final Score: <span className="text-white font-bold">{score}</span></p>
                     <Button onClick={onExit}>Return to Lobby</Button>
                 </div>
            )}
        </div>
    );
};

// --- GAME 2: WORD HUNT (Puzzle) ---
const WordHuntGame: React.FC<{ onFinish: (score: number) => void, onExit: () => void }> = ({ onFinish, onExit }) => {
    const GRID_SIZE = 8;
    const WORD_LIST = ['REACT', 'CODE', 'LOGIC', 'PAY', 'GAME', 'WEB', 'DATA', 'NODE'];
    
    const [grid, setGrid] = useState<string[][]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [selection, setSelection] = useState<{r:number, c:number}[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);
    const [gameOver, setGameOver] = useState(false);
    
    // Generate Grid on Mount
    useEffect(() => {
        initializeGrid();
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if(gameOver) onFinish(foundWords.length * 200);
    }, [gameOver]);

    const initializeGrid = () => {
        // Initialize empty grid
        const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
        const placedWords: string[] = [];

        // Simple placement logic
        WORD_LIST.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const dir = Math.random() > 0.5 ? 'H' : 'V';
                const r = Math.floor(Math.random() * GRID_SIZE);
                const c = Math.floor(Math.random() * GRID_SIZE);
                
                if (canPlace(newGrid, word, r, c, dir)) {
                    placeWord(newGrid, word, r, c, dir);
                    placed = true;
                }
                attempts++;
            }
        });

        // Fill empty spots
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                if(!newGrid[r][c]) newGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
        setGrid(newGrid);
    };

    const canPlace = (g: string[][], w: string, r: number, c: number, dir: string) => {
        if (dir === 'H' && c + w.length > GRID_SIZE) return false;
        if (dir === 'V' && r + w.length > GRID_SIZE) return false;
        for (let i = 0; i < w.length; i++) {
            const char = dir === 'H' ? g[r][c+i] : g[r+i][c];
            if (char !== '' && char !== w[i]) return false;
        }
        return true;
    };

    const placeWord = (g: string[][], w: string, r: number, c: number, dir: string) => {
        for (let i = 0; i < w.length; i++) {
            if (dir === 'H') g[r][c+i] = w[i];
            else g[r+i][c] = w[i];
        }
    };

    const handleMouseDown = (r: number, c: number) => {
        setIsDragging(true);
        setSelection([{r, c}]);
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (!isDragging) return;
        setSelection(prev => {
            const start = prev[0];
            // Only allow horizontal or vertical lines for simplicity
            if (r !== start.r && c !== start.c) return prev; // Must be straight line
            
            // Calculate line
            const newSel = [];
            if (r === start.r) {
                const minC = Math.min(start.c, c);
                const maxC = Math.max(start.c, c);
                for(let i=minC; i<=maxC; i++) newSel.push({r, c: i});
            } else {
                const minR = Math.min(start.r, r);
                const maxR = Math.max(start.r, r);
                for(let i=minR; i<=maxR; i++) newSel.push({r: i, c});
            }
            return newSel;
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Check word
        const word = selection.map(s => grid[s.r][s.c]).join('');
        const reversed = word.split('').reverse().join('');
        
        if ((WORD_LIST.includes(word) && !foundWords.includes(word)) || (WORD_LIST.includes(reversed) && !foundWords.includes(reversed))) {
            setFoundWords(prev => [...prev, WORD_LIST.includes(word) ? word : reversed]);
        }
        setSelection([]);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-indigo-900/50 p-4 rounded-xl text-white">
            {!gameOver ? (
                <>
                    <div className="flex justify-between w-full max-w-md mb-4 px-4">
                        <div className="text-xl font-bold flex items-center"><Clock className="w-5 h-5 mr-2"/> {timeLeft}s</div>
                        <div className="text-xl font-bold flex items-center"><Star className="w-5 h-5 mr-2 text-yellow-400"/> {foundWords.length} / {WORD_LIST.length}</div>
                    </div>

                    <div 
                        className="grid gap-1 bg-white/10 p-2 rounded-lg select-none touch-none"
                        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                        onMouseUp={handleMouseUp}
                        onTouchEnd={handleMouseUp}
                    >
                        {grid.map((row, r) => row.map((char, c) => {
                            const isSelected = selection.some(s => s.r === r && s.c === c);
                            // Highlight if part of found word (requires checking grid logic, simplified here)
                            // Ideally store coordinates of found words
                            return (
                                <div 
                                    key={`${r}-${c}`}
                                    className={`w-10 h-10 flex items-center justify-center font-bold text-lg rounded cursor-pointer transition-colors
                                        ${isSelected ? 'bg-yellow-400 text-black' : 'bg-white/5 hover:bg-white/20'}
                                    `}
                                    onMouseDown={() => handleMouseDown(r, c)}
                                    onMouseEnter={() => handleMouseEnter(r, c)}
                                >
                                    {char}
                                </div>
                            );
                        }))}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                        {WORD_LIST.map(w => (
                            <span key={w} className={`px-3 py-1 rounded-full text-xs font-bold ${foundWords.includes(w) ? 'bg-green-500 text-white line-through opacity-50' : 'bg-white/10 text-gray-300'}`}>
                                {w}
                            </span>
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center animate-fade-in">
                    <Puzzle className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-2">Puzzle Complete!</h2>
                    <p className="text-gray-300 mb-6">You found {foundWords.length} words.</p>
                    <p className="text-xl font-bold text-yellow-400 mb-8">Score: {foundWords.length * 200}</p>
                    <Button onClick={onExit}>Back to Menu</Button>
                </div>
            )}
        </div>
    );
};

// --- GAME 3: MATH MASTER (Logic) ---
const MathMasterGame: React.FC<{ onFinish: (score: number) => void, onExit: () => void }> = ({ onFinish, onExit }) => {
    const [question, setQuestion] = useState<any>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    useEffect(() => {
        generateQuestion();
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameOver(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if(gameOver) onFinish(score);
    }, [gameOver]);

    const generateQuestion = () => {
        const type = Math.floor(Math.random() * 3); // 0: Math, 1: Sequence, 2: Logic
        let q: any = {};

        if (type === 0) {
            const a = Math.floor(Math.random() * 20) + 1;
            const b = Math.floor(Math.random() * 20) + 1;
            const op = Math.random() > 0.5 ? '+' : '-';
            q.text = `${a} ${op} ${b} = ?`;
            q.ans = op === '+' ? a + b : a - b;
            q.options = [q.ans, q.ans + 1, q.ans - 2, q.ans + 5].sort(() => Math.random() - 0.5);
        } else if (type === 1) {
            const start = Math.floor(Math.random() * 5) + 1;
            const step = Math.floor(Math.random() * 4) + 2;
            q.text = `${start}, ${start+step}, ${start+step*2}, ?`;
            q.ans = start + step * 3;
            q.options = [q.ans, q.ans + step, q.ans - 1, q.ans * 2].sort(() => Math.random() - 0.5);
        } else {
            const val = Math.floor(Math.random() * 10) + 1;
            q.text = `If X = ${val}, what is X² + 2?`;
            q.ans = val*val + 2;
            q.options = [q.ans, val*val, val*val-2, val*val+5].sort(() => Math.random() - 0.5);
        }
        setQuestion(q);
    };

    const handleAnswer = (ans: number) => {
        if (ans === question.ans) {
            setScore(prev => prev + 100);
            setFeedback('correct');
        } else {
            setFeedback('wrong');
            setTimeLeft(prev => Math.max(0, prev - 5)); // Penalty
        }
        
        setTimeout(() => {
            setFeedback(null);
            generateQuestion();
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 rounded-xl p-6 text-white">
            {!gameOver ? (
                <div className="w-full max-w-md text-center">
                    <div className="flex justify-between mb-8">
                         <div className="bg-gray-800 px-4 py-2 rounded-full font-mono font-bold text-yellow-400">SCORE: {score}</div>
                         <div className="bg-gray-800 px-4 py-2 rounded-full font-mono font-bold text-red-400">{timeLeft}s</div>
                    </div>

                    <div className={`bg-gray-800 p-8 rounded-2xl mb-8 shadow-2xl border-2 transition-colors ${feedback === 'correct' ? 'border-green-500' : feedback === 'wrong' ? 'border-red-500' : 'border-indigo-500'}`}>
                        <h3 className="text-3xl font-bold mb-2">{question?.text}</h3>
                        <p className="text-gray-400 text-sm">Select the correct answer</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {question?.options.map((opt: number, i: number) => (
                            <button 
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className="bg-white/10 hover:bg-white/20 p-6 rounded-xl text-xl font-bold transition-all active:scale-95 border border-white/5 hover:border-indigo-500"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center animate-fade-in">
                    <Brain className="w-20 h-20 text-blue-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold mb-2">Time's Up!</h2>
                    <p className="text-xl font-bold text-yellow-400 mb-8">Final Score: {score}</p>
                    <Button onClick={onExit}>Back to Menu</Button>
                </div>
            )}
        </div>
    );
};

// --- MAIN CONTAINER ---
const GameCentreView: React.FC<GameCentreViewProps> = ({ user, onUpdateUser }) => {
  const [activeGame, setActiveGame] = useState<GameType>('none');
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleGameEnd = async (score: number, gameName: string) => {
      // Calculate Reward
      const reward = parseFloat((score * 0.001).toFixed(3)); // $0.001 per point
      if (reward > 0) {
          await storageService.recordGameReward(user.id, reward, gameName);
          onUpdateUser({ ...user, balance: user.balance + reward, xp: user.xp + Math.floor(score / 10) });
          setLastReward(reward);
      }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white shadow-2xl border border-gray-800">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,#1f2937_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-900/50 rounded-full blur-[128px]"></div>
      </div>

      {/* --- GAME MENU (LOBBY) --- */}
      {activeGame === 'none' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
            {/* Guide Button */}
            <button 
                onClick={() => setShowGuide(true)}
                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-all backdrop-blur-sm"
            >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-bold">How to Play</span>
            </button>

            <div className="text-center mb-10">
                <Badge color="blue" className="mb-4 text-xs font-mono uppercase tracking-widest">Arcade • Puzzle • Logic</Badge>
                <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    GAME CENTRE
                </h1>
                <p className="text-gray-400 max-w-md mx-auto">Play, compete, and earn real rewards. Select a game mode to begin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
                {/* Game Card 1 */}
                <div 
                    onClick={() => setActiveGame('cyber-slash')}
                    className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-gray-800 transition-all cursor-pointer hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                        <Wifi className="w-24 h-24 text-cyan-400 rotate-12" />
                    </div>
                    <div className="w-12 h-12 bg-cyan-900/50 rounded-xl flex items-center justify-center mb-4 text-cyan-400">
                        <Gamepad2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Cyber Slash</h3>
                    <p className="text-sm text-gray-400 mb-4">Fast-paced arcade action. Slash data orbs, avoid glitch bombs.</p>
                    <div className="flex items-center text-xs text-cyan-400 font-bold uppercase tracking-wider">
                        <Play className="w-3 h-3 mr-1 fill-current" /> Play Now
                    </div>
                </div>

                {/* Game Card 2 */}
                <div 
                    onClick={() => setActiveGame('word-hunt')}
                    className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-gray-800 transition-all cursor-pointer hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                        <Puzzle className="w-24 h-24 text-purple-500 -rotate-12" />
                    </div>
                    <div className="w-12 h-12 bg-purple-900/50 rounded-xl flex items-center justify-center mb-4 text-purple-500">
                        <Puzzle className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Puzzling Words</h3>
                    <p className="text-sm text-gray-400 mb-4">Find hidden words in the grid. Test your vocabulary and observation.</p>
                    <div className="flex items-center text-xs text-purple-500 font-bold uppercase tracking-wider">
                        <Play className="w-3 h-3 mr-1 fill-current" /> Play Now
                    </div>
                </div>

                {/* Game Card 3 */}
                <div 
                    onClick={() => setActiveGame('math-master')}
                    className="group relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:bg-gray-800 transition-all cursor-pointer hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(250,204,21,0.2)] overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                        <Calculator className="w-24 h-24 text-yellow-500 rotate-6" />
                    </div>
                    <div className="w-12 h-12 bg-yellow-900/50 rounded-xl flex items-center justify-center mb-4 text-yellow-500">
                        <Brain className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Math Master</h3>
                    <p className="text-sm text-gray-400 mb-4">Solve logic and math problems against the clock. Sharp minds only.</p>
                    <div className="flex items-center text-xs text-yellow-500 font-bold uppercase tracking-wider">
                        <Play className="w-3 h-3 mr-1 fill-current" /> Play Now
                    </div>
                </div>
            </div>
            
            {lastReward && (
                <div className="mt-8 animate-slide-up bg-green-500/20 text-green-400 px-6 py-2 rounded-full border border-green-500/30 flex items-center">
                    <Trophy className="w-4 h-4 mr-2" />
                    You just earned ${lastReward.toFixed(3)}!
                </div>
            )}
        </div>
      )}

      {/* --- ACTIVE GAME CONTAINERS --- */}
      {activeGame !== 'none' && (
          <div className="relative w-full h-full z-20 bg-gray-900">
              <button 
                onClick={() => setActiveGame('none')}
                className="absolute top-4 left-4 z-50 bg-black/50 hover:bg-black text-white p-2 rounded-full backdrop-blur transition-colors"
              >
                  <ArrowLeft className="w-6 h-6" />
              </button>

              {activeGame === 'cyber-slash' && (
                  <CyberSlashGame 
                    user={user} 
                    onFinish={(s) => handleGameEnd(s, 'Cyber Slash')}
                    onExit={() => setActiveGame('none')} 
                  />
              )}

              {activeGame === 'word-hunt' && (
                  <WordHuntGame 
                    onFinish={(s) => handleGameEnd(s, 'Word Hunt')}
                    onExit={() => setActiveGame('none')}
                  />
              )}

              {activeGame === 'math-master' && (
                  <MathMasterGame 
                    onFinish={(s) => handleGameEnd(s, 'Math Master')}
                    onExit={() => setActiveGame('none')}
                  />
              )}
          </div>
      )}
      
      <GameGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default GameCentreView;
