"use client";

import { useEffect, useRef, useState } from 'react';
import { Game } from '../../game/gameState';
import { KeyState, InputState } from '../../game/engine/input';
import '../../globals.css';
import './arcade.css';

// Use a more reasonable base resolution that will scale better
const BASE_WIDTH = 800; // Base width that will be scaled
const BASE_HEIGHT = 600; // Base height that will be scaled
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

export default function ValaxyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const [isSoundMuted, setIsSoundMuted] = useState(false); // Sound is unmuted by default to match SoundEngine
  const [volume, setVolume] = useState(-10); // Default volume in decibels
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(false); // Sound effects disabled by default
  // Note: Mobile support has been removed
  // Handle window resize to maintain aspect ratio
  const updateDimensions = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let width, height;
    
    // Maintain the original aspect ratio
    if (containerWidth / containerHeight > ASPECT_RATIO) {
      // Container is wider than needed
      height = containerHeight;
      width = height * ASPECT_RATIO;
    } else {
      // Container is taller than needed
      width = containerWidth;
      height = width / ASPECT_RATIO;
    }
    
    setDimensions({ width, height });
  };
  
  // Initialize game when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    // Initial dimension update
    updateDimensions();
    
    // Create game instance with base dimensions
    // Pass the actual dimensions to ensure proper scaling
    gameRef.current = new Game(canvas, BASE_WIDTH, BASE_HEIGHT);
    
    // Set the renderer to maintain aspect ratio
    if (gameRef.current) {
      // Update the game's internal renderer to match our responsive dimensions
      gameRef.current.updateRendererDimensions(dimensions.width, dimensions.height, ASPECT_RATIO);
    }
    
    // Set up resize handler
    const handleResize = () => {
      updateDimensions();
      
      // Update game renderer dimensions when screen size changes
      if (gameRef.current) {
        gameRef.current.updateRendererDimensions(dimensions.width, dimensions.height, ASPECT_RATIO);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Clean up game resources when component unmounts
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, []);
  
  // Initialize game on user interaction
  const handleInitGame = async () => {
    if (!gameRef.current || isInitialized) return;
    
    try {
      // Try to directly start Tone.js in response to user gesture
      try {
        // Import Tone dynamically to avoid server-side rendering issues
        const Tone = await import('tone');
        await Tone.start();
        console.log("Tone started directly from user gesture in init");
        await Tone.context.resume();
        console.log("Audio context resumed directly from user gesture in init");
      } catch (toneError) {
        console.error("Error starting Tone.js directly in init:", toneError);
      }
      
      await gameRef.current.init();
      setIsInitialized(true);
      
      // Sync sound mute state with game state
      const muteState = gameRef.current.isSoundMuted();
      setIsSoundMuted(muteState);
      console.log("Initial sound mute state:", muteState);
    } catch (error) {
      console.error("Failed to initialize game:", error);
    }
  };
  
  // Add space key listener for game start
  useEffect(() => {
    if (isInitialized) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInitialized && gameRef.current) {
        handleInitGame();
      }
    };
    
    // Also handle click for desktop
    const handleClick = () => {
      if (!isInitialized && gameRef.current) {
        handleInitGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [isInitialized]);
  
  // Add a direct event listener to start AudioContext on any user interaction
  useEffect(() => {
    const startAudioContext = async () => {
      try {
        const Tone = await import('tone');
        await Tone.start();
        console.log("Tone started from global interaction handler");
        await Tone.context.resume();
        console.log("Audio context resumed from global interaction handler");
      } catch (error) {
        console.error("Error starting AudioContext from global handler:", error);
      }
    };
    
    const handleInteraction = () => {
      startAudioContext();
    };
    
    // Add listeners for common user interactions
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);
  
  // Handle sound toggle
  const toggleSound = async () => {
    if (gameRef.current) {
      try {
        // Try to directly start Tone.js in response to user gesture
        try {
          // Import Tone dynamically to avoid server-side rendering issues
          const Tone = await import('tone');
          await Tone.start();
          console.log("Tone started directly from user gesture");
          await Tone.context.resume();
          console.log("Audio context resumed directly from user gesture");
        } catch (toneError) {
          console.error("Error starting Tone.js directly:", toneError);
        }
        
        // Toggle sound state
        const newMuteState = await gameRef.current.toggleSound();
        setIsSoundMuted(newMuteState);
        console.log("Sound mute state toggled:", newMuteState);
      } catch (error) {
        console.error("Failed to toggle sound:", error);
      }
    }
  };
  
  // Handle sound effects toggle
  const toggleSoundEffects = () => {
    if (gameRef.current) {
      try {
        // Toggle sound effects state
        const newState = gameRef.current.toggleSoundEffects();
        setSoundEffectsEnabled(newState);
        console.log("Sound effects toggled:", newState);
      } catch (error) {
        console.error("Failed to toggle sound effects:", error);
      }
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameRef.current) {
      try {
        // Convert slider value (0-100) to decibels (-60 to 0)
        const volumeValue = parseInt(e.target.value);
        const volumeDb = -60 + (volumeValue / 100) * 60;
        
        // Update volume in game
        gameRef.current.setVolume(volumeDb);
        setVolume(volumeDb);
        console.log("Volume changed to:", volumeDb, "dB");
        
        // Try to directly start Tone.js in response to user gesture
        (async () => {
          try {
            const Tone = await import('tone');
            await Tone.start();
            await Tone.context.resume();
            console.log("Audio context resumed from volume change");
          } catch (error) {
            console.error("Error resuming audio context from volume change:", error);
          }
        })();
      } catch (error) {
        console.error("Failed to change volume:", error);
      }
    }
  };
  
  // Mobile support has been removed
  
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {!isInitialized && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 title-screen-slide px-4"
        >
          <div className="text-red-700 text-5xl sm:text-7xl md:text-9xl font-extrabold mb-6 md:mb-10 vampire-glow text-center">VALAXY</div>
          <div
            className="text-white text-xl sm:text-3xl md:text-5xl mt-4 md:mt-8 arcade-button py-3 px-6 md:py-5 md:px-16 hover:bg-red-900 cursor-pointer"
            onClick={handleInitGame}
          >
            PRESS SPACE TO PLAY
          </div>
          <div className="mt-8 md:mt-16 text-gray-200 text-sm sm:text-xl md:text-2xl pixel-text text-center">© 2025 WEST COAST AI LABS</div>
          <div className="mt-2 md:mt-4 text-red-600 text-xs sm:text-sm md:text-md pixel-text text-center">LICENSED BY WEST COAST AI LABS</div>
          <div className="mt-6 text-yellow-500 text-xs sm:text-sm md:text-lg pixel-text text-center p-2 border border-yellow-500 rounded-md bg-black bg-opacity-70">
            ⚠️ MOBILE SUPPORT DISCONTINUED ⚠️<br/>
            THIS GAME IS OPTIMIZED FOR DESKTOP ONLY
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center">
        {/* CRT screen effect overlay - simplified for better performance */}
        <div className="fixed inset-0 pointer-events-none crt-overlay"></div>
        
        {/* Game canvas - Responsive with maintained aspect ratio */}
        <canvas
          ref={canvasRef}
          width={BASE_WIDTH}
          height={BASE_HEIGHT}
          className="block bg-black"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            maxWidth: '100%',
            maxHeight: '100vh',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            zIndex: 10, // Ensure canvas is above background but below controls
            touchAction: 'none' // Prevent default touch actions
          }}
        />
        
        {/* Sound controls - positioned in top-right corner */}
        {isInitialized && (
          <div className="fixed top-4 right-4 z-30 flex flex-col items-end">
            {/* Sound toggle button */}
            <button
              onClick={toggleSound}
              className="arcade-button py-1 px-3 text-white text-xs flex items-center mb-2"
            >
              {isSoundMuted ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  SOUND OFF
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  SOUND ON
                </>
              )}
            </button>
            
            {/* Sound effects toggle button */}
            {!isSoundMuted && (
              <button
                onClick={toggleSoundEffects}
                className="arcade-button py-1 px-3 text-white text-xs flex items-center mb-2"
              >
                {soundEffectsEnabled ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                    </svg>
                    SFX ON
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                      <path d="M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    SFX OFF
                  </>
                )}
              </button>
            )}
            
            {/* Volume slider - only show when sound is on */}
            {!isSoundMuted && (
              <div className="bg-black bg-opacity-50 p-1 rounded border border-red-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(((volume + 60) / 60) * 100)}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-red-900 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: '#FF0033',
                  }}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Mobile controls have been removed */}
    </div>
  );
}