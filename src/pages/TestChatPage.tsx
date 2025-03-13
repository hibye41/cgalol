import React from 'react';
import TestChat from '../components/TestChat';

const TestChatPage: React.FC = () => {
  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <TestChat />
      </div>
      <div className="p-4 text-center">
        <a href="/" className="text-green-500 hover:underline">
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default TestChatPage; 