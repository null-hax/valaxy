import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the high score interface
interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

// Path to the high scores JSON file
const dataFilePath = path.join(process.cwd(), 'data', 'highscores.json');

// Ensure the data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Get high scores from the file
const getHighScores = (): HighScore[] => {
  ensureDataDir();
  
  if (!fs.existsSync(dataFilePath)) {
    // Default high scores if file doesn't exist
    const defaultScores: HighScore[] = [
      { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
      { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
      { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 }
    ];
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultScores, null, 2));
    return defaultScores;
  }
  
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading high scores:', error);
    return [];
  }
};

// Save high scores to the file
const saveHighScores = (scores: HighScore[]) => {
  ensureDataDir();
  
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(scores, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving high scores:', error);
    return false;
  }
};

// GET handler to retrieve high scores
export async function GET() {
  const highScores = getHighScores();
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
      allScores = getHighScores();
      
      // Add the new score
      allScores.push(newScore);
    }
    
    // Sort by score (highest first)
    allScores.sort((a, b) => b.score - a.score);
    
    // Keep only the top 10 scores
    allScores = allScores.slice(0, 10);
    
    // Save the updated scores
    if (saveHighScores(allScores)) {
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