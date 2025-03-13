import { useRef, useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import PixelateSvgFilter from './fancy/components/filter/pixelate-svg-filter'
import { useMousePosition } from './hooks/use-mouse-position'
import BaseContent from './components/BaseContent'
import Instructions from './components/Instructions'
import TestChat from './components/TestChat'
import Footer from './components/Footer'
import Blackjack from './components/game/Blackjack'

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);
  const pixelSize = Math.min(Math.max(mousePosition.x / 30, 1), 24);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBlackjack, setShowBlackjack] = useState(false);

  return (
		<div
			className="w-full h-screen bg-black text-white flex flex-col overscroll-y-none"
			ref={containerRef}
		>
			<PixelateSvgFilter id="pixelate-filter" size={pixelSize} />

			<div className="max-h-5/6 min-h-5/6 justify-center items-center flex flex-col w-full h-full font-mono gap-5 relative">
				{showInstructions ? (
					<Instructions />
				) : showChat ? (
					<div className="w-full h-full flex justify-center items-center">
						<div className="w-3/4 h-3/4 bg-gray-900 rounded-lg overflow-hidden">
							<TestChat />
						</div>
					</div>
				) : showBlackjack ? (
					<Blackjack />
				) : (
					<BaseContent />
				)}
			</div>

			<Footer 
				showInstructions={showInstructions} 
				setShowInstructions={setShowInstructions}
				showChat={showChat}
				setShowChat={setShowChat}
				showBlackjack={showBlackjack}
				setShowBlackjack={setShowBlackjack}
			/>
		</div>
	);
}

export default App
