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
  private _isMuted: boolean = false;
  private _volumeDb: number = -3; // Default volume in decibels
  private masterVolume: Tone.Volume;
  private isInitialized: boolean = false;
  private sounds: Map<SoundEffect, Tone.ToneAudioNode> = new Map();
  private musicSynth?: Tone.PolySynth;
  private musicPart?: Tone.Part;
  private musicIsPlaying: boolean = false;

  constructor() {
    // Create a master volume node
    this.masterVolume = new Tone.Volume(-3);
    
    // Connect it to the destination (output)
    // Fix: Use getDestination() instead of deprecated Destination
    // Fix: Connect masterVolume to destination, not the other way around
    this.masterVolume.connect(Tone.getDestination());
    
    console.log("SoundEngine initialized with volume:", this._volumeDb, "dB");
  }

  /**
   * Initialize the sound engine.
   * Must be called after a user interaction due to browser autoplay policies.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log("Initializing sound engine...");
      const context = Tone.getContext();
      console.log("Audio context state before start:", context.state);
      
      // Start the Tone.js audio context with user gesture
      await Tone.start();
      console.log("Tone.start() completed, context state:", context.state);
      
      // Force resume audio context
      await context.resume();
      console.log("Tone.context.resume() completed, context state:", context.state);
      
      // Create various sound effects
      this.createSoundEffects();
      
      // Create background music
      this.createBackgroundMusic();
      
      // Set volume based on mute state
      if (this._isMuted) {
        this.masterVolume.volume.value = -Infinity;
        console.log("Sound is muted, setting volume to -Infinity");
      } else {
        this.masterVolume.volume.value = this._volumeDb;
        console.log("Sound is unmuted, setting volume to:", this._volumeDb, "dB");
      }
      
      this.isInitialized = true;
      console.log("Sound engine initialized successfully, context state:", context.state);
      
      // Play a sound to confirm initialization
      setTimeout(() => {
        if (!this._isMuted) {
          this.playSound(SoundEffect.MENU_SELECT);
          console.log("Played initialization confirmation sound");
        }
      }, 500);
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
    });
    
    // Create and connect the filter and volume
    const playerShootFilter = new Tone.Filter({ frequency: 2000, type: 'highpass' });
    const playerShootVolume = new Tone.Volume(-15);
    
    // Connect the chain: playerShoot -> filter -> volume -> masterVolume
    playerShoot.connect(playerShootFilter);
    playerShootFilter.connect(playerShootVolume);
    playerShootVolume.connect(this.masterVolume);
    
    console.log("Player shoot sound created and connected to master volume");
    this.sounds.set(SoundEffect.PLAYER_SHOOT, playerShoot);

    // Enemy Shoot - A lower-pitched blip
    const enemyShoot = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    });
    
    // Create and connect the filter and volume
    const enemyShootFilter = new Tone.Filter({ frequency: 800, type: 'lowpass' });
    const enemyShootVolume = new Tone.Volume(-18);
    
    // Connect the chain: enemyShoot -> filter -> volume -> masterVolume
    enemyShoot.connect(enemyShootFilter);
    enemyShootFilter.connect(enemyShootVolume);
    enemyShootVolume.connect(this.masterVolume);
    
    console.log("Enemy shoot sound created and connected to master volume");
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
   * Create a spooky church organ background music with multiple instruments
   */
  private createBackgroundMusic(): void {
    console.log("Creating enhanced spooky church organ background music");
    
    // Create a church organ-like synth for the bass and mid-range
    this.musicSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 1.5,
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.7,
        release: 1.2
      },
      modulation: {
        type: "square"
      },
      modulationEnvelope: {
        attack: 0.1,
        decay: 0.5,
        sustain: 0.2,
        release: 0.5
      }
    });
    
    // Create a second synth for upper register melodies
    const upperSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.4,
        release: 1.5
      },
      modulation: {
        type: "triangle"
      },
      modulationEnvelope: {
        attack: 0.5,
        decay: 0.1,
        sustain: 0.2,
        release: 0.5
      }
    });
    
    // Add effects to create a church organ sound
    const reverb = new Tone.Reverb({
      decay: 6,
      wet: 0.3
    });
    
    const chorus = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.2
    }).start();
    
    const tremolo = new Tone.Tremolo({
      frequency: 2,
      depth: 0.2
    }).start();
    
    const filter = new Tone.Filter({
      frequency: 800,
      type: 'lowpass',
      rolloff: -24
    });
    
    // Add effects for the upper synth
    const upperReverb = new Tone.Reverb({
      decay: 5,
      wet: 0.4
    });
    
    const upperChorus = new Tone.Chorus({
      frequency: 0.8,
      delayTime: 4,
      depth: 0.8,
      wet: 0.3
    }).start();
    
    const upperTremolo = new Tone.Tremolo({
      frequency: 3,
      depth: 0.3
    }).start();
    
    // Connect the effects chain for main organ
    this.musicSynth.connect(chorus);
    chorus.connect(tremolo);
    tremolo.connect(reverb);
    reverb.connect(filter);
    filter.connect(new Tone.Volume(-3).connect(this.masterVolume));
    
    // Connect the effects chain for upper synth
    upperSynth.connect(upperChorus);
    upperChorus.connect(upperTremolo);
    upperTremolo.connect(upperReverb);
    upperReverb.connect(new Tone.Volume(-8).connect(this.masterVolume));
    
    console.log("Church organ synths and effects created");

    // Spooky church organ melody in minor key
    // Using D minor (D, E, F, G, A, Bb, C)
    const spookyMelody = [
      // Main theme - haunting melody
      { time: 0, note: 'D3', duration: '4n' },
      { time: '0:1', note: 'F3', duration: '4n' },
      { time: '0:2', note: 'A3', duration: '4n' },
      { time: '0:3', note: 'D4', duration: '4n' },
      
      // Descending line
      { time: '1:0', note: 'C4', duration: '8n' },
      { time: '1:1', note: 'Bb3', duration: '8n' },
      { time: '1:2', note: 'A3', duration: '8n' },
      { time: '1:3', note: 'G3', duration: '8n' },
      
      // Dissonant chord
      { time: '2:0', note: ['E3', 'Bb3'], duration: '2n' },
      { time: '2:2', note: 'F3', duration: '4n' },
      { time: '2:3', note: 'A3', duration: '4n' },
      
      // Resolving phrase with diminished chord
      { time: '3:0', note: 'D3', duration: '8n' },
      { time: '3:1', note: 'F3', duration: '8n' },
      { time: '3:2', note: ['D3', 'F3', 'Bb3'], duration: '4n' },
      { time: '3:3', note: 'A3', duration: '8n.' },
      
      // Second phrase - lower register
      { time: '4:0', note: 'D2', duration: '4n' },
      { time: '4:1', note: 'A2', duration: '4n' },
      { time: '4:2', note: 'D3', duration: '4n' },
      { time: '4:3', note: 'F3', duration: '4n' },
      
      // Chromatic descent
      { time: '5:0', note: 'E3', duration: '8n' },
      { time: '5:1', note: 'Eb3', duration: '8n' },
      { time: '5:2', note: 'D3', duration: '8n' },
      { time: '5:3', note: 'C#3', duration: '8n' },
      
      // Tension building
      { time: '6:0', note: ['C3', 'G3'], duration: '2n' },
      { time: '6:2', note: ['Bb2', 'F3'], duration: '4n' },
      { time: '6:3', note: 'A2', duration: '4n' },
      
      // Final cadence
      { time: '7:0', note: ['D2', 'A2', 'D3'], duration: '2n' },
      { time: '7:2', note: ['D2', 'F2', 'A2', 'D3'], duration: '2n' },
      
      // Extended melody - second section with more complex harmonies
      // Ascending motif in upper register
      { time: '8:0', note: 'F3', duration: '4n' },
      { time: '8:1', note: 'A3', duration: '4n' },
      { time: '8:2', note: 'C4', duration: '4n' },
      { time: '8:3', note: 'F4', duration: '4n' },
      
      // Descending sequence with pedal tone
      { time: '9:0', note: ['D2', 'E4'], duration: '8n' },
      { time: '9:1', note: ['D2', 'D4'], duration: '8n' },
      { time: '9:2', note: ['D2', 'C4'], duration: '8n' },
      { time: '9:3', note: ['D2', 'Bb3'], duration: '8n' },
      
      // Harmonic minor scale passage
      { time: '10:0', note: 'A3', duration: '8n' },
      { time: '10:1', note: 'Bb3', duration: '8n' },
      { time: '10:2', note: 'C#4', duration: '8n' },
      { time: '10:3', note: 'D4', duration: '8n' },
      { time: '11:0', note: 'E4', duration: '8n' },
      { time: '11:1', note: 'F4', duration: '8n' },
      { time: '11:2', note: 'G#4', duration: '8n' },
      { time: '11:3', note: 'A4', duration: '8n' },
      
      // Diminished chord sequence
      { time: '12:0', note: ['F#3', 'A3', 'C4'], duration: '4n' },
      { time: '12:1', note: ['F3', 'Ab3', 'B3'], duration: '4n' },
      { time: '12:2', note: ['E3', 'G3', 'Bb3'], duration: '4n' },
      { time: '12:3', note: ['Eb3', 'Gb3', 'A3'], duration: '4n' },
      
      // Neapolitan chord and resolution
      { time: '13:0', note: ['Eb3', 'G3', 'Bb3'], duration: '2n' },
      { time: '13:2', note: ['A2', 'E3', 'A3'], duration: '2n' },
      
      // Final phrase with modal mixture
      { time: '14:0', note: ['D3', 'F3', 'A3'], duration: '4n' },
      { time: '14:1', note: ['D3', 'F#3', 'A3'], duration: '4n' }, // Major chord for contrast
      { time: '14:2', note: ['G2', 'Bb2', 'D3', 'G3'], duration: '4n' },
      { time: '14:3', note: ['A2', 'E3', 'A3'], duration: '4n' },
      
      // Final authentic cadence
      { time: '15:0', note: ['A2', 'C#3', 'E3', 'A3'], duration: '2n' }, // Dominant
      { time: '15:2', note: ['D2', 'D3', 'F3', 'A3', 'D4'], duration: '2n' } // Tonic
    ];

    // Upper register countermelody
    const upperMelody = [
      // First phrase - counterpoint to main theme
      { time: '0:0.5', note: 'A4', duration: '8n' },
      { time: '0:1.5', note: 'D5', duration: '8n' },
      { time: '0:2.5', note: 'F5', duration: '8n' },
      { time: '0:3.5', note: 'E5', duration: '8n' },
      
      // Descending figure
      { time: '1:0.5', note: 'D5', duration: '8n' },
      { time: '1:1.5', note: 'C5', duration: '8n' },
      { time: '1:2.5', note: 'Bb4', duration: '8n' },
      { time: '1:3.5', note: 'A4', duration: '8n' },
      
      // Sustained high note during dissonant section
      { time: '2:0', note: 'D5', duration: '2n.' },
      { time: '2:3', note: 'C#5', duration: '8n' },
      
      // Echo of the resolving phrase
      { time: '3:0.5', note: 'D5', duration: '8n' },
      { time: '3:1.5', note: 'A4', duration: '8n' },
      { time: '3:2.5', note: 'F4', duration: '8n' },
      
      // High pedal tone
      { time: '4:0', note: 'A4', duration: '1n' },
      
      // Chromatic response
      { time: '5:0.5', note: 'G4', duration: '8n' },
      { time: '5:1.5', note: 'F#4', duration: '8n' },
      { time: '5:2.5', note: 'F4', duration: '8n' },
      { time: '5:3.5', note: 'E4', duration: '8n' },
      
      // Tension building - high register
      { time: '6:0', note: 'Eb5', duration: '4n' },
      { time: '6:1', note: 'D5', duration: '4n' },
      { time: '6:2', note: 'C5', duration: '4n' },
      { time: '6:3', note: 'Bb4', duration: '4n' },
      
      // Final cadence - high register
      { time: '7:0', note: 'A4', duration: '2n' },
      { time: '7:2', note: 'D5', duration: '2n' },
      
      // Second section - upper register flourishes
      { time: '8:0.5', note: 'A5', duration: '16n' },
      { time: '8:0.75', note: 'G5', duration: '16n' },
      { time: '8:1', note: 'F5', duration: '8n' },
      { time: '8:2.5', note: 'A5', duration: '16n' },
      { time: '8:2.75', note: 'G5', duration: '16n' },
      { time: '8:3', note: 'A5', duration: '8n' },
      
      // Descending sequence response
      { time: '9:0.5', note: 'F5', duration: '8n' },
      { time: '9:1.5', note: 'E5', duration: '8n' },
      { time: '9:2.5', note: 'D5', duration: '8n' },
      { time: '9:3.5', note: 'C5', duration: '8n' },
      
      // Harmonic minor scale - higher octave
      { time: '10:0.5', note: 'E5', duration: '8n' },
      { time: '10:1.5', note: 'F5', duration: '8n' },
      { time: '10:2.5', note: 'G#5', duration: '8n' },
      { time: '10:3.5', note: 'A5', duration: '8n' },
      
      // Sustained high note
      { time: '11:0', note: 'D6', duration: '1n' },
      
      // Diminished chord arpeggios
      { time: '12:0.5', note: 'C5', duration: '16n' },
      { time: '12:0.75', note: 'F#5', duration: '16n' },
      { time: '12:1', note: 'A5', duration: '8n' },
      { time: '12:2.5', note: 'B4', duration: '16n' },
      { time: '12:2.75', note: 'F5', duration: '16n' },
      { time: '12:3', note: 'Ab5', duration: '8n' },
      
      // High register response to Neapolitan
      { time: '13:0', note: 'G5', duration: '8n' },
      { time: '13:0.5', note: 'Bb5', duration: '8n' },
      { time: '13:1', note: 'Eb6', duration: '4n' },
      { time: '13:2', note: 'E5', duration: '8n' },
      { time: '13:2.5', note: 'A5', duration: '8n' },
      { time: '13:3', note: 'C#6', duration: '4n' },
      
      // Final phrase - high register
      { time: '14:0.5', note: 'D6', duration: '8n' },
      { time: '14:1.5', note: 'A5', duration: '8n' },
      { time: '14:2.5', note: 'Bb5', duration: '8n' },
      { time: '14:3.5', note: 'A5', duration: '8n' },
      
      // Final authentic cadence - high register
      { time: '15:0', note: 'E6', duration: '2n' }, // Dominant
      { time: '15:2', note: 'D6', duration: '2n' }  // Tonic
    ];

    console.log("Enhanced spooky melody created with", spookyMelody.length, "notes/chords and", upperMelody.length, "upper register notes");

    // Create a sequence from the main organ notes
    this.musicPart = new Tone.Part((time, value) => {
      if (this.musicSynth) {
        this.musicSynth.triggerAttackRelease(value.note, value.duration, time);
      }
    }, spookyMelody);

    // Create a sequence for the upper register countermelody
    const upperPart = new Tone.Part((time, value) => {
      upperSynth.triggerAttackRelease(value.note, value.duration, time);
    }, upperMelody);

    // Set parts to loop
    this.musicPart.loop = true;
    this.musicPart.loopEnd = '16:0'; // 16 measures
    
    upperPart.loop = true;
    upperPart.loopEnd = '16:0'; // 16 measures
    
    // Store the upper part to start/stop with main part
    (this.musicPart as any).upperPart = upperPart;
    
    // We'll manually start/stop the upper part in startMusic and stopMusic methods
    
    console.log("Music parts created and set to loop");
  }

  /**
   * Play a specific sound effect
   */
  // Used to prevent sound overlap timing issues
  private soundQueue: Array<{sound: SoundEffect}> = [];
  private isProcessingQueue: boolean = false;
  
  // Flag to disable sound effects but allow background music
  private _soundEffectsDisabled: boolean = true;

  public playSound(sound: SoundEffect): void {
    if (!this.isInitialized) {
      console.warn(`Cannot play sound ${SoundEffect[sound]} - sound engine not initialized`);
      return;
    }
    
    if (this._isMuted) {
      console.log(`Sound ${SoundEffect[sound]} not played because audio is muted`);
      return;
    }

    if (this._soundEffectsDisabled) {
      console.log(`Sound ${SoundEffect[sound]} not played because sound effects are disabled`);
      return;
    }

    try {
      const context = Tone.getContext();
      console.log(`Queueing sound: ${SoundEffect[sound]}, context state: ${context.state}`);
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
      // Ensure audio context is running before processing queue
      const context = Tone.getContext();
      if (context.state !== 'running') {
        try {
          await Tone.start();
          await context.resume();
          console.log("Audio context resumed in processQueue, state:", context.state);
        } catch (error) {
          console.error("Failed to resume audio context in processQueue:", error);
        }
      }
      
      // Process one sound at a time with proper spacing
      while (this.soundQueue.length > 0) {
        const { sound } = this.soundQueue.shift()!;
        
        // Make sure audio context is running
        const context = Tone.getContext();
        if (context.state !== 'running') {
          await context.resume();
        }
        
        // Play the sound with current time
        await this.playSoundImmediately(sound);
        
        // Increased delay between processing queue items to prevent timing conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error processing sound queue:", error);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  private async playSoundImmediately(sound: SoundEffect): Promise<void> {
    const synth = this.sounds.get(sound);
    if (!synth) {
      console.error(`Sound effect ${SoundEffect[sound]} not found in sounds map`);
      return;
    }

    try {
      // Make sure audio context is running
      const context = Tone.getContext();
      if (context.state !== 'running') {
        try {
          await Tone.start();
          await context.resume();
          console.log("Audio context resumed in playSoundImmediately, state:", context.state);
        } catch (error) {
          console.error("Failed to resume audio context in playSoundImmediately:", error);
          return; // Don't try to play if we can't resume
        }
      }
      
      // Get current time for each sound with a larger increment to ensure uniqueness
      const now = Tone.now() + Math.random() * 0.05;
      console.log(`Playing sound: ${SoundEffect[sound]}, muted: ${this._isMuted}, volume: ${this._volumeDb}dB`);
      
      // Play different sounds based on the effect type
      switch (sound) {
        case SoundEffect.PLAYER_SHOOT:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          console.log("Player shoot sound triggered");
          break;

        case SoundEffect.ENEMY_SHOOT:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          console.log("Enemy shoot sound triggered");
          break;

        case SoundEffect.PLAYER_EXPLOSION:
          (synth as Tone.Synth).triggerAttackRelease('C2', '8n', now);
          console.log("Player explosion sound triggered");
          break;

        case SoundEffect.ENEMY_EXPLOSION:
          (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
          console.log("Enemy explosion sound triggered");
          break;

        case SoundEffect.BOSS_EXPLOSION:
          (synth as Tone.NoiseSynth).triggerAttackRelease('4n', now);
          console.log("Boss explosion sound triggered");
          break;

        case SoundEffect.LEVEL_COMPLETE:
          (synth as Tone.Synth).triggerAttackRelease('C4', '8n', now);
          console.log("Level complete sound triggered");
          break;

        case SoundEffect.GAME_OVER:
          (synth as Tone.Synth).triggerAttackRelease('C4', '4n', now);
          console.log("Game over sound triggered");
          break;

        case SoundEffect.MENU_SELECT:
          (synth as Tone.MembraneSynth).triggerAttackRelease('C3', '32n', now);
          console.log("Menu select sound triggered");
          break;

        case SoundEffect.MENU_NAVIGATE:
          (synth as Tone.MembraneSynth).triggerAttackRelease('G3', '32n', now);
          console.log("Menu navigate sound triggered");
          break;

        case SoundEffect.COIN_INSERT:
          (synth as Tone.MetalSynth).triggerAttackRelease('32n', now);
          console.log("Coin insert sound triggered");
          break;

        case SoundEffect.GAME_START:
          (synth as Tone.PolySynth).triggerAttackRelease('C4', '8n', now);
          console.log("Game start sound triggered");
          break;

        case SoundEffect.POWER_UP:
          // Simplified power-up sound to avoid timing issues
          (synth as Tone.Synth).triggerAttackRelease('C5', '16n', now);
          console.log("Power up sound triggered");
          break;

        case SoundEffect.VAMPIRE_CAPTURE:
          (synth as Tone.FMSynth).triggerAttackRelease('G2', '2n', now);
          console.log("Vampire capture sound triggered");
          break;

        case SoundEffect.VAMPIRE_TRANSFORM:
          (synth as Tone.NoiseSynth).triggerAttackRelease('4n', now);
          console.log("Vampire transform sound triggered");
          break;
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  /**
   * Start playing the background music
   * @param forceRestart If true, will restart the music even if it's already playing
   */
  public async startMusic(forceRestart: boolean = false): Promise<void> {
    console.log("Starting background music...");
    console.log("Initialized:", this.isInitialized, "Muted:", this._isMuted, "Already playing:", this.musicIsPlaying);
    
    if (!this.isInitialized) {
      console.warn("Cannot start music - sound engine not initialized");
      return;
    }
    
    if (this._isMuted) {
      console.log("Music not started because audio is muted");
      return;
    }
    
    // If we're forcing a restart, use the dedicated restartMusic method
    if (forceRestart) {
      console.log("Forcing music restart using restartMusic method");
      await this.restartMusic();
      return;
    }
    
    // If music is already playing and we're not forcing a restart, return early
    if (this.musicIsPlaying) {
      console.log("Music is already playing");
      return;
    }

    // Ensure audio context is running
    const context = Tone.getContext();
    if (context.state !== 'running') {
      try {
        console.log("Audio context not running, attempting to start...");
        await Tone.start();
        await context.resume();
        console.log("Audio context resumed in startMusic, state:", context.state);
      } catch (error) {
        console.error("Failed to resume audio context in startMusic:", error);
        return; // Don't try to play if we can't resume
      }
    }

    // Add a small delay after resuming context
    await new Promise(resolve => setTimeout(resolve, 50));

    if (this.musicPart) {
      // Set a slower tempo for the spooky church organ music
      const transport = Tone.getTransport();
      transport.bpm.value = 70; // Slower tempo for more dramatic effect
      console.log("Setting tempo to", transport.bpm.value, "BPM");
      
      transport.start();
      
      // Start the main organ part
      this.musicPart.start(0);
      
      // Start the upper register part if it exists
      const upperPart = (this.musicPart as any).upperPart as Tone.Part;
      if (upperPart) {
        upperPart.start(0);
        console.log("Upper register countermelody started");
      }
      
      this.musicIsPlaying = true;
      console.log("Enhanced spooky church organ background music started");
    } else {
      console.error("Music part not created - cannot start music");
    }
  }

  /**
   * Stop the background music
   */
  public stopMusic(): void {
    console.log("Stopping background music...");
    
    if (!this.isInitialized) {
      console.log("Sound engine not initialized, nothing to stop");
      return;
    }
    
    if (!this.musicIsPlaying) {
      console.log("Music is not currently playing, nothing to stop");
      return;
    }

    try {
      if (this.musicPart) {
        // Stop the main organ part
        this.musicPart.stop();
        console.log("Main organ part stopped");
        
        // Stop the upper register part if it exists
        const upperPart = (this.musicPart as any).upperPart as Tone.Part;
        if (upperPart) {
          upperPart.stop();
          console.log("Upper register countermelody stopped");
        }
      } else {
        console.log("No music part to stop");
      }
      
      // Always stop the transport
      const transport = Tone.getTransport();
      transport.stop();
      console.log("Tone.js transport stopped");
      
      this.musicIsPlaying = false;
      console.log("Background music stopped successfully");
    } catch (error) {
      console.error("Error stopping background music:", error);
      // Force the flag to false even if there was an error
      this.musicIsPlaying = false;
    }
  }

  /**
   * Restart the background music from the beginning
   * Complete recreation approach for maximum reliability
   */
  public async restartMusic(): Promise<void> {
    console.log("Restarting background music with complete recreation approach...");
    
    try {
      // First, ensure we're in a clean state by stopping any existing music
      this.stopMusic();
      
      // Reset the flag
      this.musicIsPlaying = false;
      
      // Reset the Tone.js transport
      const transport = Tone.getTransport();
      transport.stop();
      transport.cancel(0); // Cancel all scheduled events
      console.log("Tone.js transport reset");
      
      // Dispose of existing music parts to ensure clean slate
      if (this.musicPart) {
        try {
          // Get the upper part before disposing the main part
          const upperPart = (this.musicPart as any).upperPart as Tone.Part;
          
          // Dispose the main part
          this.musicPart.dispose();
          
          // Dispose the upper part if it exists
          if (upperPart) {
            upperPart.dispose();
          }
          
          console.log("Disposed existing music parts");
        } catch (disposeError) {
          console.error("Error disposing music parts:", disposeError);
        }
        
        // Clear the reference
        this.musicPart = undefined;
      }
      
      // Add a small delay for clean separation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Recreate the background music from scratch
      this.createBackgroundMusic();
      console.log("Recreated background music");
      
      // Add another small delay before starting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Ensure audio context is running
      const context = Tone.getContext();
      try {
        await Tone.start();
        await context.resume();
        console.log("Audio context resumed in restartMusic, state:", context.state);
      } catch (contextError) {
        console.error("Error resuming audio context:", contextError);
      }
      
      // Start the music with the newly created parts
      if (this.musicPart) {
        // Set tempo
        transport.bpm.value = 70;
        console.log("Setting tempo to", transport.bpm.value, "BPM");
        
        // Start transport
        transport.start();
        
        // Start the main organ part
        this.musicPart.start(0);
        
        // Start the upper register part if it exists
        const upperPart = (this.musicPart as any).upperPart;
        if (upperPart && typeof upperPart.start === 'function') {
          upperPart.start(0);
          console.log("Upper register countermelody started");
        }
        
        this.musicIsPlaying = true;
        console.log("Background music restarted successfully with recreation approach");
      } else {
        console.error("Music part not created - cannot restart music");
      }
    } catch (error) {
      console.error("Error in recreation restartMusic:", error);
      
      // Last resort fallback - try to start music directly
      try {
        // Ensure audio context is running
        const context = Tone.getContext();
        await Tone.start();
        await context.resume();
        
        // Create new music if needed
        if (!this.musicPart) {
          this.createBackgroundMusic();
        }
        
        // Start transport and music parts directly
        if (this.musicPart) {
          const transport = Tone.getTransport();
          transport.start();
          this.musicPart.start(0);
          
          // Start the upper register part if it exists
          const upperPart = (this.musicPart as any).upperPart;
          if (upperPart && typeof upperPart.start === 'function') {
            upperPart.start(0);
          }
          
          this.musicIsPlaying = true;
          console.log("Music restarted with fallback approach");
        }
      } catch (fallbackError) {
        console.error("Failed to restart music with fallback approach:", fallbackError);
      }
    }
  }

  /**
   * Mute all sounds
   */
  public mute(): void {
    this._isMuted = true;
    this.masterVolume.volume.value = -Infinity;
  }

  /**
   * Unmute all sounds
   */
  public unmute(): void {
    this._isMuted = false;
    this.masterVolume.volume.value = this._volumeDb;
  }

  /**
   * Toggle mute state
   */
  public async toggleMute(): Promise<boolean> {
    // Ensure audio context is resumed
    try {
      const context = Tone.getContext();
      await Tone.start();
      await context.resume();
      console.log("Audio context resumed in toggleMute, state:", context.state);
    } catch (error) {
      console.error("Failed to resume audio context in toggleMute:", error);
    }
    
    const wasMuted = this._isMuted;
    
    if (wasMuted) {
      this.unmute();
      console.log("Sound unmuted, volume set to:", this._volumeDb, "dB");
      
      // Play a confirmation sound when unmuting
      setTimeout(() => {
        this.playSound(SoundEffect.MENU_SELECT);
      }, 100);
    } else {
      this.mute();
      console.log("Sound muted");
    }
    
    console.log("Mute state toggled from", wasMuted, "to", this._isMuted);
    return this._isMuted;
  }

  /**
   * Get current mute state
   */
  public getMuteState(): boolean {
    return this._isMuted;
  }
  
  /**
   * Check if music is currently playing
   * @returns True if music is playing, false otherwise
   */
  public getMusicIsPlaying(): boolean {
    return this.musicIsPlaying;
  }

  /**
   * Set the master volume (in decibels)
   * @param volumeDb Volume in decibels (range: -60 to 0)
   */
  public setVolume(volumeDb: number): void {
    // Store the volume value even if muted
    this._volumeDb = Math.max(-60, Math.min(0, volumeDb));
    
    // Only apply if not muted
    if (!this._isMuted) {
      this.masterVolume.volume.value = this._volumeDb;
      console.log("Volume set to:", this._volumeDb, "dB");
    }
  }
  
  /**
   * Get the current volume in decibels
   */
  public getVolume(): number {
    return this._volumeDb;
  }

  /**
   * Enable or disable sound effects
   * This allows background music to play while sound effects are disabled
   * @param enabled Whether sound effects should be enabled
   */
  public setSoundEffectsEnabled(enabled: boolean): void {
    this._soundEffectsDisabled = !enabled;
    console.log(`Sound effects ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if sound effects are enabled
   * @returns True if sound effects are enabled, false otherwise
   */
  public areSoundEffectsEnabled(): boolean {
    return !this._soundEffectsDisabled;
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