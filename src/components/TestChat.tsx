import React from 'react';
import { useTwitchAuth } from '../hooks/use-twitch-auth';
import FilteredChat from './FilteredChat';

const TestChat: React.FC = () => {
  const { isAuthenticated, user } = useTwitchAuth();

  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl mb-4">Please log in with Twitch to view your chat</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-xl mb-2 text-center">Chat for {user?.display_name}</h2>
      <FilteredChat />
    </div>
  );
};

export default TestChat; 