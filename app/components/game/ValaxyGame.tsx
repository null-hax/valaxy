"use client";

import { useEffect, useRef, useState } from 'react';
import { Game } from '../../game/gameState';
import { KeyState } from '../../game/engine/input';
import '../../globals.css';

// Use a more reasonable base resolution that will scale better
const BASE_WIDTH = 800; // Base width that will be scaled
const BASE_HEIGHT = 600; // Base height that will be scaled
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

export default function ValaxyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickHandleRef = useRef<HTMLDivElement>(null);
  const fireButtonRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  
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
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isInitialized]);
  
  // Set up mobile control event handlers
  const setupMobileControls = () => {
    if (!gameRef.current) return;
    
    const joystickArea = joystickRef.current;
    const joystickHandle = joystickHandleRef.current;
    const fireButton = fireButtonRef.current;
    
    if (!joystickArea || !joystickHandle || !fireButton) return;
    
    // Joystick touch start
    joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setJoystickActive(true);
      
      const touch = e.touches[0];
      const rect = joystickArea.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      handleJoystickMove(touch.clientX - centerX, touch.clientY - centerY);
    });
    
    // Joystick touch move
    joystickArea.addEventListener('touchmove', (e) => {
      if (!joystickActive) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = joystickArea.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      handleJoystickMove(touch.clientX - centerX, touch.clientY - centerY);
    });
    
    // Joystick touch end
    joystickArea.addEventListener('touchend', (e) => {
      e.preventDefault();
      setJoystickActive(false);
      setJoystickPosition({ x: 0, y: 0 });
      
      // Reset joystick handle position
      if (joystickHandle) {
        joystickHandle.style.transform = `translate(0px, 0px)`;
      }
      
      // Reset movement in the game
      if (gameRef.current) {
        gameRef.current.getInputHandler().setVirtualKey('left', KeyState.RELEASED);
        gameRef.current.getInputHandler().setVirtualKey('right', KeyState.RELEASED);
      }
    });
    
    // Fire button touch events
    fireButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameRef.current) {
        gameRef.current.getInputHandler().setVirtualKey('fire', KeyState.PRESSED);
      }
    });
    
    fireButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (gameRef.current) {
        gameRef.current.getInputHandler().setVirtualKey('fire', KeyState.RELEASED);
      }
    });
  };
  
  // Handle joystick movement
  const handleJoystickMove = (deltaX: number, deltaY: number) => {
    // Calculate distance from center
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 40; // Maximum joystick movement radius
    
    // Normalize and limit movement
    let normX = deltaX / distance;
    let normY = deltaY / distance;
    
    const actualDistance = Math.min(distance, maxDistance);
    const moveX = normX * actualDistance;
    const moveY = normY * actualDistance;
    
    // Update joystick position
    setJoystickPosition({ x: moveX, y: moveY });
    
    // Move joystick handle
    if (joystickHandleRef.current) {
      joystickHandleRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
    
    // Send input to game
    if (gameRef.current) {
      // We only care about horizontal movement for this game
      if (moveX < -10) {
        gameRef.current.getInputHandler().setVirtualKey('left', KeyState.PRESSED);
        gameRef.current.getInputHandler().setVirtualKey('right', KeyState.RELEASED);
      } else if (moveX > 10) {
        gameRef.current.getInputHandler().setVirtualKey('right', KeyState.PRESSED);
        gameRef.current.getInputHandler().setVirtualKey('left', KeyState.RELEASED);
      } else {
        gameRef.current.getInputHandler().setVirtualKey('left', KeyState.RELEASED);
        gameRef.current.getInputHandler().setVirtualKey('right', KeyState.RELEASED);
      }
    }
  };
  
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {!isInitialized && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 title-screen-slide"
        >
          <div className="text-red-700 text-9xl font-extrabold mb-10 vampire-glow">VALAXY</div>
          <div
            className="text-white text-5xl mt-8 arcade-button py-5 px-16 hover:bg-red-900 cursor-pointer"
            onClick={handleInitGame}
          >
            PRESS SPACE TO PLAY
          </div>
          <div className="mt-16 text-gray-200 text-2xl pixel-text">© 2025 WEST COAST AI LABS</div>
          <div className="mt-4 text-red-600 text-md pixel-text">LICENSED BY WEST COAST AI LABS</div>
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
        
        {/* No controls help - removed as requested */}
      </div>
      
      {/* Mobile controls overlay - will be visible on touch devices */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 h-32 flex items-center justify-between px-8 z-30">
        {/* Virtual joystick */}
        <div
          ref={joystickRef}
          className="virtual-joystick touch-none w-28 h-28 flex items-center justify-center"
        >
          <div
            ref={joystickHandleRef}
            className="virtual-joystick-handle"
          ></div>
        </div>
        
        {/* Fire button */}
        <div
          ref={fireButtonRef}
          className="fire-button touch-none w-28 h-28 flex items-center justify-center"
        >
          <span className="text-2xl font-bold">FIRE</span>
        </div>
      </div>
    </div>
  );
}