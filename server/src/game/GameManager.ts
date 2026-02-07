import { GameState, Player, Card, Suit, Rank, MAX_PLAYERS } from './types';
import { getCardValue, isSpecialCard } from './utils';

export class GameManager {
    private games: Map<string, GameState> = new Map();

    createGame(roomId: string): GameState {
        const newGame: GameState = {
            id: roomId,
            players: [],
            deck: [],
            discardPile: [],
            currentPlayerIndex: 0,
            direction: 1,
            status: 'waiting',
            winner: null,
            message: 'Waiting for players...',
            logs: [],
            version: 0
        };
        this.games.set(roomId, newGame);
        return newGame;
    }

    getGame(roomId: string): GameState | undefined {
        return this.games.get(roomId);
    }

    // Track Disconnect Timeouts: Map<roomId-playerName, Timer>
    private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

    addPlayer(roomId: string, playerId: string, name: string): boolean {
        const game = this.games.get(roomId);
        if (!game) return false;

        // Check if player already exists
        const existingPlayer = game.players.find(p => p.id === playerId);
        if (existingPlayer) {
            existingPlayer.connected = true; // Ensure marked connected
            return true;
        }

        // Check for Reconnection (Same Name, Disconnected)
        const rejoiningPlayer = game.players.find(p => p.name === name);
        if (rejoiningPlayer) {
            if (!rejoiningPlayer.connected) {
                // RECONNECT SUCCESS
                console.log(`[GameManager] Player ${name} reconnected to ${roomId}`);

                // Update ID to new socket
                rejoiningPlayer.id = playerId;
                rejoiningPlayer.connected = true;

                // Clear Timeout
                const timeoutKey = `${roomId}-${name}`;
                if (this.disconnectTimeouts.has(timeoutKey)) {
                    clearTimeout(this.disconnectTimeouts.get(timeoutKey));
                    this.disconnectTimeouts.delete(timeoutKey);
                }

                return true;
            } else {
                // Name taken and currently connected
                return false;
            }
        }

        if (game.status !== 'waiting') return false; // Cannot join if game started

        // Assign Seat
        const occupiedSeats = game.players.map(p => p.seatIndex);
        let seatIndex = -1;
        for (let i = 0; i < MAX_PLAYERS; i++) {
            if (!occupiedSeats.includes(i)) {
                seatIndex = i;
                break;
            }
        }

        if (seatIndex === -1) return false; // Room full

        const newPlayer: Player = {
            id: playerId,
            name,
            hand: [],
            faceUpCards: [],
            faceDownCards: [],
            isReady: false,
            hasSwapped: false,
            connected: true,
            seatIndex: seatIndex
        };
        game.players.push(newPlayer);
        // Sort by seatIndex to maintain order
        game.players.sort((a, b) => a.seatIndex - b.seatIndex);

        return true;
    }

    handleDisconnect(roomId: string, playerId: string): void {
        const game = this.games.get(roomId);
        if (!game) return;

        const player = game.players.find(p => p.id === playerId);
        if (!player || player.isBot) return;

        console.log(`[GameManager] Player ${player.name} disconnected from ${roomId}`);
        player.connected = false;

        // Start 10s Timer to convert to Bot
        const timeoutKey = `${roomId}-${player.name}`;
        // Clear existing if any (edge case)
        if (this.disconnectTimeouts.has(timeoutKey)) clearTimeout(this.disconnectTimeouts.get(timeoutKey));

        const timeout = setTimeout(() => {
            this.convertPlayerToBot(roomId, player.name);
        }, 10000); // 10 seconds

        this.disconnectTimeouts.set(timeoutKey, timeout);

        // Notify others handled by emit outside? Or status message?
        // game.message = `${player.name} disconnected. Waiting 10s...`;
    }

    convertPlayerToBot(roomId: string, playerName: string) {
        const game = this.games.get(roomId);
        if (!game) return;

        const player = game.players.find(p => p.name === playerName);
        if (!player || player.connected) return; // Reconnected in time

        console.log(`[GameManager] Converting ${playerName} to Bot`);

        player.isBot = true;
        player.connected = true; // Bot is "connected"
        player.name = `${player.name} (Bot)`;
        player.isReady = true;

        // Clear timeout ref
        this.disconnectTimeouts.delete(`${roomId}-${playerName}`);

        // If it's their turn, modify generic bot logic to handle "converted" bot?
        // Yes, if current turn is theirs, trigger move.
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id === player.id && game.status === 'playing') {
            this.processBotTurn(game, player.id);
        }

        // Trigger Update
        this.triggerUpdate(roomId);
    }

    // removePlayer remains mostly same

    initializeDeck(numDecks: number = 1): Card[] {
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck: Card[] = [];

        for (let d = 0; d < numDecks; d++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    deck.push({ suit, rank });
                }
            }

            // Add 4 Jokers per deck (Total 8 for 2 decks)
            for (let i = 0; i < 4; i++) {
                deck.push({ suit: 'joker', rank: 'joker' });
            }
        }

        return this.shuffleDeck(deck);
    }

    shuffleDeck(deck: Card[]): Card[] {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    setPlayerReady(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        // Allow ready in 'waiting' (Lobby) and 'preparing' (Swap Phase)
        if (!game || (game.status !== 'preparing' && game.status !== 'waiting')) return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        player.isReady = true;

        // Auto-start disabled. Waiting for Host command.
        // Exception: If in 'preparing' phase (post-deal), auto-transition to playing is OK?
        // User said: "owner room id dapat menjalankan game". implies lobby -> game.
        // What about Swap Phase -> Play Phase?
        // Usually, Swap Phase -> Play Phase is auto when everyone ready.
        // Let's keep Swap -> Play auto for flow smoothness, but Lobby -> Prep manual.

        // Auto-start Logic
        // 1. Swap Phase -> Playing Phase (Already handled below)
        // 2. Lobby -> Preparing Phase (User requested: Auto-start if with Bot)
        if (game.status === 'waiting') {
            const allReady = game.players.every(p => p.isReady);
            const hasBot = game.players.some(p => p.isBot);

            // If playing with Bot and everyone is ready, AUTO START.
            if (allReady && hasBot) {
                console.log(`[GameManager] Auto-starting bot game ${roomId}`);
                this.startGame(roomId, game.players[0].id); // Assume Host is player 0
            }
        }

        if (game.status === 'preparing') {
            // Force ensure bots are ready (safety net) - DO THIS FIRST
            game.players.forEach(p => {
                if (p.isBot && !p.isReady) {
                    p.isReady = true;
                    console.log(`[GameManager] Force-readied bot: ${p.name}`);
                }
            });

            const allReady = game.players.every(p => p.isReady);
            console.log(`[GameManager] Player ${player.name} ready in preparing phase.`);
            console.log(`[GameManager] Players ready status:`, game.players.map(p => ({ name: p.name, isReady: p.isReady, isBot: p.isBot })));
            console.log(`[GameManager] All Ready? ${allReady}`);

            if (allReady) {
                console.log(`[GameManager] Starting playing phase for room ${roomId}`);
                this.startPlayingPhase(game);
            } else {
                console.log(`[GameManager] NOT all ready yet. Waiting...`);
            }
        }

        // Trigger generic update for readiness change
        this.triggerUpdate(roomId);

        return true;
    }

    swapCards(roomId: string, playerId: string, handIndex: number, faceUpIndex: number): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'preparing') return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        // Validate Indices
        if (handIndex < 0 || handIndex >= player.hand.length) return false;
        if (faceUpIndex < 0 || faceUpIndex >= player.faceUpCards.length) return false;

        // Perform Swap
        const handCard = player.hand[handIndex];
        const faceUpCard = player.faceUpCards[faceUpIndex];

        player.hand[handIndex] = faceUpCard;
        player.faceUpCards[faceUpIndex] = handCard;

        player.hasSwapped = true; // Mark as having interacted (optional)

        // Reset Ready status if they swap? Or just keep as is.
        // Usually swapping doesn't un-ready, but here 'ready' means 'done swapping'.
        // So if they are ready, they shouldn't be able to swap?
        // UI disables swap if ready. Server should strictly enforce?
        if (player.isReady) return false;

        return true;
    }

    sortHand(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        // Allow sorting in 'preparing' or 'playing', as long as it's the player
        if (!game) return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        if (player.hand.length <= 1) return true; // Nothing to sort

        // Special cards that go to the right (in order: 2, 7, 10, Joker)
        const specialRanks: Rank[] = ['2', '7', '10', 'joker'];

        // Normal cards sorted from smallest to largest (3, 4, 5, 6, 8, 9, J, Q, K, A)
        const normalRankOrder: Rank[] = ['3', '4', '5', '6', '8', '9', 'J', 'Q', 'K', 'A'];

        const isSpecialRank = (rank: Rank): boolean => {
            return specialRanks.includes(rank);
        };

        const getSpecialOrder = (rank: Rank): number => {
            return specialRanks.indexOf(rank);
        };

        const getNormalOrder = (rank: Rank): number => {
            return normalRankOrder.indexOf(rank);
        };

        // Sort: Normal cards first (3-A), then Special cards (2, 7, 10, Joker)
        player.hand.sort((a, b) => {
            const aIsSpecial = isSpecialRank(a.rank);
            const bIsSpecial = isSpecialRank(b.rank);

            // If one is special and one is not, normal comes first
            if (aIsSpecial && !bIsSpecial) return 1;  // a goes right
            if (!aIsSpecial && bIsSpecial) return -1; // b goes right

            // Both are special - sort by special order (2, 7, 10, Joker)
            if (aIsSpecial && bIsSpecial) {
                const orderDiff = getSpecialOrder(a.rank) - getSpecialOrder(b.rank);
                if (orderDiff !== 0) return orderDiff;
                return a.suit.localeCompare(b.suit);
            }

            // Both are normal - sort by normal order (3, 4, 5, 6, 8, 9, J, Q, K, A)
            const valA = getNormalOrder(a.rank);
            const valB = getNormalOrder(b.rank);
            if (valA !== valB) return valA - valB;
            return a.suit.localeCompare(b.suit);
        });

        // Increment version to force UI update
        game.version = (game.version || 0) + 1;

        // Trigger update to reflect sorting
        // Note: index.ts emits, but here we just return true.
        return true;
    }

    startGame(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        if (!game || game.players.length < 2) return false;

        // Validate Host (First Player)
        if (game.players[0].id !== playerId) return false;

        // Validate All Ready
        if (!game.players.every(p => p.isReady)) return false;

        game.status = 'preparing';

        // Rule: If > 6 players, use 2 decks
        const numDecks = game.players.length > 6 ? 2 : 1;
        game.deck = this.initializeDeck(numDecks);

        game.discardPile = [];
        game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
        game.direction = 1;

        this.dealInitialCards(game);

        // Reset Ready Status for Preparation Phase (Swapping)
        game.players.forEach(p => p.isReady = false);

        // AUTO-READY BOTS
        game.players.forEach(p => {
            if (p.isBot) {
                p.isReady = true; // Bots skip prep
                console.log(`[GameManager] Auto-readied bot: ${p.name}`);
            }
        });

        game.message = "Preparation Phase: Swap your cards! Press Ready when done.";

        return true;
    }

    private dealInitialCards(game: GameState) {
        // Deal 2 Face Down, 2 Face Up, 2 Hand to each player
        // Total 6 cards per player

        for (const player of game.players) {
            // 2 Face Down
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.faceDownCards.push(game.deck.pop()!);
            }

            // 2 Face Up
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.faceUpCards.push(game.deck.pop()!);
            }

            // 2 Hand
            for (let i = 0; i < 2; i++) {
                if (game.deck.length > 0) player.hand.push(game.deck.pop()!);
            }
        }
    }



    private startPlayingPhase(game: GameState) {
        game.version++;
        game.status = 'playing';
        game.message = `Game Started! ${game.players[game.currentPlayerIndex].name}'s turn.`;

        // Check if first player is a bot and trigger bot turn
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.isBot) {
            console.log(`[GameManager] First player is bot (${currentPlayer.name}), triggering bot turn...`);
            this.processBotTurn(game, currentPlayer.id);
        }
    }

    handleSocketDisconnect(socketId: string) {
        for (const game of this.games.values()) {
            const player = game.players.find(p => p.id === socketId);
            if (player) {
                this.handleDisconnect(game.id, socketId);
                // Trigger update to show "Disconnected" status in UI?
                // The handleDisconnect sets connected=false.
                // We should emit update so UI shows grayed out / status.
                this.triggerUpdate(game.id);
                break; // Assume 1 room per socket
            }
        }
    }

    playCard(roomId: string, playerId: string, cardIndices: number[], source: 'hand' | 'faceUp' | 'faceDown'): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'playing') return false;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== playerId) return false;

        let cardList: Card[];

        // Validate Source Priority
        if (source === 'hand') {
            cardList = currentPlayer.hand;
        } else if (source === 'faceUp') {
            if (currentPlayer.hand.length > 0) return false; // Must empty hand first
            cardList = currentPlayer.faceUpCards;
        } else if (source === 'faceDown') {
            if (currentPlayer.hand.length > 0 || currentPlayer.faceUpCards.length > 0) return false; // Must empty visible first
            cardList = currentPlayer.faceDownCards;
        } else {
            return false;
        }

        // Validate Indices
        if (cardIndices.some(idx => idx < 0 || idx >= cardList.length)) return false;
        if (cardIndices.length === 0) return false;

        // Get Cards (Peak)
        const cardsToPlay = cardIndices.map(idx => cardList[idx]);
        const firstCard = cardsToPlay[0];

        // 1. All cards must be same rank
        if (!cardsToPlay.every(c => c.rank === firstCard.rank)) return false;

        let isValid = false;
        let isBomb = false;

        // Use cardToBeat if set (after Joker in 2-player), otherwise use top of discard pile
        // IMPORTANT: cardToBeat === null means "no restriction" (Joker played on empty pile)
        // cardToBeat === undefined means "not set, use normal rules"
        let effectiveTopCard: Card | null = null;
        const cardToBeatIsExplicitlyNull = game.cardToBeat === null && 'cardToBeat' in game;

        if (game.cardToBeat) {
            // cardToBeat has a card value - use it
            effectiveTopCard = game.cardToBeat;
            console.log(`[PlayCard] Using cardToBeat: ${effectiveTopCard.rank}${effectiveTopCard.suit}`);
        } else if (cardToBeatIsExplicitlyNull) {
            // cardToBeat is explicitly null (Joker on empty pile) - no restriction
            effectiveTopCard = null;
            console.log(`[PlayCard] cardToBeat is null - no restriction (Joker on empty pile)`);
        } else if (game.discardPile.length > 0) {
            // Normal case - use top of discard pile
            effectiveTopCard = game.discardPile[game.discardPile.length - 1];
        }

        // Bomb Logic: 4 cards of same rank
        if (cardsToPlay.length === 4) {
            isValid = true;
            isBomb = true;
        }
        // BLIND PLAY (faceDown): Always "valid" at this stage - we'll handle it specially later
        else if (source === 'faceDown') {
            // For blind play, we'll validate AFTER adding to pile
            // Mark as valid for now, actual validation happens below
            isValid = true;
        }
        // Normal Validation (Use Helper)
        else {
            isValid = this.isValidMove(firstCard, effectiveTopCard);
        }

        // For non-faceDown sources, reject invalid plays
        if (!isValid && source !== 'faceDown') return false;

        // --- BLIND PLAY VALIDATION (faceDown only) ---
        // For faceDown, check if the card would be valid. If not, we still play it but then take pile.
        let blindPlayInvalid = false;
        if (source === 'faceDown') {
            // Check if the revealed card is actually valid
            let actuallyValid = this.isValidMove(firstCard, effectiveTopCard);
            if (!actuallyValid) {
                blindPlayInvalid = true;
            }
        }

        // --- END GAME PENALTY CHECK ---
        // Rule: Cannot play Special Card as LAST card. If done, play it but then pick up pile.
        // Condition: Source is Hand (implied by logic usually, but strictly: if playing last cards from hand and deck empty)
        // Wait, "Deck sudah habis".
        let triggerEndGamePenalty = false;
        const isPlayingLastCards = source === 'hand' && currentPlayer.hand.length === cardIndices.length;
        const isDeckEmpty = game.deck.length === 0;

        if (isPlayingLastCards && isDeckEmpty && isSpecialCard(firstCard.rank)) {
            // Exception: 2 Face Up and 2 Face Down are safe. But the rule says "Logic ... tidak berlaku untuk ... kartu terbuka/tertutup, selama kartu tidak berada di tangan".
            // So this ONLY applies to Hand.
            console.log(`[GameManager] End Game Penalty Triggered for ${currentPlayer.name} (creating pile pickup)`);
            triggerEndGamePenalty = true;
        }

        // --- EXECUTE PLAY ---
        // Remove cards. Sort indices desc to remove from end first
        const sortedIndices = [...cardIndices].sort((a, b) => b - a);
        for (const idx of sortedIndices) {
            cardList.splice(idx, 1);
        }
        game.discardPile.push(...cardsToPlay);
        game.message = `${currentPlayer.name} played ${cardsToPlay.length}x ${firstCard.rank}`;

        // Reset cardToBeat since player successfully played (will be set again if this is a Joker)
        // Use undefined (not null) so next player uses normal validation against discard pile
        game.cardToBeat = undefined;

        // --- REFILL HAND ---
        // Rule: Must maintain min 2 cards if deck available
        if (source === 'hand' && game.deck.length > 0) {
            while (currentPlayer.hand.length < 2 && game.deck.length > 0) {
                const newCard = game.deck.pop();
                if (newCard) currentPlayer.hand.push(newCard);
            }
        }

        // --- SPECIAL EFFECTS ---
        let skipTurnAdvance = false;

        // --- BLIND PLAY PENALTY ---
        // If faceDown card was invalid, player takes the pile (including the just-played card)
        if (blindPlayInvalid) {
            game.message = `${currentPlayer.name} revealed ${firstCard.rank}${firstCard.suit} - Invalid! Taking pile...`;
            console.log(`[GameManager] Blind play invalid! ${currentPlayer.name} must take pile.`);
            this.takePile(roomId, playerId); // This advances turn inside
            return true;
        }

        if (triggerEndGamePenalty) {
            this.takePile(roomId, playerId); // This advances turn inside
            game.message += ' (Final Special Penalty!)';
            return true;
        }

        if (isBomb) {
            game.discardPile = [];
            game.message += ' (BOMB!)';
            // Bomb usually burns.
        }
        else if (firstCard.rank === '2') {
            game.message += ' (Pile Reset)';
        }
        else if (firstCard.rank === '7') {
            game.message += ' (Next < 7)';
        }
        else if (firstCard.rank === '10') {
            game.discardPile = [];
            game.message += ' (Pile Burned)';
        }
        else if (firstCard.rank === 'joker' || firstCard.suit === 'joker') {
            game.direction *= -1;

            console.log(`[GameManager] Joker played! Players: ${game.players.length}, Direction: ${game.direction}`);

            // GLOBAL LOGIC: Joker always references the card BEFORE the joker sequence for comparison
            // Find the card before Joker to set as cardToBeat
            let cardBeforeJoker: Card | null = null;
            // Note: game.discardPile already has the just-played Joker.
            // We scan backwards for first non-Joker.
            for (let i = game.discardPile.length - 1; i >= 0; i--) {
                const card = game.discardPile[i];
                if (card.rank !== 'joker' && card.suit !== 'joker') {
                    cardBeforeJoker = card;
                    break;
                }
            }
            game.cardToBeat = cardBeforeJoker;
            console.log(`[GameManager] cardToBeat set to: ${cardBeforeJoker ? cardBeforeJoker.rank + cardBeforeJoker.suit : 'null (empty pile)'}`);

            // Special rule for 2-player games: Joker reverses direction AND keeps turn (skipTurnAdvance)
            if (game.players.length === 2) {
                console.log(`[GameManager] 2-player Joker! Setting skipTurnAdvance = true`);
                game.message += ' (Joker - Main Lagi!)';
                // In 2-player, reversing direction means the same player goes again
                skipTurnAdvance = true;
            } else {
                game.message += ' (Reverse)';
            }
        }

        // Check Win/Finish Condition
        if (currentPlayer.hand.length === 0 &&
            currentPlayer.faceUpCards.length === 0 &&
            currentPlayer.faceDownCards.length === 0) {

            // Check if already finished (safety)
            if (!currentPlayer.finishedRank) {
                const finishedCount = game.players.filter(p => p.finishedRank).length;
                currentPlayer.finishedRank = finishedCount + 1;
                game.message = `${currentPlayer.name} finished #${currentPlayer.finishedRank}!`;

                // If First Winner, set game.winner (for record keeping)
                if (currentPlayer.finishedRank === 1) {
                    game.winner = currentPlayer.id;
                }
            }

            // Check if Game Over (Only 1 Active Left)
            const activePlayers = game.players.filter(p => !p.finishedRank);
            if (activePlayers.length <= 1) {
                game.status = 'finished';
                // Trigger final update
                return true;
            }
            // Continue game...
        }

        // Advance turn
        console.log(`[GameManager] skipTurnAdvance: ${skipTurnAdvance}`);
        if (!skipTurnAdvance) {
            console.log(`[GameManager] Advancing turn...`);
            this.advanceTurn(game);
        } else {
            console.log(`[GameManager] Skipping turn advance - same player continues`);

            // Auto-take pile if player has no valid moves (for HUMAN players)
            // Bots already handle this in processBotTurn
            if (!currentPlayer.isBot && game.discardPile.length > 0) {
                const hasValidMove = this.playerHasValidMove(game, currentPlayer);
                if (!hasValidMove) {
                    console.log(`[GameManager] Player ${currentPlayer.name} (Continuing Turn) has no valid moves, auto-taking pile...`);
                    setTimeout(() => {
                        this.takePile(game.id, currentPlayer.id);
                    }, 1000);
                }
            }

            // If same player continues and it's a bot, trigger bot turn
            if (currentPlayer.isBot) {
                console.log(`[GameManager] Same player is bot, triggering bot turn...`);
                this.processBotTurn(game, currentPlayer.id);
            }
        }

        // Trigger update for Bot moves (async side effects)
        // If human played, return true triggers sync.
        // If Bot played (via recursive/async), we need to ensure sync.
        // Since playCard is synchronous for Human, it returns true -> index emits.
        // For Bot, it calls playCard inside setTimeout. We need to trigger listener.
        if (currentPlayer.isBot) {
            this.triggerUpdate(roomId);
        }

        return true;
    }

    takePile(roomId: string, playerId: string): boolean {
        const game = this.games.get(roomId);
        if (!game || game.status !== 'playing') return false;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.id !== playerId) return false;

        if (game.discardPile.length === 0) return false;

        currentPlayer.hand.push(...game.discardPile);
        game.discardPile = [];

        // Reset cardToBeat when taking pile
        // Use undefined so next player uses normal validation
        game.cardToBeat = undefined;

        game.message = `${currentPlayer.name} took the pile`;

        console.log(`[GameManager] ${currentPlayer.name} took pile, advancing turn...`);
        this.advanceTurn(game);
        console.log(`[GameManager] Turn advanced to player ${game.players[game.currentPlayerIndex].name}`);

        return true;
    }

    // --- BOT LOGIC ---

    addBot(roomId: string, botNumber: number = 1): boolean {
        const game = this.games.get(roomId);
        if (!game) return false;

        // Assign Seat for Bot
        const occupiedSeats = game.players.map(p => p.seatIndex);
        let seatIndex = -1;
        for (let i = 0; i < MAX_PLAYERS; i++) {
            if (!occupiedSeats.includes(i)) {
                seatIndex = i;
                break;
            }
        }

        if (seatIndex === -1) return false;

        const botId = `bot-${Date.now()}-${botNumber}`;
        const botName = botNumber === 1 ? 'Bot' : `Bot ${botNumber}`;
        const newPlayer: Player = {
            id: botId,
            name: botName,
            hand: [],
            faceUpCards: [],
            faceDownCards: [],
            isReady: true, // Bots are always ready!
            hasSwapped: true, // Bots don't swap
            isBot: true,
            seatIndex: seatIndex
        };
        game.players.push(newPlayer);
        game.players.sort((a, b) => a.seatIndex - b.seatIndex);

        return true;
    }

    private advanceTurn(game: GameState) {
        // Advance turn finding next active player
        let nextIndex = game.currentPlayerIndex;
        let attempts = 0;
        do {
            nextIndex += game.direction;
            if (nextIndex >= game.players.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = game.players.length - 1;
            attempts++;
        } while (game.players[nextIndex].finishedRank && attempts < game.players.length * 2);

        game.currentPlayerIndex = nextIndex;

        // Check if next player is Bot
        const nextPlayer = game.players[nextIndex];
        console.log(`[advanceTurn] Turn advanced to ${nextPlayer.name} (isBot: ${nextPlayer.isBot})`);

        // Auto-take pile if player has no valid moves
        try {
            if (!nextPlayer.isBot && game.discardPile.length > 0) {
                const topCard = game.discardPile[game.discardPile.length - 1];
                console.log(`[AutoTakeCheck] Checking for ${nextPlayer.name}. Pile Top: ${topCard.rank}${topCard.suit}`);

                const hasValidMove = this.playerHasValidMove(game, nextPlayer);
                console.log(`[AutoTakeCheck] hasValidMove: ${hasValidMove}`);

                if (!hasValidMove) {
                    console.log(`[GameManager] Player ${nextPlayer.name} has no valid moves, auto-taking pile...`);
                    setTimeout(() => {
                        this.takePile(game.id, nextPlayer.id);
                    }, 1000); // Small delay for UX
                    return; // Don't trigger bot turn yet
                }
            }
        } catch (err) {
            console.error(`[GameManager] Error in auto-take logic:`, err);
        }

        if (nextPlayer.isBot) {
            console.log(`[advanceTurn] Calling processBotTurn for ${nextPlayer.name}...`);
            this.processBotTurn(game, nextPlayer.id);
        } else {
            console.log(`[advanceTurn] Next player is human, waiting for their move...`);
        }
    }

    // Helper: Check if player has any valid move
    private playerHasValidMove(game: GameState, player: any): boolean {
        // Use cardToBeat if set (after Joker in 2-player), otherwise use top of discard pile
        // cardToBeat === null means "no restriction" (Joker on empty pile)
        let effectiveTopCard: Card | null = null;
        const cardToBeatIsExplicitlyNull = game.cardToBeat === null && 'cardToBeat' in game;

        if (game.cardToBeat) {
            effectiveTopCard = game.cardToBeat;
        } else if (cardToBeatIsExplicitlyNull) {
            effectiveTopCard = null; // No restriction
        } else if (game.discardPile.length > 0) {
            effectiveTopCard = game.discardPile[game.discardPile.length - 1];
        }

        if (!effectiveTopCard) return true; // Can always play if no restriction

        // Check hand
        for (const card of player.hand) {
            if (this.isValidMove(card, effectiveTopCard)) return true;
        }

        // Check face up (only if hand is empty)
        if (player.hand.length === 0) {
            for (const card of player.faceUpCards) {
                if (this.isValidMove(card, effectiveTopCard)) return true;
            }
        }

        // Face down is always playable (blind)
        if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.faceDownCards.length > 0) {
            return true;
        }

        return false;
    }

    private processBotTurn(game: GameState, botId: string) {
        // Delay to simulate thinking
        setTimeout(() => {
            try {
                const bot = game.players.find(p => p.id === botId);
                if (!bot) return;

                console.log(`[Bot] ${bot.name} is taking turn...`);

                // EXTRA SAFETY: Check if it's actually bot's turn
                if (game.players[game.currentPlayerIndex].id !== botId) {
                    console.warn(`[Bot] It is NOT my turn. Aborting.`);
                    return;
                }

                // Bot Logic:
                // 1. Find all valid cards from current source (Hand -> FaceUp -> FaceDown)
                // 2. Randomly pick one valid card to play
                // 3. If no valid cards, take pile

                // Use cardToBeat if set (after Joker in 2-player), otherwise use top of discard pile
                // cardToBeat === null means "no restriction" (Joker on empty pile)
                let effectiveTopCard: Card | null = null;
                const cardToBeatIsExplicitlyNull = game.cardToBeat === null && 'cardToBeat' in game;

                if (game.cardToBeat) {
                    effectiveTopCard = game.cardToBeat;
                    console.log(`[Bot] Using cardToBeat: ${effectiveTopCard.rank}${effectiveTopCard.suit}`);
                } else if (cardToBeatIsExplicitlyNull) {
                    effectiveTopCard = null;
                    console.log(`[Bot] cardToBeat is null - no restriction (Joker on empty pile)`);
                } else if (game.discardPile.length > 0) {
                    effectiveTopCard = game.discardPile[game.discardPile.length - 1];
                }
                console.log(`[Bot] Effective top card:`, effectiveTopCard ? `${effectiveTopCard.rank}${effectiveTopCard.suit}` : 'null (no restriction)');

                let source: 'hand' | 'faceUp' | 'faceDown' = 'hand';
                let candidateIndices: number[] = [];

                // Determine Source
                if (bot.hand.length > 0) source = 'hand';
                else if (bot.faceUpCards.length > 0) source = 'faceUp';
                else source = 'faceDown';

                console.log(`[Bot] Source: ${source}, Cards in source: ${source === 'hand' ? bot.hand.length : source === 'faceUp' ? bot.faceUpCards.length : bot.faceDownCards.length}`);

                // Find valid moves
                const cardList = source === 'hand' ? bot.hand : (source === 'faceUp' ? bot.faceUpCards : bot.faceDownCards);

                if (source === 'faceDown') {
                    // Blind play - pick random card
                    if (cardList.length > 0) {
                        const randomIndex = Math.floor(Math.random() * cardList.length);
                        candidateIndices = [randomIndex];
                        console.log(`[Bot] Blind play - selected index ${randomIndex}`);
                    }
                } else {
                    // Find ALL valid cards
                    const validIndices: number[] = [];
                    const specialIndices: number[] = [];
                    const normalIndices: number[] = [];

                    for (let i = 0; i < cardList.length; i++) {
                        const card = cardList[i];
                        const isValid = this.isValidMove(card, effectiveTopCard);
                        // console.log(`[Bot] Checking card ${i}: ${card.rank}${card.suit} - Valid: ${isValid}`);
                        if (isValid) {
                            validIndices.push(i);
                            if (isSpecialCard(card.rank)) {
                                specialIndices.push(i);
                            } else {
                                normalIndices.push(i);
                            }
                        }
                    }

                    // console.log(`[Bot] Valid indices: [${validIndices.join(', ')}]`);
                    // console.log(`[Bot] Special indices: [${specialIndices.join(', ')}]`);

                    // Prioritize Special Cards (User Request)
                    if (specialIndices.length > 0) {
                        // Pick a random special card
                        const randomChoice = specialIndices[Math.floor(Math.random() * specialIndices.length)];
                        candidateIndices = [randomChoice];
                        console.log(`[Bot] Prioritizing Special Card at count ${candidateIndices.length}`);
                    }
                    else if (normalIndices.length > 0) {
                        // Pick a random normal card
                        const randomChoice = normalIndices[Math.floor(Math.random() * normalIndices.length)];
                        candidateIndices = [randomChoice];
                        console.log(`[Bot] Selecting Normal Card at count ${candidateIndices.length}`);
                    }
                }

                if (candidateIndices.length > 0) {
                    // Try Play
                    console.log(`[Bot] Attempting to play card at index ${candidateIndices[0]} from ${source}`);
                    const success = this.playCard(game.id, bot.id, candidateIndices, source);
                    console.log(`[Bot] Play result: ${success ? 'SUCCESS' : 'FAILED'}`);

                    // CRITICAL FIX: If play fails (for ANY reason), fallback to taking pile immediately
                    // This prevents bot from freezing if logic says valid but playCard rejects it
                    if (!success) {
                        console.log(`[Bot] Play failed despite valid check. Fallback: Taking Pile.`);
                        if (game.discardPile.length > 0) {
                            this.takePile(game.id, bot.id);
                        } else {
                            // Very rare edge case: Failed to play on empty pile? 
                            console.error(`[Bot] STUCK: Failed to play logic on empty pile. Forcing Advance.`);
                            this.advanceTurn(game);
                        }
                    }
                } else {
                    // No valid move -> Take Pile
                    console.log(`[Bot] No valid cards found`);
                    if (game.discardPile.length > 0) {
                        console.log(`[Bot] Taking pile (${game.discardPile.length} cards)`);
                        this.takePile(game.id, bot.id);
                    } else {
                        console.log(`[Bot] No valid move and pile is empty for bot ${bot.name}`);
                        // Force Advance if totally stuck (no moves, empty pile, shouldn't happen but valid safeguard)
                        this.advanceTurn(game);
                    }
                }

                // After Action, trigger update via callback
                this.triggerUpdate(game.id);

            } catch (err) {
                console.error(`[Bot] CRASH in turn logic:`, err);
                // Safety net: Try to advance turn to unblock game
                try {
                    this.advanceTurn(game);
                    this.triggerUpdate(game.id);
                } catch (e) {
                    console.error(`[Bot] Failed safety net advance:`, e);
                }
            }
        }, 1500);
    }

    // Switch Seat (Only in prepping)
    switchSeat(roomId: string, playerId: string, targetSeatIndex: number): boolean {
        const game = this.games.get(roomId);
        if (!game) return false;

        if (game.status !== 'waiting' && game.status !== 'preparing') return false;

        // Target valid?
        if (targetSeatIndex < 0 || targetSeatIndex >= MAX_PLAYERS) return false;

        // Target empty?
        const isOccupied = game.players.some(p => p.seatIndex === targetSeatIndex);
        if (isOccupied) return false;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return false;

        // Perform Switch
        player.seatIndex = targetSeatIndex;

        // Resort
        game.players.sort((a, b) => a.seatIndex - b.seatIndex);

        this.triggerUpdate(roomId);
        return true;
    }

    // Add Listener Support
    public onGameUpdate: ((roomId: string) => void) | null = null;

    public triggerUpdate(roomId: string) {
        const game = this.games.get(roomId);
        if (game) {
            // Push current message to logs if different from last log
            if (game.message && (game.logs.length === 0 || game.logs[game.logs.length - 1] !== game.message)) {
                // Check if message is meaningful (not just "Waiting...")
                if (!game.message.startsWith('Waiting')) {
                    game.logs.push(game.message);
                    console.log(`[GameManager][${roomId}] Logged: ${game.message}`);
                    // Keep last 50 logs
                    if (game.logs.length > 50) game.logs.shift();
                }
            }
            game.version++;
        }

        if (this.onGameUpdate) this.onGameUpdate(roomId);
    }

    // Helper validation (extracted)
    private isValidMove(card: Card, topCard: Card | null): boolean {
        if (!topCard) return true;

        // Special cards (2, 7, 10, Joker) can be played on anything (ANYTIME per user request)
        if (isSpecialCard(card.rank)) return true;

        // Joker on Discard Pile = RESET (Next player can play anything)
        if (topCard.rank === 'joker') return true;

        // Card 2 on Discard Pile = RESET (Next player can play anything)
        if (topCard.rank === '2') return true;

        // Check card 7 rule (Only applies if played card is NOT special)
        // When top card is 7, next player must play card < 7
        if (topCard.rank === '7') {
            return getCardValue(card.rank) < 7;
        }

        // Normal rule: play equal or higher
        return getCardValue(card.rank) >= getCardValue(topCard.rank);
    }
}
