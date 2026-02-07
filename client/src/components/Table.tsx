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
        <div className="flex items-center justify-center gap-3 md:gap-6 p-2 md:p-4 bg-slate-800/40 rounded-xl border border-slate-700/30 backdrop-blur-sm transition-all">
            {/* Deck */}
            <div className="flex flex-col items-center gap-1">
                <div className="relative">
                    {deckCount > 0 ? (
                        <Card
                            isHidden={true}
                            small={true}
                            onClick={() => isCurrentPlayer && onDrawCard()}
                            className={isCurrentPlayer ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 transition-all" : "transition-all"}
                        />
                    ) : (
                        <div className="w-14 h-20 border-2 border-slate-700 border-dashed rounded-lg flex items-center justify-center text-slate-600 text-[10px] transition-all">
                            Kosong
                        </div>
                    )}
                    {/* Stack effect */}
                    {deckCount > 1 && (
                        <div className="absolute top-0.5 left-0.5 w-14 h-20 bg-slate-700 rounded-lg border border-slate-600 -z-10 transition-all"></div>
                    )}
                </div>
                <span className="text-slate-400 text-[10px] md:text-xs font-medium">Deck ({deckCount})</span>
            </div>

            {/* Discard Pile */}
            <div className="flex flex-col items-center gap-1">
                <div
                    className={`relative transition-all ${isCurrentPlayer ? 'hover:scale-105' : ''} ${discardPile.length > 0 ? 'cursor-pointer' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => discardPile.length > 0 && onDiscardPileClick && onDiscardPileClick()}
                >
                    {topCard ? (
                        <Card card={topCard} small={true} className={`transition-all ${isCurrentPlayer ? "ring-2 ring-yellow-500/50" : ""}`} />
                    ) : (
                        <div className={`w-14 h-20 border-2 ${isCurrentPlayer ? 'border-yellow-400 bg-yellow-400/10' : 'border-slate-600'} border-dashed rounded-lg flex items-center justify-center text-slate-500 text-[10px] transition-colors`}>
                            {isCurrentPlayer ? 'Drop' : 'Discard'}
                        </div>
                    )}
                    {/* Drop overlay hint */}
                    {isCurrentPlayer && (
                        <div className="absolute inset-0 z-20 rounded-lg border-2 border-transparent hover:border-yellow-400 pointer-events-none transition-colors" />
                    )}
                </div>
                <span className="text-slate-400 text-[10px] md:text-xs font-medium">Pile ({discardPile.length})</span>
            </div>
        </div>
    );
};
