import './App.css'

import { useGameSocket } from './hooks/useGameSocket';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';

function App() {
  const {
    gameState,
    isConnected,
    playerId,
    error,
    actions
  } = useGameSocket();

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500/30">

      {/* Connection Status Indicator */}
      <div className={`fixed top-0 left-0 right-0 h-1 z-50 ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />

      {!isConnected && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">
          Disconnected from server
        </div>
      )}

      {error && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {gameState && playerId ? (
        <GameRoom
          gameState={gameState}
          playerId={playerId}
          onDrawCard={() => { }} // Disabled
          onPlayCard={(indices, source) => actions.playCard(gameState.id, indices, source)}
          onSwapCards={(hIndex, fIndex) => actions.swapCards(gameState.id, hIndex, fIndex)}
          onSetReady={() => actions.setReady(gameState.id)}
          onTakePile={() => actions.takePile(gameState.id)}
          actions={actions}
        />
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="flex items-center gap-4 mb-4 animate-bounce">
            <div className="bg-white p-2 rounded-lg shadow-lg rotate-[-10deg]">
              <span className="text-4xl text-black">♠️</span>
            </div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tighter">
              Istimewsss
            </h1>
          </div>
          <p className="text-slate-400 mb-12 text-lg">Main kartu bareng teman, realtime!</p>

          <div className="w-full max-w-md animate-fade-in-up">
            <Lobby
              onCreate={actions.createRoom}
              onJoin={actions.joinRoom}
              onBotGame={actions.joinBotGame}
            />
          </div>


          <div className="mt-8 text-slate-600 text-xs">
            Powered By Orang Bekasi
          </div>
        </div>
      )}
    </div>
  );
}

export default App
