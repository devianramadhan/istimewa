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

    return (
        <div className="flex flex-col h-screen w-full relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-white">

            {/* Header Info */}
            {/* Header Info - Responsive Container */}
            {/* Header Info - Responsive Container */}
            <div className="absolute top-0 w-full p-2 md:p-4 flex flex-col md:flex-row justify-start md:justify-between items-stretch md:items-start gap-2 z-20 pointer-events-none">

                {/* Top Row: Room ID & Status (Side by Side on big screens, Stacked on Mobile or Mini-Side-by-Side) */}

                <div className="flex flex-row justify-between items-start w-full gap-2">

                    {/* Room ID */}
                    <div className="bg-slate-800/90 px-3 py-1.5 md:py-2 rounded-lg backdrop-blur-sm border border-slate-700 pointer-events-auto flex-shrink-0">
                        <div className="flex flex-row items-center gap-2">
                            <span className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider">Room:</span>
                            <div className="text-white font-mono text-xs md:text-lg font-bold max-w-[100px] md:max-w-none truncate">{gameState.id}</div>
                            <button
                                onClick={() => navigator.clipboard.writeText(gameState.id)}
                                className="p-1 hover:bg-white/10 rounded transition text-blue-300"
                            >
                                📋
                            </button>
                        </div>
                    </div>

                    {/* Status Box */}
                    <div className="bg-slate-800/90 px-3 py-1.5 md:py-2 rounded-lg backdrop-blur-sm border border-slate-700 pointer-events-auto flex-1 min-w-0 flex flex-col items-end">
                        <div className={`font-bold text-xs md:text-base leading-tight truncate w-full text-right ${isMyTurn ? 'text-green-400' : 'text-yellow-400'}`}>
                            {gameState.status === 'preparing' ? 'Persiapan' : isMyTurn ? "GILIRANMU" : `Giliran ${gameState.players[gameState.currentPlayerIndex]?.name}`}
                        </div>
                        {gameState.message && (
                            <div className="text-[10px] md:text-xs text-blue-300 mt-0.5 leading-tight truncate w-full text-right">
                                {gameState.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Opponents Area */}
            <div className="flex justify-center gap-8 pt-16 pb-4">
                {opponents.map(opp => (
                    <div key={opp.id} className={`flex flex-col items-center p-4 rounded-xl transition border border-transparent ${gameState.players[gameState.currentPlayerIndex]?.id === opp.id ? 'bg-slate-800/60 border-yellow-500/50' : ''}`}>
                        <div className="text-white font-medium mb-2">{opp.name} {opp.isReady && gameState.status === 'preparing' ? '✅' : ''}</div>

                        {/* Opponent Hand (Hidden) */}
                        {opp.hand.length > 0 && (
                            <div className="flex space-x-1 mb-3">
                                {opp.hand.map((_, i) => (
                                    <Card
                                        key={`hand-${i}`}
                                        isHidden={true}
                                        className="w-10 h-14 scale-75 shadow-md border border-slate-600 !cursor-default !hover:translate-y-0"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="relative h-20 w-24 flex items-center justify-center mb-2">
                            {/* Face Down Layer */}
                            <div className="absolute flex space-x-1 transform translate-y-1">
                                {opp.faceDownCards.map((_, i) => (
                                    <div key={`fd-${i}`} className="">
                                        <Card isHidden={true} className="w-10 h-14 scale-75 shadow-md border border-slate-600 !cursor-default !hover:translate-y-0" />
                                    </div>
                                ))}
                            </div>
                            {/* Face Up Layer - Render Fixed 3 Slots? Or just list? */}
                            {/* User said "fix empty card display". Likely wants placeholders if slots are empty? */}
                            {/* But Palance typically has 3 face up. If array has 3 items, and one is 'empty'? */}
                            {/* Let's just render the actual cards without interaction */}
                            <div className="absolute flex space-x-1 z-10 transform -translate-y-1">
                                {opp.faceUpCards.map((c, i) => (
                                    <div key={`fu-${i}`} className="">
                                        {/* Use strict overrides to kill all animations/interactions */}
                                        <Card card={c} className="w-10 h-14 scale-75 shadow-lg !cursor-default !hover:translate-y-0 !hover:shadow-md !transform-none !transition-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Central Table */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
                <Table
                    discardPile={gameState.discardPile}
                    deckCount={gameState.deck.length}
                    onDrawCard={() => { }}
                    isCurrentPlayer={isMyTurn}
                    onDropCard={handlePlayDrop}
                    onDiscardPileClick={() => setShowDiscardPile(true)}
                />

                {/* Game Actions */}
                {gameState.status === 'playing' && isMyTurn && (
                    <div className="flex flex-col gap-2 items-center h-16">
                        {/* Play Button - Only if selection exists and NOT dragging? 
                            Dragging is alternative to button. Keep button for accessibility/preference.
                        */}
                        {selectedCardIndices.length > 0 && (
                            <button
                                onClick={() => handleExecutePlay('hand')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-full font-bold shadow-lg animate-pulse"
                            >
                                Mainkan {selectedCardIndices.length} Kartu
                            </button>
                        )}

                        {gameState.discardPile.length > 0 && (
                            <button
                                onClick={onTakePile}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                Ambil Kartu
                            </button>
                        )}
                    </div>
                )}

                {gameState.status === 'preparing' && !currentPlayer.isReady && (
                    <div className="flex gap-4">
                        <button
                            onClick={onSetReady}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition"
                        >
                            SIAP MAIN
                        </button>
                    </div>
                )}

                {/* Lobby Waiting UI */}
                {gameState.status === 'waiting' && (
                    <div className="flex flex-col items-center gap-6 animate-fade-in-up">
                        <div className="text-2xl font-bold text-blue-300">
                            Menunggu Pemain Lain...
                        </div>

                        {/* Status Check for Host Start */}
                        {gameState.players.every(p => p.isReady) && gameState.players.length > 1 ? (
                            isHost ? (
                                <button
                                    onClick={() => actions.startGame(gameState.id)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-10 py-4 rounded-full font-bold shadow-xl text-xl transform transition hover:scale-105 animate-pulse"
                                >
                                    👑 MULAI GAME
                                </button>
                            ) : (
                                <div className="bg-slate-800/80 px-8 py-3 rounded-full border border-blue-500/30 text-blue-200 animate-pulse">
                                    Host sedang menyiapkan permainan...
                                </div>
                            )
                        ) : (
                            <div className="flex gap-4">
                                {!currentPlayer.isReady ? (
                                    <button
                                        onClick={onSetReady}
                                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-lg text-lg transform transition hover:scale-105"
                                    >
                                        SAYA SIAP!
                                    </button>
                                ) : (
                                    <div className="bg-slate-700 text-slate-300 px-8 py-3 rounded-full font-bold shadow-inner">
                                        Menunggu yang lain... ⏳
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 text-sm text-slate-400">
                            {gameState.players.filter(p => p.isReady).length} / {gameState.players.length} Pemain Siap
                        </div>
                    </div>
                )}
            </div>

            {/* My Player Area */}
            <div className="pb-8 px-4 flex flex-col items-center justify-end gap-4 pointer-events-none w-full h-full absolute inset-0">

                {/* Face Up/Down Cards - Centered above Hand */}
                <div className="absolute bottom-[220px] md:bottom-[280px] left-0 right-0 flex justify-center pointer-events-auto z-10 scale-90 md:scale-100 origin-bottom">
                    <div className="relative h-28 md:h-32 flex items-center justify-center">
                        {/* Face Down Layer - Bottom */}
                        <div className="absolute flex space-x-1 md:space-x-2 transform translate-y-2 md:translate-y-4">
                            {currentPlayer.faceDownCards.map((_, i) => (
                                <div
                                    key={`my-fd-${i}`}
                                    draggable={gameState.status === 'playing' && isMyTurn}
                                    onDragStart={(e) => handleDragStart(e, i, 'faceDown')}
                                    className="transition-transform hover:-translate-y-2 cursor-pointer"
                                    onClick={() => gameState.status === 'playing' && isMyTurn ? onPlayCard([i], 'faceDown') : null}
                                >
                                    <Card isHidden={true} className="w-16 h-24 md:w-20 md:h-28 shadow-lg border-2 border-slate-600" />
                                </div>
                            ))}
                        </div>

                        {/* Face Up Layer - Top (Z-Index High) */}
                        <div className="absolute flex space-x-1 md:space-x-2 z-10 transform -translate-y-3 md:-translate-y-4">
                            {currentPlayer.faceUpCards.map((c, i) => {
                                const isSelected = gameState.status === 'playing' && currentPlayer.hand.length === 0 && selectedCardIndices.includes(i);
                                // Stable Drop Target: Disable hover-move during preparing
                                const canHoverMove = gameState.status !== 'preparing';

                                return (
                                    <div
                                        key={`my-fu-${i}`}
                                        draggable={gameState.status === 'playing' && isMyTurn && currentPlayer.hand.length === 0}
                                        onDragStart={(e) => handleDragStart(e, i, 'faceUp')}
                                        className={`
                                            transition-transform duration-200 relative
                                            ${canHoverMove ? 'hover:-translate-y-4 cursor-pointer' : ''} 
                                            ${selectedFaceUpIndex === i || isSelected ? 'ring-2 md:ring-4 ring-purple-500 rounded-lg transform -translate-y-4 scale-105' : ''}
                                        `}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, i)}
                                        onClick={() => {
                                            if (gameState.status === 'preparing') setSelectedFaceUpIndex(i === selectedFaceUpIndex ? null : i);
                                            else if (gameState.status === 'playing' && isMyTurn) {
                                                if (currentPlayer.hand.length > 0) return;
                                                setSelectedCardIndices(prev => {
                                                    if (prev.length === 0) return [i];
                                                    if (prev.includes(i)) return prev.filter(idx => idx !== i);
                                                    if (currentPlayer.faceUpCards[prev[0]].rank !== c.rank) return [i];
                                                    return [...prev, i];
                                                });
                                            }
                                        }}
                                    >
                                        <Card card={c} className={`w-16 h-24 md:w-20 md:h-28 shadow-xl ${gameState.status === 'preparing' ? 'border-2 border-dashed border-white/50 bg-white/90' : ''}`} />

                                        {/* Drop Zone Highlight Overlay */}
                                        {gameState.status === 'preparing' && (
                                            <div className="absolute inset-0 rounded-lg border-2 border-transparent hover:border-yellow-400 hover:bg-yellow-400/20 pointer-events-none transition-colors" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* My Hand - Responsive Fixed Bottom */}
                <div className="flex flex-col items-center bg-black/40 p-2 md:p-4 rounded-t-2xl backdrop-blur-md border-t border-white/10 w-full max-w-4xl fixed bottom-0 z-30 pb- safe-area-bottom">
                    <div className="text-[10px] md:text-xs text-slate-400 mb-1 md:mb-2 uppercase tracking-wide">Kartu Tangan</div>
                    <div className="flex -space-x-4 md:space-x-2 hover:space-x-1 md:hover:space-x-3 transition-all duration-300 px-2 md:px-8 py-2 overflow-x-visible items-end min-h-[100px] md:min-h-auto w-full justify-center">
                        {currentPlayer.hand.map((c, i) => {
                            const isSelected = gameState.status === 'playing' && selectedCardIndices.includes(i);
                            const preparingSelected = gameState.status === 'preparing' && selectedHandIndex === i;
                            const isDraggable = gameState.status === 'preparing' || (gameState.status === 'playing' && isMyTurn);

                            return (
                                <div
                                    key={`my-hand-${i}`}
                                    draggable={isDraggable}
                                    onDragStart={(e) => handleDragStart(e, i, 'hand')}
                                    className={`relative transform transition-all flex-shrink-0
                                        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
                                        ${isSelected || preparingSelected ? '-translate-y-4 md:-translate-y-6 z-40' : 'hover:-translate-y-2 md:hover:-translate-y-4 hover:z-30'}
                                    `}
                                    onClick={() => {
                                        if (gameState.status === 'preparing') setSelectedHandIndex(i === selectedHandIndex ? null : i);
                                        else if (gameState.status === 'playing' && isMyTurn) {
                                            handleCardClick(i, 'hand');
                                        }
                                    }}
                                >
                                    {/* Swap Button Contextual */}
                                    {preparingSelected && selectedFaceUpIndex !== null && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSwap();
                                            }}
                                            className="absolute -top-8 md:-top-12 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg whitespace-nowrap z-50 animate-bounce"
                                        >
                                            Tukar
                                        </button>
                                    )}
                                    <Card
                                        card={c}
                                        className={`shadow-2xl transition-all duration-200
                                            w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 
                                            text-xs sm:text-sm md:text-base
                                            ${isSelected || preparingSelected ? 'ring-2 md:ring-4 ring-purple-500 rounded-lg' : ''}
                                        `}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Discard Pile Viewer Modal */}
            {
                showDiscardPile && gameState.discardPile.length > 0 && (
                    <div
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 animate-fade-in"
                        onClick={() => setShowDiscardPile(false)}
                    >
                        <div className="bg-slate-800/95 rounded-2xl p-8 max-w-6xl max-h-[80vh] overflow-auto border-2 border-slate-600 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">Kartu Buangan ({gameState.discardPile.length})</h3>
                                <button
                                    onClick={() => setShowDiscardPile(false)}
                                    className="text-slate-400 hover:text-white text-3xl leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {gameState.discardPile.map((card, i) => (
                                    <div
                                        key={`discard-${i}`}
                                        className="transform transition-all duration-300 hover:scale-110 hover:-translate-y-2"
                                        style={{
                                            animation: `slideIn 0.3s ease-out ${i * 0.05}s both`
                                        }}
                                    >
                                        <Card card={card} className="w-20 h-28 shadow-xl" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};
