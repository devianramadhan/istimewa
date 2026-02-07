// Constants
export const MAX_PLAYERS = 10;

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'joker';

export interface Card {
    suit: Suit;
    rank: Rank;
}

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    faceUpCards: Card[];
    faceDownCards: Card[];
    isReady: boolean;
    hasSwapped: boolean;
    isBot?: boolean;
    connected?: boolean;
    finishedRank?: number; // 1st, 2nd, 3rd...
    seatIndex: number; // 0 to MAX_PLAYERS-1
}

export type GameStatus = 'waiting' | 'preparing' | 'playing' | 'finished';

export interface GameState {
    id: string; // Room ID
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    currentPlayerIndex: number;
    direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
    status: GameStatus;
    winner: string | null;
    message: string; // For game events (e.g. "Player played 7, next must play lower")
    logs: string[];
    version: number; // Increment on every update to force valid sync
    cardToBeat?: Card | null; // Card that must be beaten after Joker in 2-player game
}
