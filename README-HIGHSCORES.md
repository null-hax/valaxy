# High Scores Solution for Valaxy Arcade Game

## Problem

The original high scores implementation was trying to write to the file system (`/var/task/data/highscores.json`) in a serverless environment (Vercel), which has a read-only file system. This was causing the following error:

```
Error saving high scores: Error: EROFS: read-only file system, open '/var/task/data/highscores.json'
```

## Solution

The solution implements a serverless-friendly approach to storing high scores:

1. **In-memory cache**: The API now uses an in-memory cache to store high scores during the server's lifetime.
2. **Local storage**: The client-side game continues to use local storage as a reliable backup.
3. **Top 5 scores**: The implementation now only keeps the top 5 scores instead of 10, as requested.
4. **Improved error handling**: Better fallback mechanisms when the API is unavailable.

## How It Works

### Server-side (API)

- The `/api/highscores` API endpoint now uses an in-memory cache instead of writing to the file system.
- In a production environment, you should replace this with a proper database solution (see "Future Improvements" below).

### Client-side (Game)

- The game tries to save scores to the API first.
- If the API fails, it falls back to using local storage.
- When loading scores, it tries the API first, then local storage, then defaults.

## Future Improvements

For a more robust solution in production, consider implementing one of these options:

### 1. Vercel KV (Recommended)

Vercel KV is a Redis-compatible key-value store designed for Vercel serverless functions:

```typescript
// Example implementation with Vercel KV
import { kv } from '@vercel/kv';

const getHighScores = async (): Promise<HighScore[]> => {
  try {
    const scores = await kv.get('valaxy:highscores');
    return scores || defaultScores;
  } catch (error) {
    console.error('Error reading high scores from KV:', error);
    return defaultScores;
  }
};

const saveHighScores = async (scores: HighScore[]): Promise<boolean> => {
  try {
    const topScores = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
    
    await kv.set('valaxy:highscores', topScores);
    return true;
  } catch (error) {
    console.error('Error saving high scores to KV:', error);
    return false;
  }
};
```

### 2. MongoDB Atlas

For a more traditional database approach:

```typescript
// Example with MongoDB
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const getHighScores = async (): Promise<HighScore[]> => {
  try {
    await client.connect();
    const database = client.db('valaxy');
    const collection = database.collection('highscores');
    
    const scores = await collection.find().sort({ score: -1 }).limit(5).toArray();
    return scores;
  } catch (error) {
    console.error('Error reading high scores from MongoDB:', error);
    return defaultScores;
  } finally {
    await client.close();
  }
};
```

### 3. Environment Variables (Simple Solution)

For a very simple solution, you could use Vercel environment variables to store the high scores:

```typescript
// In your Vercel project settings, add an environment variable:
// VALAXY_HIGH_SCORES = '[{"name":"ACE","score":30000,"date":"...","wave":5},...]'

const getHighScores = async (): Promise<HighScore[]> => {
  try {
    const envScores = process.env.VALAXY_HIGH_SCORES;
    if (envScores) {
      return JSON.parse(envScores);
    }
    return defaultScores;
  } catch (error) {
    console.error('Error reading high scores:', error);
    return defaultScores;
  }
};
```

## Deployment Notes

When deploying to Vercel:

1. Make sure to set up any required environment variables.
2. If using Vercel KV or MongoDB, install the necessary dependencies.
3. Update the API implementation to use your chosen storage solution.

The current implementation will work on Vercel without any additional configuration, but the high scores will reset whenever the serverless function is redeployed or scaled.