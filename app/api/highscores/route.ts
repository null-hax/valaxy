import { NextRequest, NextResponse } from 'next/server';

// Define the high score interface
interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

// In-memory cache for high scores (will reset on server restart)
// This is a fallback for when we can't use persistent storage
let highScoresCache: HighScore[] = [
  { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
  { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
  { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 }
];

// Maximum number of high scores to keep
const MAX_HIGH_SCORES = 5;

// Get high scores
const getHighScores = async (): Promise<HighScore[]> => {
  try {
    // Try to get high scores from environment variable
    const envScores = process.env.VALAXY_HIGH_SCORES;
    if (envScores) {
      return JSON.parse(envScores);
    }
    
    // Return the in-memory cache as fallback
    return highScoresCache;
  } catch (error) {
    console.error('Error reading high scores:', error);
    return highScoresCache;
  }
};

// Save high scores
const saveHighScores = async (scores: HighScore[]): Promise<boolean> => {
  try {
    // Keep only the top MAX_HIGH_SCORES scores
    const topScores = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
    
    // Update the in-memory cache
    highScoresCache = topScores;
    
    // In a production environment, you would save to a database here
    // For example, using Vercel KV, MongoDB, etc.
    
    return true;
  } catch (error) {
    console.error('Error saving high scores:', error);
    return false;
  }
};

// GET handler to retrieve high scores
export async function GET() {
  const highScores = await getHighScores();
  return NextResponse.json(highScores);
}

// POST handler to add a new high score
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let newScore: HighScore;
    let allScores: HighScore[] = [];
    
    // Check if we're receiving a single score or an array of scores
    if (Array.isArray(data)) {
      // We received the entire high scores array
      allScores = data as HighScore[];
      
      // Validate all scores
      for (const score of allScores) {
        if (!score.name || typeof score.score !== 'number' || !score.date) {
          return NextResponse.json(
            { error: 'Invalid score data in array' },
            { status: 400 }
          );
        }
      }
    } else {
      // We received a single new score
      newScore = data as HighScore;
      
      // Validate the new score
      if (!newScore.name || typeof newScore.score !== 'number' || !newScore.date) {
        return NextResponse.json(
          { error: 'Invalid score data' },
          { status: 400 }
        );
      }
      
      // Get current high scores
      allScores = await getHighScores();
      
      // Add the new score
      allScores.push(newScore);
    }
    
    // Sort by score (highest first)
    allScores.sort((a, b) => b.score - a.score);
    
    // Keep only the top MAX_HIGH_SCORES scores
    allScores = allScores.slice(0, MAX_HIGH_SCORES);
    
    // Save the updated scores
    const saveResult = await saveHighScores(allScores);
    if (saveResult) {
      return NextResponse.json(allScores);
    } else {
      return NextResponse.json(
        { error: 'Failed to save high scores' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing high score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}