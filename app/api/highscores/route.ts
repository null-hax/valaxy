import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define the high score interface
interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

// Maximum number of high scores to keep
const MAX_HIGH_SCORES = 100; // Store top 100 scores in the database
const DISPLAY_HIGH_SCORES = 5; // Display top 5 scores in the UI

// Default high scores in case of errors
const defaultHighScores: HighScore[] = [
  { name: 'HAX', score: 94900, date: new Date().toISOString(), wave: 14 },
  { name: 'AAA', score: 63950, date: new Date().toISOString(), wave: 10 },
  { name: 'HAX', score: 63950, date: new Date().toISOString(), wave: 10 },
  { name: '---', score: 0, date: new Date().toISOString(), wave: 0 },
  { name: '---', score: 0, date: new Date().toISOString(), wave: 0 }
];

// Initialize Supabase client
const supabaseUrl = 'https://hdcrrofrxznpcdqsunif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to remove duplicate scores
function removeDuplicateScores(scores: HighScore[]): HighScore[] {
  const uniqueScores: HighScore[] = [];
  const seen = new Set<string>();
  
  // First sort by score (highest first) and date (newest first)
  const sortedScores = [...scores].sort((a, b) => {
    // First compare by score (highest first)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // If scores are equal, compare by date (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  for (const score of sortedScores) {
    // Skip placeholder scores (with name "---" or score 0)
    if (score.name === '---' || score.score === 0) {
      continue;
    }
    
    // Create a unique key for this score based on name and score
    const key = `${score.name}-${score.score}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueScores.push(score);
    } else {
      // If we've seen this name-score combination before, check if this one has a higher wave
      const existingIndex = uniqueScores.findIndex(s =>
        s.name === score.name && s.score === score.score
      );
      
      if (existingIndex >= 0 && score.wave > uniqueScores[existingIndex].wave) {
        // Replace with the higher wave version
        uniqueScores[existingIndex] = score;
      }
    }
  }
  
  // Re-sort by score before returning
  const result = uniqueScores.sort((a, b) => b.score - a.score);
  
  // Ensure we have exactly DISPLAY_HIGH_SCORES entries
  while (result.length < DISPLAY_HIGH_SCORES) {
    result.push({ name: '---', score: 0, date: new Date().toISOString(), wave: 0 });
  }
  
  return result.slice(0, DISPLAY_HIGH_SCORES);
}

// GET handler to retrieve high scores
export async function GET() {
  try {
    console.log('Fetching high scores from Supabase...');
    
    // Try to use the stored procedure first
    try {
      const { data, error } = await supabase.rpc('get_high_scores');
      
      if (!error && data && data.length > 0) {
        console.log('Successfully retrieved high scores using stored procedure');
        
        // Process scores and ensure we have exactly DISPLAY_HIGH_SCORES entries
        const topScores = removeDuplicateScores(data as HighScore[]);
        console.log(`Returning ${topScores.length} high scores from stored procedure`);
        
        return NextResponse.json(topScores);
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
    }
    
    // Fall back to direct table access
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(MAX_HIGH_SCORES);
    
    if (error) {
      console.error('Error fetching high scores from Supabase:', error);
      return NextResponse.json(defaultHighScores);
    }
    
    if (!data || data.length === 0) {
      console.log('No scores found, returning default scores');
      return NextResponse.json(defaultHighScores);
    }
    
    // Process scores and ensure we have exactly DISPLAY_HIGH_SCORES entries
    const topScores = removeDuplicateScores(data as HighScore[]);
    console.log(`Returning ${topScores.length} high scores from direct table access`);
    
    return NextResponse.json(topScores);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      defaultHighScores,
      { status: 200 }
    );
  }
}

// POST handler to add a new high score
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let newScores: HighScore[] = [];
    
    // Check if we're receiving a single score or an array of scores
    if (Array.isArray(data)) {
      newScores = data as HighScore[];
    } else {
      newScores = [data as HighScore];
    }
    
    // Validate all scores
    for (const score of newScores) {
      if (!score.name || typeof score.score !== 'number' || !score.date) {
        return NextResponse.json(
          { error: 'Invalid score data' },
          { status: 400 }
        );
      }
    }
    
    // First, get existing scores to check for duplicates
    let existingScores: HighScore[] = [];
    
    try {
      const { data: existingData, error: existingError } = await supabase.rpc('get_high_scores');
      if (!existingError && existingData) {
        existingScores = existingData as HighScore[];
      }
    } catch (rpcError) {
      console.error('RPC error when fetching existing scores:', rpcError);
      
      // Fall back to direct query
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('high_scores')
          .select('*')
          .order('score', { ascending: false })
          .limit(MAX_HIGH_SCORES);
        
        if (!fallbackError && fallbackData) {
          existingScores = fallbackData as HighScore[];
        }
      } catch (fallbackError) {
        console.error('Error fetching existing scores:', fallbackError);
      }
    }
    
    // Filter out scores that are already in the database with the same name and score
    // Also filter out placeholder scores
    const uniqueNewScores = newScores.filter(newScore => {
      // Skip placeholder scores
      if (newScore.name === '---' || newScore.score === 0) {
        return false;
      }
      
      // Skip scores that already exist in the database
      return !existingScores.some(existingScore =>
        existingScore.name === newScore.name &&
        existingScore.score === newScore.score
      );
    });
    
    console.log(`Processing ${uniqueNewScores.length} unique new scores out of ${newScores.length} total`);
    
    // Process each unique new score
    for (const score of uniqueNewScores) {
      console.log(`Inserting score for ${score.name}: ${score.score} (Wave ${score.wave})`);
      
      // Try using the stored procedure first
      try {
        const { error: sqlError } = await supabase.rpc(
          'insert_high_score',
          {
            p_name: score.name,
            p_score: score.score,
            p_date: score.date,
            p_wave: score.wave || 1 // Default to wave 1 if not provided
          }
        );
        
        if (!sqlError) {
          console.log('Score inserted successfully via RPC');
          continue; // Skip to next score if this succeeded
        } else {
          console.error('RPC error when inserting score:', sqlError);
        }
      } catch (rpcError) {
        console.error('RPC error:', rpcError);
      }
      
      // Fall back to direct insert if RPC failed
      try {
        const { error: insertError } = await supabase
          .from('high_scores')
          .insert([
            {
              id: crypto.randomUUID(), // Generate a unique ID
              name: score.name,
              score: score.score,
              date: score.date,
              wave: score.wave || 1
            }
          ]);
        
        if (insertError) {
          console.error('Direct insert error:', insertError);
        } else {
          console.log('Score inserted successfully via direct insert');
        }
      } catch (insertError) {
        console.error('Error executing insert operations:', insertError);
      }
    }
    
    // Get updated high scores
    let highScores: HighScore[] = [];
    
    try {
      // Try stored procedure first
      const { data, error } = await supabase.rpc('get_high_scores');
      if (!error && data) {
        highScores = data as HighScore[];
        console.log(`Retrieved ${highScores.length} scores from stored procedure after insert`);
      } else {
        console.error('Error fetching updated scores from RPC:', error);
        
        // Fall back to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('high_scores')
          .select('*')
          .order('score', { ascending: false })
          .limit(MAX_HIGH_SCORES);
        
        if (!fallbackError && fallbackData) {
          highScores = fallbackData as HighScore[];
          console.log(`Retrieved ${highScores.length} scores from direct query after insert`);
        } else {
          console.error('Error fetching updated scores from direct query:', fallbackError);
        }
      }
    } catch (getError) {
      console.error('Error getting updated scores:', getError);
    }
    
    // Combine with new scores to ensure they're included (in case database insert failed)
    const combinedScores = [...highScores, ...newScores];
    
    // Process scores and ensure we have exactly DISPLAY_HIGH_SCORES entries
    const topScores = removeDuplicateScores(combinedScores);
    console.log(`Returning ${topScores.length} high scores after processing`);
    
    return NextResponse.json(topScores);
  } catch (error) {
    console.error('Error processing high score:', error);
    return NextResponse.json(
      defaultHighScores,
      { status: 200 }
    );
  }
}