import { useRef, useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import PixelateSvgFilter from './fancy/components/filter/pixelate-svg-filter'
import { useMousePosition } from './hooks/use-mouse-position'
import BaseContent from './components/BaseContent'
import Instructions from './components/Instructions'
import Footer from './components/Footer'

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);
  const pixelSize = Math.min(Math.max(mousePosition.x / 30, 1), 24);
  const [showInstructions, setShowInstructions] = useState(false);

  return (
		<div
			className="w-full h-screen bg-black text-white flex flex-col overscroll-y-none"
			ref={containerRef}
		>
			<PixelateSvgFilter id="pixelate-filter" size={pixelSize} />

			<div className="max-h-5/6 min-h-5/6 justify-center items-center flex flex-col w-full h-full font-mono gap-5 relative">
				{showInstructions ? (
					<Instructions />
				) : (
					<BaseContent />
				)}
			</div>

			<Footer 
				showInstructions={showInstructions} 
				setShowInstructions={setShowInstructions} 
			/>
		</div>
	);
}

export default App
