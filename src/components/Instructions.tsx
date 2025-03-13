import React from 'react';
import Typewriter from '../fancy/components/text/typewriter';

const Instructions: React.FC = () => {
  return (
		<div className="w-dvw h-dvh md:text-4xl lg:text-5xl sm:text-3xl text-2xl flex flex-row items-start justify-start bg-black text-foreground dark:text-muted font-normal overflow-hidden p-16 pt-48">
			<p className="whitespace-pre-wrap">
				{/* <span>{"We're born 🌞 to "}</span> */}
				<Typewriter
					text={[
						"> chat or chatbot?\n" +
							" - we grab messages from your chat at random\n" +
							" - you get shown one of those real messages,\n" +
							" - or a chatbot message.......🤖\n" +
							" - can you tell the difference?\n" +
							"> chatters \n" +
							" - trick your streamer\n" +
							"> safety\n" +
							" - this is purely a browser app, we have no server\n" +
              " - we do not store anything\n" +
							"> also there's a blackjack",
					]}
					speed={50}
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