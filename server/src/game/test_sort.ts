
import { GameManager } from './GameManager';
import { Card, GameState, Player, Rank } from './types';
import { getCardValue } from './utils';

console.log("=== Debugging Sort Hand Logic ===");

const gm = new GameManager();

// Mock Game State
const mockGame: GameState = {
    id: 'test-room-sort',
    players: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    status: 'playing',
    winner: null,
    message: '',
    version: 0
};

// Mock Player with Mixed Hand (Low, High, Special, Duplicate)
const mockPlayer: Player = {
    id: 'p1',
    name: 'User',
    hand: [
        { suit: 'hearts', rank: 'A' },    // High Normal (14)
        { suit: 'diamonds', rank: '3' },  // Lowest (3)
        { suit: 'clubs', rank: '2' },     // Special High (15)
        { suit: 'spades', rank: '7' },    // Normal Middle (7)
        { suit: 'hearts', rank: '10' },   // Special Burn (16)
        { suit: 'joker', rank: 'joker' }, // Highest (17)
        { suit: 'clubs', rank: '5' },     // Low Normal (5)
        { suit: 'diamonds', rank: 'K' },  // High Normal (13)
        { suit: 'spades', rank: '2' },    // Special High (15) - check stable sort/suit
    ],
    faceUpCards: [],
    faceDownCards: [],
    isReady: true,
    hasSwapped: true,
    connected: true
};

mockGame.players.push(mockPlayer);
// @ts-ignore - injecting mock game
gm.games.set('test-room-sort', mockGame);

console.log("Original Hand:", mockPlayer.hand.map(c => `${c.rank}${c.suit === 'joker' ? '' : c.suit[0]}`).join(', '));

// Run Sort
gm.sortHand('test-room-sort', 'p1');

console.log("Sorted Hand:  ", mockPlayer.hand.map(c => `${c.rank}${c.suit === 'joker' ? '' : c.suit[0]}`).join(', '));

// Validation
// Expected Order: 3, 5, 7, K, A, 2, 2, 10, Joker (Powers: 3, 5, 7, 13, 14, 15, 15, 16, 17)
const expectedRanks = ['3', '5', '7', 'K', 'A', '2', '2', '10', 'joker'];
const actualRanks = mockPlayer.hand.map(c => c.rank);

let pass = true;
if (actualRanks.length !== expectedRanks.length) pass = false;
else {
    for (let i = 0; i < actualRanks.length; i++) {
        if (actualRanks[i] !== expectedRanks[i]) {
            console.error(`Mismatch at index ${i}: Expected ${expectedRanks[i]}, Got ${actualRanks[i]}`);
            pass = false;
        }
    }
}

if (pass) {
    console.log("SUCCESS: Sorting logic is correct.");
} else {
    console.error("FAIL: Sorting logic incorrect.");
}
