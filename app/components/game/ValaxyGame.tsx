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
  const leftButtonRef = useRef<HTMLDivElement>(null);
  const rightButtonRef = useRef<HTMLDivElement>(null);
  const fireButtonRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const [isMobile, setIsMobile] = useState(false);
  
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
    
    // Check if we're on a mobile device
    setIsMobile(window.innerWidth < 768);
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
      
      // Set up mobile controls after game is initialized
      setupMobileControls();
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
    
    // Also handle touch/click for mobile
    const handleTouch = () => {
      if (!isInitialized && gameRef.current) {
        handleInitGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('click', handleTouch);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('click', handleTouch);
    };
  }, [isInitialized]);
  
  // Set up mobile control event handlers
  const setupMobileControls = () => {
    if (!gameRef.current) return;
    
    const leftButton = leftButtonRef.current;
    const rightButton = rightButtonRef.current;
    const fireButton = fireButtonRef.current;
    
    if (!leftButton || !rightButton || !fireButton) return;
    
    // Helper function to add both touch and mouse events
    const addControlEvents = (element: HTMLElement, key: keyof InputState) => {
      // Touch events
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameRef.current) {
          gameRef.current.getInputHandler().setVirtualKey(key, KeyState.PRESSED);
        }
      });
      
      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (gameRef.current) {
          gameRef.current.getInputHandler().setVirtualKey(key, KeyState.RELEASED);
        }
      });
      
      // Mouse events for desktop testing
      element.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (gameRef.current) {
          gameRef.current.getInputHandler().setVirtualKey(key, KeyState.PRESSED);
        }
      });
      
      element.addEventListener('mouseup', (e) => {
        e.preventDefault();
        if (gameRef.current) {
          gameRef.current.getInputHandler().setVirtualKey(key, KeyState.RELEASED);
        }
      });
      
      // Handle mouse leaving the button while pressed
      element.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        if (gameRef.current) {
          gameRef.current.getInputHandler().setVirtualKey(key, KeyState.RELEASED);
        }
      });
    };
    
    // Add events to all control buttons
    addControlEvents(leftButton, 'left');
    addControlEvents(rightButton, 'right');
    addControlEvents(fireButton, 'fire');
  };
  
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
            {isMobile ? "TAP TO START" : "PRESS SPACE TO PLAY"}
          </div>
          <div className="mt-8 md:mt-16 text-gray-200 text-sm sm:text-xl md:text-2xl pixel-text text-center">© 2025 WEST COAST AI LABS</div>
          <div className="mt-2 md:mt-4 text-red-600 text-xs sm:text-sm md:text-md pixel-text text-center">LICENSED BY WEST COAST AI LABS</div>
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
      </div>
      
      {/* Mobile controls overlay - will be visible on touch devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 z-30 pb-4">
        <div className="flex gap-4">
          {/* Left button */}
          <div
            ref={leftButtonRef}
            className="control-button touch-none flex items-center justify-center"
            aria-label="Move Left"
          >
            <span className="pixel-text text-xl font-bold">◄</span>
          </div>
          
          {/* Right button */}
          <div
            ref={rightButtonRef}
            className="control-button touch-none flex items-center justify-center"
            aria-label="Move Right"
          >
            <span className="pixel-text text-xl font-bold">►</span>
          </div>
        </div>
        
        {/* Fire button */}
        <div
          ref={fireButtonRef}
          className="fire-button touch-none flex items-center justify-center"
          aria-label="Fire"
        >
          <span className="pixel-text text-lg font-bold">FIRE</span>
        </div>
      </div>
    </div>
  );
}