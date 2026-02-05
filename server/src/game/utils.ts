import { Rank } from './types';

export const getCardValue = (rank: Rank): number => {
    switch (rank) {
        case '2': return 2; // Special: Reset
        case '3': return 3;
        case '4': return 4;
        case '5': return 5;
        case '6': return 6;
        case '7': return 7; // Special: Next < 7
        case '8': return 8;
        case '9': return 9;
        case '10': return 10; // Special: Burn
        case 'J': return 11;
        case 'Q': return 12;
        case 'K': return 13;
        case 'A': return 14;
        case 'joker': return 99; // Assume functional on anything, value depends on usage
        default: return 0;
    }
};

export const isSpecialCard = (rank: Rank): boolean => {
    return ['2', '7', '10', 'joker'].includes(rank);
};
