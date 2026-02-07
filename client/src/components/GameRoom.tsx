import React, { useState, useEffect, useRef } from 'react';
import type { GameState } from '../types';
import { Table } from './Table';
import { Card } from './Card';

interface GameRoomProps {
    gameState: GameState;
    playerId: string;
    onDrawCard: () => void;
    onPlayCard: (indices: number[], source: 'hand' | 'faceUp' | 'faceDown') => void;
    onSwapCards: (handIndex: number, faceUpIndex: number) => void;
    onSetReady: () => void;
    onTakePile: () => void;
    actions: any; // Using any for quick pass, or ideally correct type
}

export const GameRoom: React.FC<GameRoomProps> = ({
    gameState,
    playerId,
    onDrawCard,
    onPlayCard,
    onSwapCards,
    onSetReady,
    onTakePile,
    actions
}) => {
    // Scroll ref for logs
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [gameState.logs]);


    const currentPlayer = gameState.players.find(p => p.id === playerId);
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;

    // Host is the first player in the list
    const isHost = gameState.players.length > 0 && gameState.players[0].id === playerId;

    // Selection state for swapping
    const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
    const [selectedFaceUpIndex, setSelectedFaceUpIndex] = useState<number | null>(null);

    // Multi-select for playing
    const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);

    // FaceDown card selection for blind play
    const [selectedFaceDownIndex, setSelectedFaceDownIndex] = useState<number | null>(null);

    // Discard pile viewer
    const [showDiscardPile, setShowDiscardPile] = useState(false);

    // Winner Animation State (Transient)
    const [showCelebration, setShowCelebration] = useState(false);

    // Logs Modal State
    const [showLogs, setShowLogs] = useState(false);

    // Effect to trigger celebration for 2 seconds when rank is assigned
    React.useEffect(() => {
        if (currentPlayer?.finishedRank) {
            setShowCelebration(true);
            const timer = setTimeout(() => setShowCelebration(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer?.finishedRank]);

    const handleCardClick = (index: number, source: 'hand' | 'faceUp') => {
        if (gameState.status !== 'playing' || !isMyTurn || !currentPlayer) return;

        const cardList = source === 'hand' ? currentPlayer.hand : currentPlayer.faceUpCards;
        const card = cardList[index];

        if (source === 'faceUp' && currentPlayer.hand.length > 0) {
            return;
        }

        setSelectedCardIndices(prev => {
            if (prev.length === 0) return [index];
            const firstIndex = prev[0];
            const firstCard = cardList[firstIndex];

            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            }

            if (firstCard.rank !== card.rank) {
                return [index];
            }

            return [...prev, index];
        });
    };

    const handleExecutePlay = (source: 'hand' | 'faceUp' | 'faceDown') => {
        if (selectedCardIndices.length === 0) return;
        onPlayCard(selectedCardIndices, source);
        setSelectedCardIndices([]);
    };

    if (!currentPlayer) return <div className="text-white">Loading player data...</div>;



    const handleSwap = () => {
        if (selectedHandIndex !== null && selectedFaceUpIndex !== null) {
            onSwapCards(selectedHandIndex, selectedFaceUpIndex);
            setSelectedHandIndex(null);
            setSelectedFaceUpIndex(null);
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number, sourceName: 'hand' | 'faceUp' | 'faceDown') => {
        // Allow drag in 'preparing' (swap) AND 'playing' (play)
        if (gameState.status !== 'preparing' && gameState.status !== 'playing') return;

        // Preparing: Only Hand drag supported for swap
        // Playing: Hand, FaceUp, FaceDown supported

        e.dataTransfer.setData('cardIndex', index.toString());
        e.dataTransfer.setData('source', sourceName);
        e.dataTransfer.effectAllowed = 'move';

        // Legacy for swap (backward compatibility with handleDrop)
        if (sourceName === 'hand') {
            e.dataTransfer.setData('handIndex', index.toString());
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        // Allow if playing or preparing
        if (gameState.status !== 'preparing' && gameState.status !== 'playing') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // For Swapping (Dropping onto FaceUp card)
    const handleDrop = (e: React.DragEvent, faceUpIndex: number) => {
        if (gameState.status === 'preparing') {
            e.preventDefault();
            const handIndexStr = e.dataTransfer.getData('handIndex');
            if (handIndexStr) {
                const handIndex = parseInt(handIndexStr, 10);
                if (!isNaN(handIndex)) {
                    onSwapCards(handIndex, faceUpIndex);
                    setSelectedHandIndex(null);
                    setSelectedFaceUpIndex(null);
                }
            }
        }
    };

    // For Playing (Dropping onto Discard Pile)
    const handlePlayDrop = (e: React.DragEvent) => {
        if (gameState.status !== 'playing' || !isMyTurn) return;

        const indexStr = e.dataTransfer.getData('cardIndex');
        const source = e.dataTransfer.getData('source') as 'hand' | 'faceUp' | 'faceDown';

        if (indexStr && source) {
            const index = parseInt(indexStr, 10);
            if (!isNaN(index)) {
                // If single card drag, play directly as [index].
                // If multiple selected, we ideally check if dragged index is in selection.
                // If dragged index is in selectedCardIndices, play ALL selected.
                // If not, play just this one (and clear selection?).

                let indicesToPlay = [index];
                if (selectedCardIndices.includes(index) && source === 'hand') {
                    indicesToPlay = selectedCardIndices;
                }

                onPlayCard(indicesToPlay, source);
                setSelectedCardIndices([]);
            }
        }
    };



    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden bg-slate-900 text-white select-none">

            {/* --- TABLE BACKGROUND (Wood Floor / Carpet) --- */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-black opacity-80 z-0 pointer-events-none" />

            {/* --- HEADER --- */}
            <div className="absolute top-0 left-0 right-0 p-4 z-40 flex justify-between items-start pointer-events-auto">
                {/* Room Info */}
                <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                    <span className="text-xs text-slate-400 uppercase">Room</span>
                    <span className="font-mono font-bold text-yellow-500">{gameState.id}</span>
                </div>

                {/* Game Status */}
                {/* Game Status & Logs */}
                <div className="flex flex-col items-end gap-2 max-w-[200px] md:max-w-[300px]">
                    <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-xl border border-white/10 text-right w-full">
                        <div className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-slate-200'}`}>
                            {gameState.status === 'preparing' ? 'Waiting...' : isMyTurn ? 'YOUR TURN' : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
                        </div>
                    </div>

                    {/* Log Button */}
                    <button
                        onClick={() => setShowLogs(true)}
                        className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 transition-colors"
                    >
                        <span>📜</span> Log Permainan
                    </button>
                </div>
            </div>

            {/* --- POKER TABLE AREA --- */}
            <div className="relative flex-1 w-full h-full z-10 overflow-hidden">

                {/* THE TABLE (Green Felt) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[50%] w-[92%] md:w-[85%] h-[58%] md:h-[68%] bg-[#276e36] rounded-[200px] border-[16px] border-[#3e2723] shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] flex items-center justify-center">

                    {/* Table Logo / Center Art */}
                    <div className="absolute text-green-900/30 font-serif font-bold text-4xl md:text-6xl tracking-widest select-none pointer-events-none">
                        ISTIMEWA
                    </div>

                    {/* Discard Pile & Deck (Center of Table) */}
                    <Table
                        discardPile={gameState.discardPile}
                        deckCount={gameState.deck.length}
                        onDrawCard={onDrawCard}
                        isCurrentPlayer={isMyTurn}
                        onDropCard={handlePlayDrop}
                        onDiscardPileClick={() => setShowDiscardPile(true)}
                    />
                </div>

                {/* PLAYERS (Seats) */}
                {gameState.players.map((p, i) => {
                    const isMe = p.id === playerId;
                    const myIndex = gameState.players.findIndex(p => p.id === playerId);
                    const relativeIndex = (i - myIndex + gameState.players.length) % gameState.players.length;
                    const total = gameState.players.length;

                    // --- RECTANGULAR TABLE POSITIONING ---
                    // Table layout: 3 bottom, 2 right, 3 top, 2 left = 10 max players
                    // Main player (relativeIndex 0) is FIXED at center bottom
                    // Cards face center with horizontal/vertical rotation only

                    type Slot = {
                        card: React.CSSProperties;
                        name: React.CSSProperties;
                        rotation: number;
                    };

                    // Positions are calculated for even distribution with proper spacing
                    // Cards positioned at table edges but inside the table boundary
                    const slots: Slot[] = [
                        // Bottom row (4 slots) - 0°
                        // Spaced: 20%, 40%, 60%, 80%
                        { card: { bottom: '20%', left: '60%' }, name: { bottom: '10%', left: '60%' }, rotation: 0 },       // 0: Bottom R-Center (Main)
                        { card: { bottom: '20%', left: '40%' }, name: { bottom: '10%', left: '40%' }, rotation: 0 },       // 1: Bottom L-Center
                        { card: { bottom: '20%', left: '80%' }, name: { bottom: '10%', left: '80%' }, rotation: 0 },       // 2: Bottom Right
                        { card: { bottom: '20%', left: '20%' }, name: { bottom: '10%', left: '20%' }, rotation: 0 },       // 3: Bottom Left

                        // Right column (1 slot) - 270°
                        { card: { top: '50%', right: '1%' }, name: { top: '50%', right: '-8%' }, rotation: 270 },          // 4: Right Center

                        // Top row (4 slots) - 180°
                        { card: { top: '28%', left: '40%' }, name: { top: '10%', left: '40%' }, rotation: 180 },           // 5: Top L-Center
                        { card: { top: '28%', left: '60%' }, name: { top: '10%', left: '60%' }, rotation: 180 },           // 6: Top R-Center
                        { card: { top: '28%', left: '20%' }, name: { top: '10%', left: '20%' }, rotation: 180 },           // 7: Top Left
                        { card: { top: '28%', left: '80%' }, name: { top: '10%', left: '80%' }, rotation: 180 },           // 8: Top Right

                        // Left column (1 slot) - 90°
                        { card: { top: '50%', left: '13%' }, name: { top: '50%', left: '4%' }, rotation: 90 },             // 9: Left Center
                    ];

                    // Assign players to slots based on total count
                    const getSlotForPlayer = (relIdx: number, totalPlayers: number): number => {
                        if (relIdx === 0) return 0; // Main player always center bottom

                        // Distribution patterns for different player counts
                        // Ordered CLOCKWISE to ensure sequential turns match visual direction
                        const distributions: Record<number, number[]> = {
                            2: [0, 6],                                    // Bottom, Top
                            3: [0, 4, 9],                                 // Bottom, Right, Left
                            4: [0, 4, 6, 9],                              // Bottom, Right, Top, Left
                            5: [0, 6, 5, 9, 1],                           // Clockwise: Base -> TopR -> TopL -> Left -> BaseL
                            6: [0, 4, 6, 5, 9, 1],                        // Clockwise
                            7: [0, 2, 4, 6, 5, 9, 1],                     // Clockwise
                            8: [0, 2, 4, 8, 6, 5, 9, 1],                  // Clockwise
                            9: [0, 2, 8, 6, 5, 7, 9, 3, 1],               // Clockwise
                            10: [0, 2, 4, 8, 6, 5, 7, 9, 3, 1],           // Clockwise Full House
                        };

                        const pattern = distributions[totalPlayers] || distributions[10];
                        return pattern[relIdx] ?? 0;
                    };

                    const slotIndex = getSlotForPlayer(relativeIndex, total);
                    const slot = slots[slotIndex];

                    let cardStyle: React.CSSProperties = {
                        ...slot.card,
                        transform: `translate(-50%, ${slot.card.top ? '-50%' : '0'})${slot.rotation !== 0 ? ` rotate(${slot.rotation}deg)` : ''}`
                    };

                    // Main player doesn't rotate
                    if (relativeIndex === 0) {
                        cardStyle = { ...slot.card, transform: 'translate(-50%, 0)' };
                        // Center main player if total <= 4 (using single bottom slot)
                        if (total <= 4) {
                            cardStyle.left = '50%';
                        }
                    }

                    const nameStyle: React.CSSProperties = { ...slot.name, transform: 'translate(-50%, 0)' };
                    if (relativeIndex === 0 && total <= 4) {
                        nameStyle.left = '50%';
                    }

                    return (
                        <React.Fragment key={p.id}>
                            {/* --- CONTAINER 1: NAME (Outside) --- */}
                            <div className="absolute z-30 transition-all duration-500 w-[120px] md:w-[200px] flex justify-center pointer-events-none" style={nameStyle}>
                                <div className={`
                                    relative px-4 py-1.5 rounded-full border-2 shadow-lg backdrop-blur-md transition-all whitespace-nowrap
                                    ${gameState.currentPlayerIndex === i && gameState.status === 'playing' ? 'bg-yellow-600/90 border-yellow-400 scale-110 shadow-yellow-500/20' : 'bg-slate-900/80 border-slate-600'}
                                `}>
                                    <div className="flex items-center justify-center gap-1">
                                        <div className="text-xs md:text-sm font-bold text-white truncate max-w-[80px] md:max-w-[120px]">
                                            {p.name === 'Computer (Bot)' ? 'Bot' : p.name} <span className="text-gray-400 text-[10px]">({p.hand.length})</span>
                                        </div>
                                        {p.isReady && gameState.status === 'preparing' && <span className="text-[10px]">✅</span>}
                                    </div>
                                </div>
                            </div>

                            {/* --- CONTAINER 2: CARDS (Inside) --- */}
                            <div className="absolute z-20 transition-all duration-500 w-[120px] md:w-[200px] flex flex-col items-center" style={cardStyle}>
                                <div className="relative flex flex-col items-center -mt-1 scale-75 md:scale-90 lg:scale-100">
                                    {(() => {
                                        const FaceDownGroup = (cssClass: string) => {
                                            // Can only select faceDown if hand AND faceUp are empty
                                            const canSelectFaceDown = isMe && gameState.status === 'playing' && isMyTurn &&
                                                currentPlayer!.hand.length === 0 && currentPlayer!.faceUpCards.length === 0;

                                            return (
                                                <div className={`flex space-x-2 ${cssClass}`}>
                                                    {p.faceDownCards.map((_, idx) => {
                                                        const isSelected = canSelectFaceDown && selectedFaceDownIndex === idx;
                                                        return (
                                                            <div key={`fd-${idx}`}
                                                                draggable={isMe && gameState.status === 'playing' && isMyTurn}
                                                                onDragStart={(e) => isMe && handleDragStart(e, idx, 'faceDown')}
                                                                onClick={() => {
                                                                    if (!canSelectFaceDown) return;
                                                                    setSelectedFaceDownIndex(idx === selectedFaceDownIndex ? null : idx);
                                                                }}
                                                                className={`relative ${canSelectFaceDown ? 'cursor-pointer hover:-translate-y-2' : ''} transition-transform ${isSelected ? '-translate-y-4 ring-2 ring-yellow-400 rounded-lg' : ''}`}>
                                                                {/* Pilih Button Overlay */}
                                                                {isSelected && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onPlayCard([idx], 'faceDown');
                                                                            setSelectedFaceDownIndex(null);
                                                                        }}
                                                                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white rounded-full px-3 py-1 text-xs font-bold animate-bounce z-50 shadow-lg"
                                                                    >
                                                                        Pilih
                                                                    </button>
                                                                )}
                                                                <Card isHidden={true} small={true} className={`shadow-md border ${isSelected ? 'border-yellow-400' : 'border-slate-700'}`} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        };

                                        const FaceUpGroup = (cssClass: string) => (
                                            <div className={`flex space-x-2 ${cssClass}`}>
                                                {p.faceUpCards.map((c, idx) => {
                                                    const isSelected = isMe && gameState.status === 'playing' && currentPlayer!.hand.length === 0 && selectedCardIndices.includes(idx);
                                                    return (
                                                        <div key={`fu-${idx}`}
                                                            draggable={isMe && gameState.status === 'playing'}
                                                            onDragStart={(e) => isMe && handleDragStart(e, idx, 'faceUp')}
                                                            onDrop={(e) => { e.stopPropagation(); isMe && handleDrop(e, idx); }}
                                                            onDragOver={(e) => isMe && handleDragOver(e)}
                                                            onClick={() => {
                                                                if (!isMe) return;
                                                                if (gameState.status === 'preparing') setSelectedFaceUpIndex(idx === selectedFaceUpIndex ? null : idx);
                                                                else if (gameState.status === 'playing' && isMyTurn && currentPlayer!.hand.length === 0) {
                                                                    handleCardClick(idx, 'faceUp');
                                                                }
                                                            }}
                                                            className={`relative transition-transform duration-200 ${isMe ? 'hover:-translate-y-2 cursor-pointer' : ''} ${isMe && (selectedFaceUpIndex === idx || isSelected) ? 'ring-2 ring-yellow-400 -translate-y-4' : ''}`}
                                                            style={{ zIndex: 10 + idx }}
                                                        >
                                                            <Card card={c} small={true} className="shadow-lg" />
                                                            {isMe && gameState.status === 'preparing' && <div className="absolute inset-0 hover:bg-yellow-400/30 rounded pointer-events-none" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );

                                        if (isMe) {
                                            return (
                                                <>
                                                    {FaceUpGroup("z-40")}
                                                    {FaceDownGroup("-mt-12 z-10")}
                                                </>
                                            );
                                        } else {
                                            return (
                                                <>
                                                    {FaceDownGroup("z-10")}
                                                    {FaceUpGroup("-mt-12 z-20")}
                                                </>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}


                {/* LOGS MODAL */}
                {showLogs && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span>📜</span> Log Permainan
                                </h3>
                                <button
                                    onClick={() => setShowLogs(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm text-slate-300">
                                {gameState.logs && gameState.logs.length > 0 ? (
                                    gameState.logs.map((log, i) => (
                                        <div key={i} className="border-b border-white/5 pb-1 last:border-0">
                                            <span className="text-slate-500 mr-2">[{i + 1}]</span>
                                            {log}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-8">Belum ada catatan permainan.</div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 text-right">
                                <button
                                    onClick={() => setShowLogs(false)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOBBY OVERLAY (If Waiting) */}
                {gameState.status === 'waiting' && (
                    <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <h2 className="text-3xl font-bold text-white mb-4">Lobby Room</h2>
                        <div className="text-slate-400 mb-8">{gameState.players.filter(p => p.isReady).length} / {gameState.players.length} Ready</div>

                        {isHost && gameState.players.length > 1 && gameState.players.every(p => p.isReady) ? (
                            <button onClick={() => actions.startGame(gameState.id)} className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition">Start Game</button>
                        ) : !currentPlayer.isReady ? (
                            <button onClick={onSetReady} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition">I'm Ready</button>
                        ) : (
                            <div className="text-yellow-400 font-bold animate-pulse">Waiting for host...</div>
                        )}
                    </div>
                )}

            </div>


            {/* --- FOOTER: MY HAND (Fixed Bottom) --- */}
            {/* Keeps the original hand interactions intact */}
            <div className="z-50 relative pointer-events-none">
                {/* Action Buttons Container (Pointer Events Auto) */}
                <div className="flex justify-center gap-4 mb-2 pointer-events-auto">
                    {/* Play Button */}
                    {gameState.status === 'playing' && isMyTurn && selectedCardIndices.length > 0 && (
                        <button onClick={() => {
                            // Determine source dynamically based on current player's state
                            let source: 'hand' | 'faceUp' | 'faceDown' = 'hand';
                            if (currentPlayer.hand.length === 0 && currentPlayer.faceUpCards.length > 0) {
                                source = 'faceUp';
                            } else if (currentPlayer.hand.length === 0 && currentPlayer.faceUpCards.length === 0) {
                                source = 'faceDown';
                            }
                            handleExecutePlay(source);
                        }} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full font-bold shadow-lg animate-bounce">
                            Mainkan {selectedCardIndices.length} Kartu
                        </button>
                    )}

                    {/* Take Pile */}
                    {gameState.status === 'playing' && isMyTurn && gameState.discardPile.length > 0 && (
                        <button onClick={onTakePile} className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                            Ambil
                        </button>
                    )}

                    {/* Ready Button (Preparing) */}
                    {gameState.status === 'preparing' && !currentPlayer.isReady && (
                        <button onClick={onSetReady} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/10 px-8 py-2 rounded-full text-sm font-bold shadow-lg transition-all">
                            ✅ Siap
                        </button>
                    )}

                    {/* Sort Button */}
                    {currentPlayer.hand.length > 1 && (
                        <button onClick={() => actions.sortHand(gameState.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-full text-sm font-bold shadow-lg active:bg-green-500 transition-colors">
                            🔃 Urutkan
                        </button>
                    )}
                </div>

                {/* The Hand */}
                <div className="pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent pb-1 pt-4 md:pb-2 md:pt-6 px-2 md:px-4 mt-2">
                    <div
                        key={`hand-container-${gameState.version}`}
                        className={`
                            flex justify-center items-end 
                            w-full max-w-6xl mx-auto overflow-x-visible
                            ${currentPlayer.hand.length > 8 ? '-space-x-6 md:-space-x-8' : '-space-x-3 md:-space-x-4'}
                            hover:space-x-0 md:hover:space-x-1 transition-all duration-300 min-h-[100px]
                        `}>
                        {currentPlayer.hand.map((c, i) => {
                            const isSelected = gameState.status === 'playing' && selectedCardIndices.includes(i);
                            const preparingSelected = gameState.status === 'preparing' && selectedHandIndex === i;
                            return (
                                <div key={`my-hand-${c.suit}-${c.rank}-${i}`}
                                    draggable={gameState.status !== 'waiting'}
                                    onDragStart={(e) => handleDragStart(e, i, 'hand')}
                                    onClick={() => {
                                        if (gameState.status === 'preparing') setSelectedHandIndex(i === selectedHandIndex ? null : i);
                                        else if (gameState.status === 'playing' && isMyTurn) handleCardClick(i, 'hand');
                                    }}
                                    className={`relative transform transition-all duration-200 origin-bottom hover:-translate-y-3 hover:scale-105 z-${10 + i} ${isSelected || preparingSelected ? '-translate-y-5 scale-105 z-50' : ''}`}
                                    style={{ zIndex: isSelected ? 100 : 10 + i }}
                                >
                                    {/* Swap Button Overlay */}
                                    {preparingSelected && selectedFaceUpIndex !== null && (
                                        <button onClick={(e) => { e.stopPropagation(); handleSwap(); }} className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 rounded-full px-2 py-0.5 text-[10px] font-bold animate-bounce z-50">Tukar</button>
                                    )}
                                    <Card card={c} className={`shadow-2xl rounded-lg w-14 h-20 md:w-16 md:h-24 border border-slate-400/30 ${isSelected || preparingSelected ? 'ring-4 ring-yellow-400' : ''}`} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* --- GAME OVER OVERLAYS --- */}
            {/* WINNER OVERLAY (Shows for 2s on win, OR permanently when game finishes) */}
            {currentPlayer.finishedRank && (showCelebration || gameState.status === 'finished') && (
                <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto" />
                    <div className="relative z-10 text-center animate-bounce-in pointer-events-none">
                        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] px-4 pb-2">
                            Selamat, Anda Menang!
                        </h1>
                        <p className="text-3xl text-white font-bold animate-pulse mt-4 drop-shadow-lg">
                            Juara #{currentPlayer.finishedRank}
                        </p>
                        <div className="mt-8 text-8xl animate-spin-slow">🏆</div>

                        {gameState.status !== 'finished' && (
                            <div className="mt-8 text-xl text-yellow-200 animate-pulse">Menunggu pemain lain selesai...</div>
                        )}

                        {gameState.status === 'finished' && (
                            <div className="flex gap-4 justify-center mt-12 pointer-events-auto">
                                <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition shadow-xl hover:shadow-2xl hover:bg-yellow-50">
                                    Main Lagi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LOSER OVERLAY */}
            {gameState.status === 'finished' && !currentPlayer.finishedRank && (
                <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-red-950/90 backdrop-blur-sm animate-fade-in pointer-events-auto" />
                    <div className="relative z-10 text-center animate-shake pointer-events-none">
                        <h1 className="text-5xl md:text-7xl font-black text-rose-500 mb-6 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] px-4 rotate-[-5deg] leading-tight flex flex-col gap-2">
                            <span>Yha Kalah!</span>
                            <span>Cupu Bet Dah Luuu!! 🤭</span>
                        </h1>
                        <div className="text-9xl grayscale opacity-80 mt-8 animate-pulse">🤡</div>

                        <div className="flex gap-4 justify-center mt-12 pointer-events-auto">
                            <button onClick={() => window.location.reload()} className="bg-rose-600 text-white px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition shadow-xl hover:bg-rose-500">
                                Coba Lagi Deh
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discard Modal (Keep existing) */}
            {showDiscardPile && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8" onClick={() => setShowDiscardPile(false)}>
                    <div className="bg-slate-800 p-6 rounded-2xl max-w-4xl max-h-full overflow-auto">
                        <h3 className="text-2xl font-bold mb-4">Kartu Buangan</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {gameState.discardPile.map((c, i) => (
                                <Card key={i} card={c} className="w-16 h-24" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
