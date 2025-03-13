# Valaxy Game Audio System Documentation

## Overview

The Valaxy game uses a sophisticated audio system built on top of Tone.js to create authentic arcade-style sound effects and background music. This document explains how the audio system works, how to use it, and how to troubleshoot common issues.

## Architecture

The audio system is implemented in the `SoundEngine` class located in `app/game/sounds/soundEngine.ts`. This class is responsible for:

1. Creating and managing all sound effects
2. Playing background music
3. Handling volume control
4. Managing mute/unmute functionality

### Key Components

- **Master Volume**: A central volume control that affects all sounds in the game
- **Sound Effects**: Individual synthesized sounds for game events
- **Background Music**: A looping sequence of notes that plays during gameplay
- **Sound Queue**: A system to prevent sound overlap and timing issues

## Sound Effects

The game includes the following sound effects:

| Sound Effect | Description | Implementation |
|--------------|-------------|----------------|
| PLAYER_SHOOT | Player firing a stake | White noise with high-pass filter |
| ENEMY_SHOOT | Enemy firing a blood drop | Pink noise with low-pass filter |
| PLAYER_EXPLOSION | Player ship exploding | Sawtooth synth with bit crusher and distortion |
| ENEMY_EXPLOSION | Enemy vampire exploding | White noise with bit crusher and filter |
| BOSS_EXPLOSION | Boss vampire exploding | White noise with longer decay and bit crusher |
| LEVEL_COMPLETE | Level completion | Square wave synth with bit crusher |
| GAME_OVER | Game over | Square wave synth with bit crusher |
| MENU_SELECT | Menu selection | Membrane synth for a click sound |
| MENU_NAVIGATE | Menu navigation | Higher-pitched membrane synth |
| COIN_INSERT | Coin insertion | Metal synth for classic arcade sound |
| GAME_START | Game start | Poly synth for a sequence of notes |
| POWER_UP | Power-up collection | Sine wave with auto filter |
| VAMPIRE_CAPTURE | Vampire capturing player | FM synth with chorus effect |
| VAMPIRE_TRANSFORM | Vampire transformation | Brown noise with auto filter and phaser |

Each sound effect is created using Tone.js synthesizers and effects to achieve an authentic arcade sound. The sounds are designed to be distinctive and provide clear feedback to the player about game events.

## Audio Routing

The audio routing follows this pattern:

```
Sound Source (Synth/Noise) → Effects → Volume → Master Volume → Destination
```

This routing allows for individual control of each sound while still maintaining global volume control.

## Initialization

The audio system must be initialized after a user interaction due to browser autoplay policies. This is handled in the `init()` method of the `SoundEngine` class, which is called from the `Game` class after a user interaction.

The initialization process:

1. Starts the Tone.js audio context
2. Resumes the audio context
3. Creates all sound effects
4. Creates the background music
5. Sets the initial volume based on mute state
6. Plays a test tone to ensure audio is working

## Playing Sounds

To play a sound effect:

```typescript
soundEngine.playSound(SoundEffect.SOUND_NAME);
```

The sound will be added to a queue and played as soon as possible to prevent timing issues.

## Background Music

The background music is a spooky church organ melody that creates an eerie, vampire-themed atmosphere. It's implemented using a `Tone.Part` that triggers notes on a `Tone.PolySynth` with FM synthesis to create an authentic church organ sound.

### Church Organ Sound Design

The church organ sound is created using:

1. **FM Synthesis**: Using `Tone.FMSynth` with carefully tuned harmonicity and modulation parameters
2. **Reverb**: Adding spaciousness and depth to simulate a cathedral environment
3. **Chorus**: Creating a subtle detuning effect for richness
4. **Tremolo**: Adding a slight wavering to the sound
5. **Filter**: Shaping the frequency response for a more authentic organ sound

### Spooky Melody

The melody is composed in D minor (D, E, F, G, A, Bb, C) to create a haunting, gothic atmosphere. It includes:

- Dissonant chords for tension
- Diminished chords for an unsettling feeling
- Chromatic passages for a sense of unease
- Low register notes for a dark, ominous quality

### Controls

To start the background music:

```typescript
await soundEngine.startMusic();
```

To stop the background music:

```typescript
soundEngine.stopMusic();
```

### Sound Effects vs. Background Music

The game allows for independent control of sound effects and background music:

```typescript
// Disable sound effects but keep background music playing
soundEngine.setSoundEffectsEnabled(false);

// Enable sound effects
soundEngine.setSoundEffectsEnabled(true);

// Check if sound effects are enabled
const sfxEnabled = soundEngine.areSoundEffectsEnabled();
```

## Volume Control

The volume can be adjusted using the `setVolume` method:

```typescript
soundEngine.setVolume(-20); // Volume in decibels (range: -60 to 0)
```

The volume is stored in decibels, with 0 being the maximum volume and -60 being the minimum audible volume.

## Mute/Unmute

The sound can be muted or unmuted using the following methods:

```typescript
soundEngine.mute();    // Mute all sounds
soundEngine.unmute();  // Unmute all sounds
```

Or toggled using:

```typescript
const isMuted = await soundEngine.toggleMute();
```

## Integration with Game UI

The sound system is integrated with the game UI through the `ValaxyGame` component. This component:

1. Initializes the sound engine when the game starts
2. Provides UI controls for muting/unmuting
3. Provides a volume slider for adjusting the volume

## Troubleshooting

### No Sound

If you're not hearing any sound:

1. Check if the sound is muted (look for "SOUND OFF" in the UI)
2. Check if the volume is set too low (adjust the volume slider)
3. Check browser console for errors related to audio context
4. Ensure the browser allows autoplay (most browsers require a user interaction)
5. Try clicking on the game canvas to ensure there's been a user interaction

### Audio Context Not Starting

The audio context must be started after a user interaction. If you see errors about the audio context not being in a "running" state:

1. Ensure there's been a user interaction (click, keypress)
2. Check if there are any browser policies blocking audio
3. Try using the `toggleMute` function to force the audio context to start

### Sound Delay

If there's a delay between game events and sounds:

1. This is normal for the first few sounds as the audio context initializes
2. The sound queue system helps manage timing issues
3. Subsequent sounds should play with minimal delay

## Best Practices

1. Always initialize the sound engine after a user interaction
2. Use the sound queue system rather than playing sounds directly
3. Dispose of the sound engine when it's no longer needed to free resources
4. Keep volume levels consistent across different sound effects
5. Use appropriate sound effects for game events to provide clear feedback

## Technical Details

### Browser Compatibility

The audio system uses the Web Audio API through Tone.js, which is supported in all modern browsers. However, autoplay policies vary between browsers, so the system is designed to handle these differences.

### Performance Considerations

- Sound synthesis can be CPU-intensive, especially on mobile devices
- The sound queue system helps prevent too many sounds from playing simultaneously
- Background music is designed to be lightweight to minimize CPU usage

### Memory Management

The `dispose` method should be called when the game is unloaded to free audio resources:

```typescript
soundEngine.dispose();
```

This will stop all sounds, dispose of all synthesizers, and clear the sound queue.