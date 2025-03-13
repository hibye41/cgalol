import React from 'react';
import PixelTrail from '../fancy/components/background/pixel-trail';

const BaseContent: React.FC = () => {
  return (
    <>
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
          preload="auto"
          onError={(e) => console.error("Video error:", e)}
        />
      </div>

      <h2 className="font-VT323 text-3xl sm:text-4xl md:text-6xl uppercase">
        chat or chatbot?
      </h2>
      <p className="pt-0.5 sm:pt-2 text-xs sm:text-base md:text-xl">
        A game for Twitch streamers.
      </p>
    </>
  );
};

export default BaseContent; 