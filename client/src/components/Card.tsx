import React from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
    card?: CardType;
    isHidden?: boolean;
    onClick?: () => void;
    className?: string; // For extra styling/positioning
    small?: boolean; // For smaller cards (opponent cards)
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

export const Card: React.FC<CardProps> = ({ card, isHidden = false, onClick, className = '', small = false }) => {
    const isJoker = card && (card.suit === 'joker' || card.rank === 'joker');

    // Size classes based on small prop
    const sizeClasses = small
        ? 'w-14 h-20' // Small cards for opponents
        : 'w-20 h-28'; // Default size

    const rankTextSize = small ? 'text-xs' : 'text-lg';
    const suitTextSize = small ? 'text-xl' : 'text-4xl';
    const paddingSize = small ? 'p-1' : 'p-2';
    const innerBorderSize = small ? 'w-10 h-14' : 'w-16 h-24';
    const questionMarkSize = small ? 'text-lg' : 'text-2xl';

    if (isHidden || !card) {
        return (
            <div
                onClick={onClick}
                className={`
                    ${sizeClasses} bg-slate-700 rounded-lg border-2 border-slate-500 shadow-md 
                    flex items-center justify-center overflow-hidden
                    ${className}
                `}
            >
                <div className={`${innerBorderSize} border-2 border-dashed border-slate-500 rounded flex items-center justify-center`}>
                    <span className={`${questionMarkSize} text-slate-500`}>?</span>
                </div>
            </div>
        );
    }

    if (isJoker) {
        const jokerTextSize = small ? 'text-[8px]' : 'text-sm';
        const jokerEmojiSize = small ? 'text-xl' : 'text-4xl';

        return (
            <div
                onClick={onClick}
                className={`
                    ${sizeClasses} bg-gradient-to-br from-purple-100 to-purple-300 rounded-lg shadow-md border-2 border-purple-400 relative select-none
                    flex flex-col items-center justify-center ${paddingSize} overflow-hidden
                    ${className}
                `}
            >
                <div className={`${jokerTextSize} font-bold text-purple-700 absolute top-0.5 left-1`}>JOKER</div>
                <div className={`${jokerEmojiSize} text-purple-600`}>🤡</div>
                <div className={`${jokerTextSize} font-bold text-purple-700 absolute bottom-0.5 right-1 transform rotate-180`}>JOKER</div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`
                ${sizeClasses} bg-white rounded-lg shadow-md border border-slate-300 relative select-none
                flex flex-col items-center justify-between ${paddingSize} overflow-hidden
                ${className}
            `}
        >
            <div className={`${rankTextSize} font-bold self-start leading-none ${suitColors[card.suit]}`}>
                {card.rank}
            </div>
            <div className={`${suitTextSize} leading-none ${suitColors[card.suit]}`}>
                {suitSymbols[card.suit]}
            </div>
            <div className={`${rankTextSize} font-bold self-end leading-none ${suitColors[card.suit]} transform rotate-180`}>
                {card.rank}
            </div>
        </div>
    );
};
