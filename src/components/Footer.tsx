import React from 'react';
import PixelTrail from '../fancy/components/background/pixel-trail';
import { useTwitchAuth } from '../hooks/use-twitch-auth';

interface FooterProps {
  showInstructions: boolean;
  setShowInstructions: (show: boolean) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showBlackjack: boolean;
  setShowBlackjack: (show: boolean) => void;
  showChatGame: boolean;
  setShowChatGame: (show: boolean) => void;
}

const Footer: React.FC<FooterProps> = ({ 
  showInstructions, 
  setShowInstructions, 
  showChat, 
  setShowChat,
  showBlackjack,
  setShowBlackjack,
  showChatGame,
  setShowChatGame
}) => {
  const { isAuthenticated, user, login } = useTwitchAuth();

  const toggleChat = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowChat(!showChat);
    if (showInstructions) {
      setShowInstructions(false);
    }
    if (showBlackjack) {
      setShowBlackjack(false);
    }
    if (showChatGame) {
      setShowChatGame(false);
    }
  };

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
    if (showChat) {
      setShowChat(false);
    }
    if (showBlackjack) {
      setShowBlackjack(false);
    }
    if (showChatGame) {
      setShowChatGame(false);
    }
  };

  const toggleBlackjack = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowBlackjack(!showBlackjack);
    if (showInstructions) {
      setShowInstructions(false);
    }
    if (showChat) {
      setShowChat(false);
    }
    if (showChatGame) {
      setShowChatGame(false);
    }
  };

  const toggleChatGame = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowChatGame(!showChatGame);
    if (showInstructions) {
      setShowInstructions(false);
    }
    if (showChat) {
      setShowChat(false);
    }
    if (showBlackjack) {
      setShowBlackjack(false);
    }
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    login();
  };

  return (
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
            {isAuthenticated ? (
              <>
                <li>
                  <a href="#" className="hover:underline cursor-pointer block" onClick={toggleBlackjack}>
                    {showBlackjack ? "(Hide) " : ""}Play Blackjack
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:underline cursor-pointer block" onClick={toggleChatGame}>
                    {showChatGame ? "(Hide) " : ""}Chat or Chatbot?
                  </a>
                </li>
              </>
            ) : (
              <li>
                <a href="#" className="hover:underline cursor-pointer block" onClick={handleLoginClick}>
                  Log In with Twitch
                </a>
              </li>
            )}
            <li>
              <a
                href="#"
                className="hover:underline cursor-pointer block"
                onClick={toggleInstructions}
              >
                {showInstructions ? "(Hide) " : ""}How to Play
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline cursor-pointer block" onClick={toggleChat}>
                {showChat ? "(Hide) " : ""}Test Chat
              </a>
            </li>
          </ul>
          <ul className="relative z-10">
            <li>
              <a href="#" className="hover:underline cursor-pointer block">
                aga
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline cursor-pointer block">
                aga
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline cursor-pointer block">
                {isAuthenticated && user ? user.display_name : "aga"}
              </a>
            </li>
          </ul>
        </div>
        <h2 className="absolute font-mono bottom-0 left-0 translate-y-1/5 sm:text-[192px] -z-10 text-[80px] text-[#41980a] ">
          aga.lol
        </h2>
      </div>
    </div>
  );
};

export default Footer; 