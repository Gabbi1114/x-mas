
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '../store';
import { MUSIC_PLAYLIST } from '../types';

const IntroOverlay: React.FC = () => {
  const introFinished = useStore((state) => state.introFinished);
  const setIntroFinished = useStore((state) => state.setIntroFinished);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    // Intro Animation Sequence
    const tl = gsap.timeline({
        onComplete: () => {
             // Keep text visible until interaction? Or fade out?
             // Prompt user to interact
        }
    });

    tl.fromTo("#intro-text", 
      { opacity: 0, scale: 0.8, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 2, ease: "power3.out" }
    )
    .to("#intro-sub", { opacity: 1, duration: 1.5 }, "-=1");

    // Auto-dismiss after 6 seconds
    const timer = setTimeout(() => {
        handleStart();
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
      setIntroFinished(true);
      if (audioRef.current) {
          audioRef.current.volume = 0.4;
          audioRef.current.play().catch(e => console.log("Autoplay blocked, waiting for interaction"));
      }
  };

  return (
    <>
      <audio ref={audioRef} src={MUSIC_PLAYLIST[0]} loop />
      
      {/* Main Intro Screen */}
      <div 
        className={`fixed inset-0 z-40 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 pointer-events-none
        ${introFinished ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="text-center px-4">
          <h1 id="intro-text" className="font-serif-display text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 mb-6 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] opacity-0">
            56 Moments байгууллагад<br/>
            <span className="text-white text-2xl md:text-4xl mt-4 block font-light tracking-widest font-cinzel">
              2026 ОНЫ ШИНЭ ЖИЛИЙН МЭНД ХҮРГЭЕ!
            </span>
          </h1>
          <p id="intro-sub" className="text-blue-200 mt-8 font-light tracking-[0.3em] opacity-0 animate-pulse">
            LOADING THE COSMIC GREETING...
          </p>
        </div>
      </div>

      {/* HUD - Minimal */}
      <div className={`fixed inset-0 z-30 pointer-events-none transition-opacity duration-1000 ${introFinished ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top Header */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-start">
             <div className="text-white/80 font-cinzel tracking-widest text-xs md:text-sm">
                 56 MOMENTS // YEAR 2026
             </div>
        </div>
      </div>
    </>
  );
};

export default IntroOverlay;

