import React from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
    card?: CardType;
    isHidden?: boolean;
    onClick?: () => void;
    className?: string; // For extra styling/positioning
}

const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

const suitColors: Record<string, string> = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-slate-900',
    spades: 'text-slate-900'
};

export const Card: React.FC<CardProps> = ({ card, isHidden = false, onClick, className = '' }) => {
    const isJoker = card && (card.suit === 'joker' || card.rank === 'joker');

    if (isHidden || !card) {
        return (
            <div
                onClick={onClick}
                className={`
                    w-20 h-28 bg-slate-700 rounded-lg border-2 border-slate-500 shadow-md 
                    flex items-center justify-center cursor-pointer hover:bg-slate-600 transition-transform transform hover:-translate-y-1
                    ${className}
                `}
            >
                <div className="w-16 h-24 border-2 border-dashed border-slate-500 rounded flex items-center justify-center">
                    <span className="text-2xl text-slate-500">?</span>
                </div>
            </div>
        );
    }

    if (isJoker) {
        return (
            <div
                onClick={onClick}
                className={`
                    w-20 h-28 bg-gradient-to-br from-purple-100 to-purple-300 rounded-lg shadow-md border-2 border-purple-400 relative select-none
                    flex flex-col items-center justify-center p-2 cursor-pointer hover:shadow-lg transition-transform transform hover:-translate-y-2
                    ${className}
                `}
            >
                <div className="text-sm font-bold text-purple-700 absolute top-1 left-2">JOKER</div>
                <div className="text-4xl text-purple-600">🤡</div>
                <div className="text-sm font-bold text-purple-700 absolute bottom-1 right-2 transform rotate-180">JOKER</div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`
                w-20 h-28 bg-white rounded-lg shadow-md border border-slate-300 relative select-none
                flex flex-col items-center justify-between p-2 cursor-pointer hover:shadow-lg transition-transform transform hover:-translate-y-2
                ${className}
            `}
        >
            <div className={`text-lg font-bold self-start ${suitColors[card.suit]}`}>
                {card.rank}
            </div>
            <div className={`text-4xl ${suitColors[card.suit]}`}>
                {suitSymbols[card.suit]}
            </div>
            <div className={`text-lg font-bold self-end ${suitColors[card.suit]} transform rotate-180`}>
                {card.rank}
            </div>
        </div>
    );
};
