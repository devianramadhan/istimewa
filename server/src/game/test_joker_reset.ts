
import { GameManager } from './GameManager';
import { GameState, Player } from './types';
import { getCardValue } from './utils';

console.log("=== Testing Joker Reset Rules ===");
const gm = new GameManager();

// Mock Game
const mockGame: GameState = {
    id: 'test-joker',
    players: [],
    deck: [],
    // TOP CARD IS JOKER
    discardPile: [{ suit: 'joker', rank: 'joker' }],
    currentPlayerIndex: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    message: ''
};

// Mock Player playing a LOW card (3)
const mockPlayer: Player = {
    id: 'p1',
    name: 'User',
    hand: [{ suit: 'clubs', rank: '3' }],
    faceUpCards: [],
    faceDownCards: [],
    isReady: true,
    hasSwapped: true,
    connected: true
};

mockGame.players.push(mockPlayer);
// @ts-ignore
gm.games.set('test-joker', mockGame);

const topCard = mockGame.discardPile[0]; // Joker
const playCard = mockPlayer.hand[0]; // 3

console.log(`Top Card: ${topCard.rank} (Val: ${getCardValue(topCard.rank)})`);
console.log(`Play Card: ${playCard.rank} (Val: ${getCardValue(playCard.rank)})`);

// Check Validity
const isValid = (gm as any).isValidMove(playCard, topCard);
console.log(`Can play '3' on 'Joker'? Result: ${isValid} (Expected: TRUE per user rule)`);

if (!isValid) {
    console.error("FAIL: Current logic blocks playing normal cards on Joker.");
} else {
    console.log("SUCCESS: Logic allows playing on Joker.");
}
