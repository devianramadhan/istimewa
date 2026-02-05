import React from 'react';
import type { Card as CardType } from '../types';
import { Card } from './Card';

interface PlayerHandProps {
    hand: CardType[];
    isCurrentPlayer: boolean;
    onPlayCard: (index: number) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ hand, isCurrentPlayer, onPlayCard }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent flex flex-col items-center justify-end min-h-[180px]">
            <div className="mb-2 text-slate-300 font-semibold text-sm">
                {isCurrentPlayer ? "Giliranmu! Pilih kartu untuk dibuang." : "Menunggu lawan..."}
            </div>
            <div className="flex -space-x-8 hover:space-x-1 transition-all duration-300 p-2">
                {hand.map((card, index) => (
                    <Card
                        key={`${card.suit}-${card.rank}-${index}`}
                        card={card}
                        onClick={() => isCurrentPlayer && onPlayCard(index)}
                        className={`${isCurrentPlayer ? 'hover:z-10 cursor-pointer' : 'cursor-default opacity-80'}`}
                    />
                ))}
            </div>
        </div>
    );
};
