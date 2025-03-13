"use client";

import { useEffect, useRef, useState } from 'react';
import { Game } from '../../game/gameState';
import { KeyState, InputState } from '../../game/engine/input';
import '../../globals.css';

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
      await gameRef.current.init();
      setIsInitialized(true);
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
      </div>
      {/* Mobile controls have been removed */}
    </div>
  );
}