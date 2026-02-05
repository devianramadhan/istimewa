
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
    discardPile: [{ suit: 'diamonds', rank: '7' }], // Top card is 7 (Rule: Next < 7)
    currentPlayerIndex: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    message: '',
    version: 0
};

// Mock Player with Special Cards (10, Joker)
const mockPlayer: Player = {
    id: 'p1',
    name: 'User',
    hand: [
        { suit: 'clubs', rank: '10' }, // Special (Burn) - Should be valid on 7
        { suit: 'hearts', rank: 'J' }  // Invalid (> 7)
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
console.log(`Value of 10: ${getCardValue('10')}`);
console.log(`Value of 7: ${getCardValue('7')}`);

// Test isValidMove manually
const topCard = mockGame.discardPile[0];
console.log(`Top Card: ${topCard.rank} (Value: ${getCardValue(topCard.rank)})`);

const card10 = mockPlayer.hand[0]; // 10
const cardJ = mockPlayer.hand[1];  // J

// Access private method helper via prototype/any or just reimplement logic for test?
// Better to call the method if possible.
const isValid10 = (gm as any).isValidMove(card10, topCard);
console.log(`Is '10' valid on '7'? Result: ${isValid10} (Expected: TRUE)`);

const isValidJ = (gm as any).isValidMove(cardJ, topCard);
console.log(`Is 'J' valid on '7'? Result: ${isValidJ} (Expected: FALSE)`);

if (!isValid10) {
    console.error("FAIL: Logic incorrectly blocks Special Card '10' on '7'");
} else {
    console.log("SUCCESS: Logic correctly allows Special Card '10' on '7'");
}
