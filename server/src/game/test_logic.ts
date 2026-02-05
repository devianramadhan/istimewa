
import { GameManager } from './GameManager';
import { Card, GameState, Player } from './types';
import { getCardValue } from './utils';

console.log("=== Debugging Logic 4 vs 5 ===");

const gm = new GameManager();

// Mock Game State
const mockGame: GameState = {
    id: 'test-room',
    players: [],
    deck: [],
    discardPile: [{ suit: 'diamonds', rank: '5' }], // Top card is 5
    currentPlayerIndex: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    message: ''
};

// Mock Player with 4 and 3
const mockPlayer: Player = {
    id: 'p1',
    name: 'User',
    hand: [
        { suit: 'spades', rank: '4' },
        { suit: 'clubs', rank: '3' }
    ],
    faceUpCards: [],
    faceDownCards: [],
    isReady: true,
    hasSwapped: true,
    connected: true
};

mockGame.players.push(mockPlayer);
// @ts-ignore - injecting mock game
gm.games.set('test-room', mockGame);

// Test getCardValue
console.log(`Value of 4: ${getCardValue('4')}`);
console.log(`Value of 3: ${getCardValue('3')}`);
console.log(`Value of 5: ${getCardValue('5')}`);

// Test isValidMove manually
const topCard = mockGame.discardPile[0];
console.log(`Top Card: ${topCard.rank} (Value: ${getCardValue(topCard.rank)})`);

for (const card of mockPlayer.hand) {
    const val = getCardValue(card.rank);
    const topVal = getCardValue(topCard.rank);
    const isValid = val >= topVal;
    console.log(`Card ${card.rank} (${val}) >= ${topCard.rank} (${topVal}) ? ${isValid}`);
    // Check GameManager's method if accessible (it's private, but we can verify logic)
}

// Access private method via any cast
const hasValid = (gm as any).playerHasValidMove(mockGame, mockPlayer);
console.log(`playerHasValidMove Result: ${hasValid}`);

if (hasValid) {
    console.error("FAIL: Logic says VALID move exists, but it should be INVALID");
} else {
    console.log("SUCCESS: Logic correctly identifies NO valid moves");
}
