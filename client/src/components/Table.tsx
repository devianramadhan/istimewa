import React from 'react';
import type { Card as CardType } from '../types';
import { Card } from './Card';

interface TableProps {
    discardPile: CardType[];
    deckCount: number;
    onDrawCard: () => void;
    isCurrentPlayer: boolean;
    onDropCard?: (e: React.DragEvent) => void;
    onDiscardPileClick?: () => void;
}

export const Table: React.FC<TableProps> = ({ discardPile, deckCount, onDrawCard, isCurrentPlayer, onDropCard, onDiscardPileClick }) => {
    const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : undefined;

    const handleDragOver = (e: React.DragEvent) => {
        if (!isCurrentPlayer) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isCurrentPlayer) return;
        e.preventDefault();
        onDropCard && onDropCard(e);
    };

    return (
        <div className="flex items-center justify-center gap-6 md:gap-12 p-4 md:p-8 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm transition-all">
            {/* Deck */}
            <div className="flex flex-col items-center gap-2">
                <div className="relative">
                    {deckCount > 0 ? (
                        <Card
                            isHidden={true}
                            onClick={() => isCurrentPlayer && onDrawCard()}
                            className={isCurrentPlayer ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 transition-all" : "w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 transition-all"}
                        />
                    ) : (
                        <div className="w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 border-2 border-slate-700 border-dashed rounded-lg flex items-center justify-center text-slate-600 text-[10px] md:text-xs lg:text-sm transition-all">
                            Kosong
                        </div>
                    )}
                    {/* Stack effect */}
                    {deckCount > 1 && (
                        <div className="absolute top-1 left-1 w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 bg-slate-700 rounded-lg border border-slate-600 -z-10 transition-all"></div>
                    )}
                </div>
                <span className="text-slate-400 text-xs md:text-sm font-medium">Deck ({deckCount})</span>
            </div>

            {/* Discard Pile */}
            <div className="flex flex-col items-center gap-2">
                <div
                    className={`relative transition-all ${isCurrentPlayer ? 'hover:scale-105' : ''} ${discardPile.length > 0 ? 'cursor-pointer' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => discardPile.length > 0 && onDiscardPileClick && onDiscardPileClick()}
                >
                    {topCard ? (
                        <Card card={topCard} className={`w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 transition-all ${isCurrentPlayer ? "ring-2 ring-yellow-500/50" : ""}`} />
                    ) : (
                        <div className={`w-14 h-20 md:w-20 md:h-28 lg:w-24 lg:h-36 border-2 ${isCurrentPlayer ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-600'} border-dashed rounded-lg flex items-center justify-center text-slate-500 text-[10px] md:text-xs lg:text-sm transition-colors`}>
                            {isCurrentPlayer ? 'Drop here' : 'Discard'}
                        </div>
                    )}
                    {/* Drop overlay hint */}
                    {isCurrentPlayer && (
                        <div className="absolute inset-0 z-20 rounded-lg border-2 border-transparent hover:border-yellow-400 pointer-events-none transition-colors" />
                    )}
                </div>
                <span className="text-slate-400 text-xs md:text-sm font-medium">Buangan ({discardPile.length})</span>
            </div>
        </div>
    );
};
