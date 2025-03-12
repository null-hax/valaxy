/**
 * Sound Engine Module
 * Handles audio playback using Tone.js for authentic arcade sounds
 */

import * as Tone from 'tone';

// Sound effect types for our vampire-themed arcade game
export enum SoundEffect {
  PLAYER_SHOOT,         // Player firing a stake
  ENEMY_SHOOT,          // Enemy firing a blood drop
  PLAYER_EXPLOSION,     // Player ship exploding
  ENEMY_EXPLOSION,      // Enemy vampire exploding
  BOSS_EXPLOSION,       // Boss vampire exploding
  LEVEL_COMPLETE,       // Level completion
  GAME_OVER,            // Game over
  MENU_SELECT,          // Menu selection
  MENU_NAVIGATE,        // Menu navigation
  COIN_INSERT,          // Coin insertion sound
  GAME_START,           // Game start
  POWER_UP,             // Power-up collection
  VAMPIRE_CAPTURE,      // Vampire capturing player's ship
  VAMPIRE_TRANSFORM,    // Vampire transformation
}

export class SoundEngine {
  private isMuted: boolean = false;
  private masterVolume: Tone.Volume;
  private isInitialized: boolean = false;
  private sounds: Map<SoundEffect, Tone.ToneAudioNode> = new Map();
  private musicSynth?: Tone.PolySynth;
  private musicPart?: Tone.Part;
  private musicIsPlaying: boolean = false;

  constructor() {
    // Create a master volume node
    this.masterVolume = new Tone.Volume(-10).toDestination();
    
    // Connect it to the master output
    Tone.Destination.chain(this.masterVolume);
  }

  /**
   * Initialize the sound engine.
   * Must be called after a user interaction due to browser autoplay policies.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Start the Tone.js audio context
      await Tone.start();
      
      // Create various sound effects
      this.createSoundEffects();
      
      // Create background music
      this.createBackgroundMusic();
      
      this.isInitialized = true;
      console.log("Sound engine initialized");
    } catch (error) {
      console.error("Failed to initialize sound engine:", error);
    }
  }

  /**
   * Create all the sound effects using Tone.js synthesizers and effects
   */
  private createSoundEffects(): void {
    // Player Shoot - A quick high-pitched blip
    const playerShoot = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).connect(
      new Tone.Filter({ frequency: 2000, type: 'highpass' }).connect(
        new Tone.Volume(-15).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.PLAYER_SHOOT, playerShoot);

    // Enemy Shoot - A lower-pitched blip
    const enemyShoot = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    }).connect(
      new Tone.Filter({ frequency: 800, type: 'lowpass' }).connect(
        new Tone.Volume(-18).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.ENEMY_SHOOT, enemyShoot);

    // Player Explosion - A descending noise burst
    const playerExplosion = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.5 }
    }).connect(
      new Tone.BitCrusher(4).connect(
        new Tone.Distortion(0.8).connect(
          new Tone.Volume(-5).connect(this.masterVolume)
        )
      )
    );
    this.sounds.set(SoundEffect.PLAYER_EXPLOSION, playerExplosion);

    // Enemy Explosion - A quick noise burst
    const enemyExplosion = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
    }).connect(
      new Tone.BitCrusher(4).connect(
        new Tone.Filter({ frequency: 1500, type: 'lowpass' }).connect(
          new Tone.Volume(-12).connect(this.masterVolume)
        )
      )
    );
    this.sounds.set(SoundEffect.ENEMY_EXPLOSION, enemyExplosion);

    // Boss Explosion - A longer, more intense explosion
    const bossExplosion = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.2, release: 0.8 }
    }).connect(
      new Tone.BitCrusher(2).connect(
        new Tone.Filter({ frequency: 2000, type: 'lowpass' }).connect(
          new Tone.Volume(-5).connect(this.masterVolume)
        )
      )
    );
    this.sounds.set(SoundEffect.BOSS_EXPLOSION, bossExplosion);

    // Level Complete - A rising sequence
    const levelComplete = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }
    }).connect(
      new Tone.BitCrusher(8).connect(
        new Tone.Volume(-10).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.LEVEL_COMPLETE, levelComplete);

    // Game Over - A descending sequence
    const gameOver = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.5 }
    }).connect(
      new Tone.BitCrusher(8).connect(
        new Tone.Volume(-10).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.GAME_OVER, gameOver);

    // Menu Select - A simple click
    const menuSelect = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).connect(
      new Tone.Volume(-20).connect(this.masterVolume)
    );
    this.sounds.set(SoundEffect.MENU_SELECT, menuSelect);

    // Menu Navigate - A higher-pitched click
    const menuNavigate = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).connect(
      new Tone.Volume(-20).connect(this.masterVolume)
    );
    this.sounds.set(SoundEffect.MENU_NAVIGATE, menuNavigate);

    // Coin Insert - Classic arcade coin sound
    const coinInsert = new Tone.MetalSynth({
      // frequency is not a valid option, using the proper parameters instead
      envelope: { attack: 0.001, decay: 0.1, release: 0.8 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).connect(
      new Tone.Volume(-15).connect(this.masterVolume)
    );
    this.sounds.set(SoundEffect.COIN_INSERT, coinInsert);

    // Game Start - A rising sequence of notes
    const gameStart = new Tone.PolySynth(Tone.Synth).connect(
      new Tone.BitCrusher(8).connect(
        new Tone.Volume(-10).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.GAME_START, gameStart);

    // Power Up - A shimmering sound
    const powerUp = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.3, release: 0.3 }
    }).connect(
      new Tone.AutoFilter({
        frequency: 20,
        depth: 0.8
      }).connect(
        new Tone.Volume(-15).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.POWER_UP, powerUp);

    // Vampire Capture - Eerie sound
    const vampireCapture = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      detune: 0,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 1.5 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).connect(
      new Tone.Chorus(4, 2.5, 0.5).connect(
        new Tone.Volume(-12).connect(this.masterVolume)
      )
    );
    this.sounds.set(SoundEffect.VAMPIRE_CAPTURE, vampireCapture);

    // Vampire Transform - Transformation sound
    const vampireTransform = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.4 }
    }).connect(
      new Tone.AutoFilter({
        frequency: 8,
        depth: 0.8,
        baseFrequency: 200
      }).connect(
        new Tone.Phaser({
          frequency: 15,
          octaves: 5,
          baseFrequency: 1000
        }).connect(
          new Tone.Volume(-15).connect(this.masterVolume)
        )
      )
    );
    this.sounds.set(SoundEffect.VAMPIRE_TRANSFORM, vampireTransform);
  }

  /**
   * Create a simple background music sequence
   */
  private createBackgroundMusic(): void {
    // Create a poly synth for playing multiple notes
    this.musicSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
    }).connect(
      new Tone.BitCrusher(8).connect(
        new Tone.Filter({
          frequency: 1000,
          type: 'lowpass',
          rolloff: -12
        }).connect(
          new Tone.Volume(-20).connect(this.masterVolume)
        )
      )
    );

    // Vampire-themed ominous bass line
    const bassLine = [
      { time: 0, note: 'E2', duration: '8n' },
      { time: '0:1', note: 'G2', duration: '8n' },
      { time: '0:2', note: 'B2', duration: '8n' },
      { time: '0:3', note: 'D3', duration: '8n' },
      { time: '1:0', note: 'C2', duration: '8n' },
      { time: '1:1', note: 'E2', duration: '8n' },
      { time: '1:2', note: 'G2', duration: '8n' },
      { time: '1:3', note: 'B2', duration: '8n' },
      { time: '2:0', note: 'A1', duration: '8n' },
      { time: '2:1', note: 'C2', duration: '8n' },
      { time: '2:2', note: 'E2', duration: '8n' },
      { time: '2:3', note: 'G2', duration: '8n' },
      { time: '3:0', note: 'B1', duration: '8n' },
      { time: '3:1', note: 'D2', duration: '8n' },
      { time: '3:2', note: 'F#2', duration: '8n' },
      { time: '3:3', note: 'A2', duration: '8n' },
    ];

    // Create a sequence from the notes
    this.musicPart = new Tone.Part((time, value) => {
      if (this.musicSynth) {
        this.musicSynth.triggerAttackRelease(value.note, value.duration, time);
      }
    }, bassLine);

    // Set part to loop
    this.musicPart.loop = true;
    this.musicPart.loopEnd = '4:0';
  }

  /**
   * Play a specific sound effect
   */
  // Used to prevent sound overlap timing issues
  private soundQueue: Array<{sound: SoundEffect}> = [];
  private isProcessingQueue: boolean = false;
  
  public playSound(sound: SoundEffect): void {
    if (!this.isInitialized || this.isMuted) return;

    try {
      // Instead of playing immediately, add to queue
      this.soundQueue.push({ sound });
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    } catch (error) {
      console.error("Error queueing sound:", error);
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.soundQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      // Process one sound at a time with proper spacing
      while (this.soundQueue.length > 0) {
        const { sound } = this.soundQueue.shift()!;
        
        // Play the sound with current time
        this.playSoundImmediately(sound);
        
        // Small delay between processing queue items
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error("Error processing sound queue:", error);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  private playSoundImmediately(sound: SoundEffect): void {
    const synth = this.sounds.get(sound);
    if (!synth) return;

    try {
      // Get current time for each sound - fixes the "Start time must be strictly greater" error
      const now = Tone.now();
      
      // Play different sounds based on the effect type
      switch (sound) {
        case SoundEffect.PLAYER_SHOOT:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          break;

        case SoundEffect.ENEMY_SHOOT:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          break;

        case SoundEffect.PLAYER_EXPLOSION:
          (synth as Tone.Synth).triggerAttackRelease('C2', '8n', now);
          (synth as Tone.Synth).triggerAttackRelease('A1', '8n', now + 0.1);
          (synth as Tone.Synth).triggerAttackRelease('F1', '8n', now + 0.2);
          break;

        case SoundEffect.ENEMY_EXPLOSION:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          break;

        case SoundEffect.BOSS_EXPLOSION:
          (synth as Tone.NoiseSynth).triggerAttackRelease('4n', now);
          break;

        case SoundEffect.LEVEL_COMPLETE:
          const levelNotes = ['C4', 'E4', 'G4', 'C5'];
          levelNotes.forEach((note, i) => {
            const time = now + (i * 0.15);
            (synth as Tone.Synth).triggerAttackRelease(note, '8n', time);
          });
          break;

        case SoundEffect.GAME_OVER:
          const gameOverNotes = ['C4', 'G3', 'E3', 'C3'];
          gameOverNotes.forEach((note, i) => {
            const time = now + (i * 0.3);
            (synth as Tone.Synth).triggerAttackRelease(note, '4n', time);
          });
          break;

        case SoundEffect.MENU_SELECT:
          (synth as Tone.MembraneSynth).triggerAttackRelease('C3', '32n', now);
          break;

        case SoundEffect.MENU_NAVIGATE:
          (synth as Tone.MembraneSynth).triggerAttackRelease('G3', '32n', now);
          break;

        case SoundEffect.COIN_INSERT:
          (synth as Tone.MetalSynth).triggerAttackRelease('32n', now);
          (synth as Tone.MetalSynth).triggerAttackRelease('16n', now + 0.1);
          break;

        case SoundEffect.GAME_START:
          const startNotes = ['C4', 'E4', 'G4', 'C5', 'E5'];
          startNotes.forEach((note, i) => {
            const time = now + (i * 0.1);
            (synth as Tone.PolySynth).triggerAttackRelease(note, '8n', time);
          });
          break;

        case SoundEffect.POWER_UP:
          // Glissando effect using proper scheduling
          for (let i = 0; i < 10; i++) {
            const freq = 220 * Math.pow(2, i / 10);
            const time = now + (i * 0.03);
            Tone.Draw.schedule(() => {
              (synth as Tone.Synth).frequency.value = freq;
            }, time);
            (synth as Tone.Synth).triggerAttackRelease('32n', time);
          }
          break;

        case SoundEffect.VAMPIRE_CAPTURE:
          (synth as Tone.FMSynth).triggerAttackRelease('G2', '2n', now);
          break;

        case SoundEffect.VAMPIRE_TRANSFORM:
          (synth as Tone.NoiseSynth).triggerAttackRelease('4n', now);
          break;
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  /**
   * Start playing the background music
   */
  public startMusic(): void {
    if (!this.isInitialized || this.isMuted || this.musicIsPlaying) return;

    if (this.musicPart) {
      // Set a slower tempo for the eerie vampire music
      Tone.Transport.bpm.value = 90;
      Tone.Transport.start();
      this.musicPart.start(0);
      this.musicIsPlaying = true;
    }
  }

  /**
   * Stop the background music
   */
  public stopMusic(): void {
    if (!this.isInitialized || !this.musicIsPlaying) return;

    if (this.musicPart) {
      this.musicPart.stop();
      Tone.Transport.stop();
      this.musicIsPlaying = false;
    }
  }

  /**
   * Mute all sounds
   */
  public mute(): void {
    this.isMuted = true;
    this.masterVolume.volume.value = -Infinity;
  }

  /**
   * Unmute all sounds
   */
  public unmute(): void {
    this.isMuted = false;
    this.masterVolume.volume.value = -10;
  }

  /**
   * Toggle mute state
   */
  public toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Set the master volume (in decibels)
   */
  public setVolume(volumeDb: number): void {
    if (!this.isMuted) {
      this.masterVolume.volume.value = Math.max(-60, Math.min(0, volumeDb));
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopMusic();
    
    // Dispose all synths
    this.sounds.forEach(synth => {
      synth.dispose();
    });
    
    if (this.musicSynth) {
      this.musicSynth.dispose();
    }
    
    if (this.musicPart) {
      this.musicPart.dispose();
    }
    
    this.masterVolume.dispose();
    
    this.sounds.clear();
    this.isInitialized = false;
  }
}