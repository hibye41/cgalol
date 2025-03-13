import React from 'react';
import Typewriter from '../fancy/components/text/typewriter';

const Instructions: React.FC = () => {
  return (
    <div className="w-dvw h-dvh md:text-4xl lg:text-5xl sm:text-3xl text-2xl flex flex-row items-start justify-start bg-black text-foreground dark:text-muted font-normal overflow-hidden p-16 pt-48">
      <p className="whitespace-pre-wrap">
        {/* <span>{"We're born 🌞 to "}</span> */}
        <Typewriter
          text={[
            "> gathering phase\n" +
            " - allow chatters to submit messages to trick you\n" +
            " - gamble for lives in blackjack while you wait\n" +
            "> guessing phase\n" +
            " - guess if a message is from a chatter or a chatbot\n" +
            " - if you guess wrong, you lose a life\n" +
            " - wager some subs on an honor system"
          ]}
          speed={70}
          className="text-green-500"
          waitTime={1500}
          deleteSpeed={40}
          cursorChar={"_"}
        />
      </p>
    </div>
  );
};

export default Instructions; 