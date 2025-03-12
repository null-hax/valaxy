"use client";

import { useEffect, useRef, useState } from 'react';
import { Game } from '../../game/gameState';
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
  
  // Handle window resize to maintain aspect ratio
  const updateDimensions = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let width, height;
    
    // Calculate dimensions while maintaining aspect ratio
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
    gameRef.current = new Game(canvas, BASE_WIDTH, BASE_HEIGHT);
    
    // Set up resize handler
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      // Clean up game resources when component unmounts
      window.removeEventListener('resize', updateDimensions);
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
  
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {!isInitialized && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 cursor-pointer title-screen-slide"
          onClick={handleInitGame}
        >
          <div className="text-red-700 text-9xl font-extrabold mb-10 vampire-glow">VALAXY</div>
          <div className="text-white text-5xl mt-8 arcade-button py-5 px-16 hover:bg-red-900">
            PLAY NOW
          </div>
          <div className="mt-16 text-gray-200 text-3xl pixel-text">©2025 WEST COAST AI LABS</div>
          <div className="mt-4 text-red-600 text-xl pixel-text">LICENSED BY WEST COAST AI LABS</div>
        </div>
      )}
      
      <div ref={containerRef} className="fixed inset-0 w-screen h-screen overflow-hidden">
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
            maxWidth: '100vw',
            maxHeight: '100vh',
            imageRendering: 'pixelated'
          }}
        />
        
        {/* Game controls help */}
        <div className="fixed bottom-8 left-8 text-white text-3xl z-20">
          <div>Controls: Arrow Keys or WASD to move</div>
          <div>Space or Up Arrow to fire</div>
        </div>
      </div>
      
      {/* Mobile controls overlay - will be visible on touch devices */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 h-32 flex items-center justify-between px-4">
        <div className="touch-none w-24 h-24 bg-gray-800 bg-opacity-40 rounded-full flex items-center justify-center">
          {/* D-pad direction controls here */}
        </div>
        <div className="touch-none w-24 h-24 bg-gray-800 bg-opacity-40 rounded-full flex items-center justify-center">
          {/* Fire button here */}
        </div>
      </div>
    </div>
  );
}