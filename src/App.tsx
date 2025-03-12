import { useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PixelTrail from './fancy/components/background/pixel-trail'
import PixelateSvgFilter from './fancy/components/filter/pixelate-svg-filter'
import { useMousePosition } from './hooks/use-mouse-position'

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useMousePosition(containerRef);
  const pixelSize = Math.min(Math.max(mousePosition.x / 30, 1), 24);

  return (
		<div
			className="w-full h-screen bg-black text-white flex flex-col overscroll-y-none"
			ref={containerRef}
		>
			<PixelateSvgFilter id="pixelate-filter" size={pixelSize} />

			<div className="justify-center items-center flex flex-col w-full h-full font-mono gap-5 relative">
				<PixelTrail
					pixelSize={115}
					fadeDuration={380}
					pixelClassName="bg-white"
				/>
				<div
					id="image-container"
					className="w-1/2 md:w-1/3 h-1/2 overflow-hidden relative text-white"
					style={{ filter: "url(#pixelate-filter)" }}
				>
					<video
						src={
							"https://videos.pexels.com/video-files/4925965/4925965-uhd_2732_1440_30fps.mp4"
						}
						className="w-full h-full object-cover absolute inset-0"
						autoPlay
						muted
						playsInline
						loop
					/>
				</div>

				<h2 className="font-VT323 text-3xl sm:text-4xl md:text-6xl uppercase">
					chat or chatbot?
				</h2>
				<p className="pt-0.5 sm:pt-2 text-xs sm:text-base md:text-xl">
					A game for Twitch streamers.
				</p>
			</div>

			<div className="sticky z-0 bottom-0 left-0 w-full h-80 bg-white flex justify-center items-center font-mono">
				<div className="relative overflow-hidden w-full h-full flex justify-end px-12 text-right items-start py-12 text-black">
					<PixelTrail
						pixelSize={25}
						fadeDuration={380}
						pixelClassName="bg-black"
					/>
					<div className="flex flex-row space-x-12 sm:pace-x-16 md:space-x-24 text-sm sm:text-lg md:text-xl text-[#41980a]">
						<div className="absolute inset-0 pointer-events-none"></div>
						<ul className="relative z-10">
							<li>
								<a href="#" className="hover:underline cursor-pointer block">
									Log In with Twitch
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline cursor-pointer block">
									How to Play
								</a>
							</li>
							<li>
								<a href="#" className="hover:underline cursor-pointer block">
									aga
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
									aga
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
}

export default App
