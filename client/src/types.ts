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
}

export type GameStatus = 'waiting' | 'preparing' | 'playing' | 'finished';

export interface GameState {
    id: string; // Room ID
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    currentPlayerIndex: number;
    direction: 1 | -1;
    status: GameStatus;
    winner: string | null;
    message?: string;
    version: number;
    cardToBeat?: Card | null;
}
