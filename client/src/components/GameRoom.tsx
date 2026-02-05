import React, { useState } from 'react';
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
    onPlayCard,
    onSwapCards,
    onSetReady,
    onTakePile,
    actions
}) => {
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    const opponents = gameState.players.filter(p => p.id !== playerId);
    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;

    // Host is the first player in the list
    const isHost = gameState.players.length > 0 && gameState.players[0].id === playerId;

    // Selection state for swapping
    const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
    const [selectedFaceUpIndex, setSelectedFaceUpIndex] = useState<number | null>(null);

    // Multi-select for playing
    const [selectedCardIndices, setSelectedCardIndices] = useState<number[]>([]);

    // Discard pile viewer
    const [showDiscardPile, setShowDiscardPile] = useState(false);

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

    const handleExecutePlay = (source: 'hand' | 'faceUp') => {
        if (selectedCardIndices.length === 0) return;
        onPlayCard(selectedCardIndices, source);
        setSelectedCardIndices([]);
    };

    if (!currentPlayer) return <div className="text-white">Loading player data...</div>;

    if (gameState.winner) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in bg-black/80 z-50 fixed inset-0">
                <h2 className="text-5xl font-bold text-yellow-400 drop-shadow-lg">Game Selesai!</h2>
                <div className="text-2xl text-white">
                    Pemenangnya adalah: <span className="font-bold text-blue-400">{gameState.players.find(p => p.id === gameState.winner)?.name}</span>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                    Main Lagi
                </button>
            </div>
        );
    }

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

    // --- HELPER: Position Logic ---
    const getSeatStyle = (index: number, total: number) => {
        // Find relative index from current player (Me is always 0 in relative terms)
        const myIndex = gameState.players.findIndex(p => p.id === playerId);
        // rotate so myIndex becomes 0
        const relativeIndex = (index - myIndex + total) % total;

        if (total === 2) {
            if (relativeIndex === 0) return { bottom: '2%', left: '50%', transform: 'translate(-50%, 0)' }; // Me (Bottom)
            if (relativeIndex === 1) return { top: '5%', left: '50%', transform: 'translate(-50%, 0)' };    // Opp (Top)
        }
        if (total === 3) {
            if (relativeIndex === 0) return { bottom: '2%', left: '50%', transform: 'translate(-50%, 0)' };
            if (relativeIndex === 1) return { top: '15%', left: '20%', transform: 'translate(-50%, 0)' };   // Top Left
            if (relativeIndex === 2) return { top: '15%', right: '20%', transform: 'translate(50%, 0)' };   // Top right
        }
        if (total === 4) {
            if (relativeIndex === 0) return { bottom: '2%', left: '50%', transform: 'translate(-50%, 0)' };
            if (relativeIndex === 1) return { top: '50%', left: '5%', transform: 'translate(0, -50%)' };    // Left
            if (relativeIndex === 2) return { top: '5%', left: '50%', transform: 'translate(-50%, 0)' };    // Top
            if (relativeIndex === 3) return { top: '50%', right: '5%', transform: 'translate(0, -50%)' };   // Right
        }

        // Fallback for > 4 (Circle)
        // Me at bottom, others distributed
        if (relativeIndex === 0) return { bottom: '2%', left: '50%', transform: 'translate(-50%, 0)' };

        // Distribute remaining roughly around top arc
        // Simple Top-Left, Top-Center, Top-Right logic or just even spread?
        // Let's use generic positions for 5-6
        // This is a rough heuristic
        const angle = 180 + (180 / (total - 1)) * relativeIndex; // 180 is left, 360 is right?
        // Let's simplified: 5 players -> Left, TopLeft, TopRight, Right
        if (total === 5) {
            if (relativeIndex === 1) return { top: '50%', left: '5%', transform: 'translate(0, -50%)' };   // Left
            if (relativeIndex === 2) return { top: '10%', left: '25%', transform: 'translate(-50%, 0)' };  // Top Left
            if (relativeIndex === 3) return { top: '10%', right: '25%', transform: 'translate(50%, 0)' };  // Top Right
            if (relativeIndex === 4) return { top: '50%', right: '5%', transform: 'translate(0, -50%)' };  // Right
        }

        return { top: '0', left: '0' }; // Fallback
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
                <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-xl border border-white/10 text-right">
                    <div className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-slate-200'}`}>
                        {gameState.status === 'preparing' ? 'Waiting...' : isMyTurn ? 'YOUR TURN' : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
                    </div>
                </div>
            </div>

            {/* --- POKER TABLE AREA --- */}
            <div className="relative flex-1 w-full h-full z-10 overflow-hidden">

                {/* THE TABLE (Green Felt) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[85%] md:w-[70%] h-[50%] md:h-[60%] bg-[#276e36] rounded-[200px] border-[16px] border-[#3e2723] shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] flex items-center justify-center">

                    {/* Table Logo / Center Art */}
                    <div className="absolute text-green-900/30 font-serif font-bold text-4xl md:text-6xl tracking-widest select-none pointer-events-none">
                        ISTIMEWA
                    </div>

                    {/* Discard Pile & Deck (Center of Table) */}
                    <Table
                        discardPile={gameState.discardPile}
                        deckCount={gameState.deck.length}
                        onDrawCard={() => { }}
                        isCurrentPlayer={isMyTurn}
                        onDropCard={handlePlayDrop}
                        onDiscardPileClick={() => setShowDiscardPile(true)}
                    />
                </div>

                {/* PLAYERS (Seats) */}
                {gameState.players.map((p, i) => {
                    const isMe = p.id === playerId;
                    const style = getSeatStyle(i, gameState.players.length);
                    // If it's Me, we hide the Hand Count badge (since I see my hand)
                    // But we show Face Cards heavily

                    return (
                        <div key={p.id} className="absolute flex flex-col items-center transition-all duration-500 w-[120px] md:w-[200px]" style={style}>

                            {/* Player Info (Avatar Bubble) */}
                            <div className={`
                                relative mb-2 px-4 py-1.5 rounded-full border-2 shadow-lg backdrop-blur-md transition-all
                                ${gameState.currentPlayerIndex === i && gameState.status === 'playing' ? 'bg-yellow-600/90 border-yellow-400 scale-110 shadow-yellow-500/20' : 'bg-slate-900/80 border-slate-600'}
                            `}>
                                <div className="text-center">
                                    <div className="text-xs md:text-sm font-bold text-white truncate max-w-[80px] md:max-w-[120px]">{p.name}</div>
                                    {/* Badges */}
                                    <div className="flex gap-2 justify-center mt-0.5">
                                        {!isMe && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-200 px-1.5 rounded border border-blue-500/30">
                                                {p.hand.length} 🎴
                                            </span>
                                        )}
                                        {p.isReady && gameState.status === 'preparing' && <span className="text-[10px]">✅</span>}
                                    </div>
                                </div>
                            </div>

                            {/* FACE CARDS Area (Below Name for Top players, Above for Me... Actually always 'in front' towards table center?) 
                                Let's keep it simple: Face Cards always "below" the name for now, or positioned carefully.
                                Since we use absolute positions, 'below' name might clip into table. Use Z-index.
                                Table is Z-0, Players Z-10.
                            */}
                            <div className="relative flex flex-col items-center -mt-1 z-20 scale-75 md:scale-90 lg:scale-100">
                                {/* Face Down */}
                                <div className="flex -space-x-1">
                                    {p.faceDownCards.map((_, idx) => (
                                        <div key={`fd-${idx}`}
                                            draggable={isMe && gameState.status === 'playing' && isMyTurn}
                                            onDragStart={(e) => isMe && handleDragStart(e, idx, 'faceDown')}
                                            className={`${isMe ? 'cursor-pointer hover:-translate-y-2' : ''} transition-transform`}>
                                            <Card isHidden={true} className="w-10 h-14 shadow-md border border-slate-700" />
                                        </div>
                                    ))}
                                </div>
                                {/* Face Up (Overlay) */}
                                <div className="flex -space-x-1 -mt-10">
                                    {p.faceUpCards.map((c, idx) => {
                                        const isSelected = isMe && gameState.status === 'playing' && currentPlayer!.hand.length === 0 && selectedCardIndices.includes(idx);
                                        return (
                                            <div key={`fu-${idx}`}
                                                draggable={isMe && gameState.status === 'playing'}
                                                onDragStart={(e) => isMe && handleDragStart(e, idx, 'faceUp')}
                                                onDrop={(e) => isMe && handleDrop(e, idx)}
                                                onDragOver={(e) => isMe && handleDragOver(e)}
                                                onClick={() => {
                                                    if (!isMe) return;
                                                    // FaceUp click logic (similar to existing)
                                                    if (gameState.status === 'preparing') setSelectedFaceUpIndex(idx === selectedFaceUpIndex ? null : idx);
                                                    else if (gameState.status === 'playing' && isMyTurn && currentPlayer!.hand.length === 0) {
                                                        setSelectedCardIndices(prev => prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]);
                                                    }
                                                }}
                                                className={`transition-transform duration-200 ${isMe ? 'hover:-translate-y-2 cursor-pointer' : ''} ${isMe && (selectedFaceUpIndex === idx || isSelected) ? 'ring-2 ring-yellow-400 -translate-y-4' : ''}`}
                                            >
                                                <Card card={c} className="w-10 h-14 shadow-lg" />
                                                {/* Swap Drop Zone Highlight */}
                                                {isMe && gameState.status === 'preparing' && <div className="absolute inset-0 hover:bg-yellow-400/30 rounded" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    );
                })}


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
                        <button onClick={() => handleExecutePlay('hand')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full font-bold shadow-lg animate-bounce">
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
                        <button onClick={onSetReady} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-full font-bold shadow-lg">
                            SIAP
                        </button>
                    )}

                    {/* Sort Button */}
                    {currentPlayer.hand.length > 1 && (
                        <button onClick={() => actions.sortHand(gameState.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg active:bg-green-500 transition-colors">
                            🔃 Urutkan
                        </button>
                    )}
                </div>

                {/* The Hand */}
                <div className="pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent pb-4 pt-8 px-4">
                    <div
                        key={`hand-container-${gameState.version}`}
                        className={`
                            flex justify-center items-end 
                            w-full max-w-6xl mx-auto overflow-x-visible
                            ${currentPlayer.hand.length > 8 ? '-space-x-8 md:-space-x-12' : '-space-x-4 md:-space-x-6'}
                            hover:space-x-0 md:hover:space-x-1 transition-all duration-300 min-h-[140px]
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
                                    className={`relative transform transition-all duration-200 origin-bottom hover:-translate-y-4 hover:scale-110 z-${10 + i} ${isSelected || preparingSelected ? '-translate-y-8 scale-110 z-50' : ''}`}
                                    style={{ zIndex: isSelected ? 100 : 10 + i }}
                                >
                                    {/* Swap Button Overlay */}
                                    {preparingSelected && selectedFaceUpIndex !== null && (
                                        <button onClick={(e) => { e.stopPropagation(); handleSwap(); }} className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 rounded-full px-2 py-0.5 text-[10px] font-bold animate-bounce z-50">Tukar</button>
                                    )}
                                    <Card card={c} className={`shadow-2xl rounded-lg w-24 h-36 md:w-32 md:h-48 border border-slate-400/30 ${isSelected || preparingSelected ? 'ring-4 ring-yellow-400' : ''}`} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

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
