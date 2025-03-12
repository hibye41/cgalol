import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ChatContainer from '../components/ChatContainer';
import { useTwitchChat } from '../hooks/useTwitchChat';
import PixelTrail from '../fancy/components/background/pixel-trail';
import PixelateSvgFilter from '../fancy/components/filter/pixelate-svg-filter';
import { useMousePosition } from '../hooks/use-mouse-position';
import Typewriter from '../fancy/components/text/typewriter';

// Game phases
enum GamePhase {
  WAITING = 'waiting',
  GATHERING = 'gathering',
  GUESSING = 'guessing',
  RESULTS = 'results'
}

// Game settings
interface GameSettings {
  gatheringDuration: number; // in seconds
  guessingDuration: number; // in seconds
  maxMessages: number;
}

const GamePage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);
  const pixelSize = Math.min(Math.max(mousePosition.x / 30, 1), 24);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.WAITING);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    gatheringDuration: 60,
    guessingDuration: 30,
    maxMessages: 10
  });
  
  // Get client ID from environment variables
  const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID || '';
  // Use the exact redirect URI registered in Twitch dashboard
  const redirectUri = 'http://localhost:5174/';
  
  // Use the Twitch chat hook
  const { 
    messages, 
    isConnected, 
    isAuthenticated, 
    error, 
    login, 
    logout 
  } = useTwitchChat({ 
    clientId, 
    redirectUri 
  });

  // Timer effect for game phases
  useEffect(() => {
    let timer: number | null = null;
    
    if (gamePhase === GamePhase.GATHERING || gamePhase === GamePhase.GUESSING) {
      const duration = gamePhase === GamePhase.GATHERING 
        ? gameSettings.gatheringDuration 
        : gameSettings.guessingDuration;
      
      setTimeRemaining(duration);
      
      timer = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer!);
            
            // Move to the next phase
            if (gamePhase === GamePhase.GATHERING) {
              setGamePhase(GamePhase.GUESSING);
            } else if (gamePhase === GamePhase.GUESSING) {
              setGamePhase(GamePhase.RESULTS);
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [gamePhase, gameSettings]);

  // Start the game
  const startGame = () => {
    if (isAuthenticated && isConnected) {
      setGamePhase(GamePhase.GATHERING);
    } else {
      login();
    }
  };

  // Reset the game
  const resetGame = () => {
    setGamePhase(GamePhase.WAITING);
  };

  // Render the current game phase
  const renderGamePhase = () => {
    switch (gamePhase) {
      case GamePhase.WAITING:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="font-VT323 text-3xl sm:text-4xl md:text-6xl uppercase mb-8">
              Chat or Chatbot?
            </h2>
            <p className="text-xl mb-8">
              A game for Twitch streamers to test if they can tell the difference between real chat messages and AI-generated ones.
            </p>
            <button 
              onClick={startGame}
              className="bg-white text-black z-100 px-6 py-3 text-xl font-mono hover:bg-gray-200 transition-colors"
            >
              {isAuthenticated ? 'Start Game' : 'Login with Twitch'}
            </button>
            {error && (
              <p className="text-red-500 mt-4">{error}</p>
            )}
          </div>
        );
        
      case GamePhase.GATHERING:
        return (
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-white">
              <h2 className="font-VT323 text-2xl sm:text-3xl uppercase">
                Gathering Phase: {timeRemaining}s
              </h2>
              <p className="text-sm sm:text-base">
                Allow chatters to submit messages to trick you. Collect as many real messages as possible.
              </p>
            </div>
            <div className="flex-grow overflow-hidden">
              <ChatContainer messages={messages} maxMessages={gameSettings.maxMessages} />
            </div>
          </div>
        );
        
      case GamePhase.GUESSING:
        return (
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-white">
              <h2 className="font-VT323 text-2xl sm:text-3xl uppercase">
                Guessing Phase: {timeRemaining}s
              </h2>
              <p className="text-sm sm:text-base">
                Guess if each message is from a real chatter or an AI chatbot.
              </p>
            </div>
            <div className="flex-grow overflow-hidden">
              <ChatContainer messages={messages} maxMessages={gameSettings.maxMessages} />
            </div>
          </div>
        );
        
      case GamePhase.RESULTS:
        return (
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-white">
              <h2 className="font-VT323 text-2xl sm:text-3xl uppercase">
                Results
              </h2>
              <p className="text-sm sm:text-base">
                See how well you did at identifying real chat messages vs AI-generated ones.
              </p>
            </div>
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl mb-4">Game Complete!</p>
                <button 
                  onClick={resetGame}
                  className="bg-white text-black px-6 py-3 text-xl font-mono hover:bg-gray-200 transition-colors"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="w-full h-screen bg-black text-white flex flex-col overscroll-y-none"
      ref={containerRef}
    >
      <PixelateSvgFilter id="pixelate-filter" size={pixelSize} />

      <div className="max-h-5/6 min-h-5/6 flex flex-col w-full h-full font-mono relative">
        <PixelTrail
          pixelSize={115}
          fadeDuration={380}
          pixelClassName="bg-white"
        />
        
        {renderGamePhase()}
      </div>

      <div className="sticky z-0 bottom-0 left-0 w-full h-80 bg-white flex justify-center items-center font-mono">
        <div className="relative overflow-hidden w-full h-full flex justify-end px-12 text-right items-start py-12 text-black">
          <PixelTrail
            pixelSize={25}
            fadeDuration={380}
            pixelClassName="bg-black"
          />
          <div className="flex flex-row space-x-12 sm:pace-x-16 md:space-x-24 text-sm sm:text-lg md:text-xl text-green-500">
            <div className="absolute inset-0 pointer-events-none"></div>
            <ul className="relative z-10">
              <li>
                {isAuthenticated ? (
                  <a onClick={logout} className="hover:underline cursor-pointer block">
                    Logout
                  </a>
                ) : (
                  <a onClick={login} className="hover:underline cursor-pointer block">
                    Log In with Twitch
                  </a>
                )}
              </li>
              <li>
                <Link to="/" className="hover:underline cursor-pointer block">
                  Home
                </Link>
              </li>
              <li>
                <a href="#" className="hover:underline cursor-pointer block">
                  Settings
                </a>
              </li>
            </ul>
            <ul className="relative z-10">
              <li>
                <a href="#" className="hover:underline cursor-pointer block">
                  How to Play
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline cursor-pointer block">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline cursor-pointer block">
                  Credits
                </a>
              </li>
            </ul>
          </div>
          <h2 className="absolute font-mono bottom-0 left-0 translate-y-1/5 sm:text-[192px] -z-10 text-[80px] text-[#41980a] ">
            aga.lol
          </h2>
        </div>
      </div>
    </div>
  );
};

export default GamePage; 