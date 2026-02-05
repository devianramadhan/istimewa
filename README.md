# Istimewa - Online Card Game

A real-time multiplayer card game built with React, TypeScript, and Socket.IO.

## Features

- 🎮 Real-time multiplayer gameplay
- 🤖 Play against AI bots
- 🎴 Full card game mechanics including special cards (2, 7, 10, Joker)
- 🔄 Card swapping in preparation phase
- 🎯 Drag and drop card playing
- 👀 View discard pile with animated card viewer
- 📱 Responsive UI with smooth animations

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- Socket.IO Client

### Backend
- Node.js
- TypeScript
- Express
- Socket.IO

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/devianramadhan/istimewa.git
cd istimewa
```

2. Install dependencies for both client and server

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

1. Start the server
```bash
cd server
npm run dev
```

2. Start the client (in a new terminal)
```bash
cd client
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Game Rules

### Setup
- 2-8 players supported
- Each player receives 3 face-down cards, 3 face-up cards, and 2 hand cards
- Players can swap hand cards with face-up cards during preparation phase

### Gameplay
- Play cards equal to or higher than the top discard pile card
- Special cards:
  - **2**: Reset pile (can be played on any card)
  - **7**: Next player must play a card lower than 7
  - **10**: Burns the pile
  - **Joker**: Reverses direction (in 2-player games, same player goes again)
  - **4 of a kind**: Bomb - clears the pile

### Winning
- First player to play all their cards wins!

## Project Structure

```
istimewa/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
├── server/          # Node.js backend
│   ├── src/
│   │   ├── game/
│   │   └── index.ts
│   └── package.json
└── README.md
```

## License

MIT
