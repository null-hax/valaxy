import { NextRequest, NextResponse } from 'next/server';
import { createClient, PostgrestError } from '@supabase/supabase-js';

// Define the high score interface
interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

// Maximum number of high scores to keep
const MAX_HIGH_SCORES = 100; // Store top 100 scores as requested

// Default high scores in case of errors
const defaultHighScores: HighScore[] = [
  { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
  { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
  { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 }
];

// In-memory cache for high scores as a fallback
let highScoresCache: HighScore[] = [...defaultHighScores];

// Initialize Supabase client
const supabaseUrl = 'https://hdcrrofrxznpcdqsunif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss';
const supabase = createClient(supabaseUrl, supabaseKey);

// Get high scores from Supabase
const getHighScores = async (): Promise<HighScore[]> => {
  try {
    // Try to use the stored procedure first
    try {
      console.log('Attempting to use get_high_scores stored procedure...');
      const { data, error } = await supabase.rpc('get_high_scores');
      
      if (!error && data) {
        console.log('Successfully retrieved high scores using stored procedure');
        // Remove duplicates and update the in-memory cache with the latest data
        const uniqueScores = removeDuplicateScores(data as HighScore[]);
        highScoresCache = uniqueScores;
        return uniqueScores;
      } else if (error) {
        console.error('Error using stored procedure:', error);
        // Fall through to try direct table access
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
      // Fall through to try direct table access
    }
    
    // Fall back to direct table access
    console.log('Falling back to direct table access...');
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(MAX_HIGH_SCORES);
    
    if (error) {
      // Check if it's a Row Level Security error
      const errorObj = error as any;
      if (errorObj.code === '42501') {
        console.error('Row Level Security error. Please enable appropriate RLS policies in Supabase.');
        console.error('Using in-memory cache as fallback.');
        return highScoresCache;
      }
      
      console.error('Error fetching high scores from Supabase:', error);
      return highScoresCache;
    }
    
    if (!data || data.length === 0) {
      // If no scores in the database, try to initialize with default scores
      try {
        await initializeDefaultScores();
      } catch (initError) {
        console.error('Failed to initialize default scores:', initError);
      }
      return highScoresCache;
    }
    
    // Remove duplicates and update the in-memory cache with the latest data
    const uniqueScores = removeDuplicateScores(data as HighScore[]);
    highScoresCache = uniqueScores;
    return uniqueScores;
  } catch (error) {
    console.error('Error reading high scores:', error);
    return highScoresCache;
  }
};

// Initialize the database with default scores ONLY if empty
const initializeDefaultScores = async (): Promise<void> => {
  try {
    // First check if there are any scores in the database
    const { data: existingScores, error: checkError } = await supabase
      .from('high_scores')
      .select('count');
    
    if (checkError) {
      console.error('Error checking for existing scores:', checkError);
      return;
    }
    
    // Only add default scores if the database is completely empty
    if (!existingScores || existingScores.length === 0 || existingScores[0].count === 0) {
      console.log('Database is empty, adding default scores');
      
      // Add unique IDs to default high scores
      const defaultScoresWithIds = defaultHighScores.map(score => ({
        id: crypto.randomUUID(),
        ...score
      }));
      
      // Use insert instead of upsert to avoid duplicating default scores
      const { error } = await supabase
        .from('high_scores')
        .insert(defaultScoresWithIds);
    
      if (error) {
        // Cast error to any to access properties without TypeScript errors
        const errorObj = error as any;
        // Check if it's a Row Level Security error
        if (errorObj.code === '42501') {
          console.error('Row Level Security error when initializing default scores.');
          console.error('Please enable appropriate RLS policies in Supabase or use the in-memory cache.');
        } else if (errorObj.code === '23505') {
          console.error('Unique constraint violation when initializing default scores:', errorObj.message);
        } else {
          console.error('Error initializing default high scores:', error);
        }
      } else {
        console.log('Default high scores initialized in Supabase');
      }
    }
  } catch (error) {
    console.error('Error initializing default high scores:', error);
  }
};

// Save high scores to Supabase
const saveHighScores = async (scores: HighScore[]): Promise<boolean> => {
  try {
    // Keep only the top MAX_HIGH_SCORES scores
    const topScores = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
    
    // Update in-memory cache with top 5 scores
    highScoresCache = topScores.slice(0, 5);
    
    try {
      // Get existing scores to determine which ones to insert
      const { data: existingScores, error: fetchError } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false });
      
      if (fetchError) {
        // Cast error to any to access properties without TypeScript errors
        const errorObj = fetchError as any;
        // Check if it's a Row Level Security error
        if (errorObj.code === '42501') {
          console.error('Row Level Security error when fetching scores.');
          console.error('Using in-memory cache as fallback.');
          return true; // Return true since we updated the in-memory cache
        }
        
        console.error('Error fetching existing scores:', fetchError);
        return true; // Return true since we updated the in-memory cache
      }
      
      // If we have new scores to add
      if (topScores.length > 0) {
        // Use upsert instead of insert to handle potential duplicate keys
        const { error: insertError } = await supabase
          .from('high_scores')
          .upsert(
            topScores.map(score => ({
              // Add a unique ID for each score if not already present
              id: crypto.randomUUID(),
              ...score
            })),
            { onConflict: 'id' } // Specify the column that might conflict
          );
        
        if (insertError) {
          // Cast error to any to access properties without TypeScript errors
          const errorObj = insertError as any;
          
          // Check if it's a Row Level Security error
          if (errorObj.code === '42501') {
            console.error('Row Level Security error when inserting scores.');
            console.error('Please enable appropriate RLS policies in Supabase.');
            console.error('Using in-memory cache as fallback.');
            return true; // Return true since we updated the in-memory cache
          }
          
          // Check if it's a unique constraint error
          if (errorObj.code === '23505') {
            console.error('Unique constraint violation:', errorObj.message);
            console.error('Using in-memory cache as fallback.');
            return true; // Return true since we updated the in-memory cache
          }
          
          console.error('Error saving high scores to Supabase:', insertError);
          return true; // Return true since we updated the in-memory cache
        }
        
        // If we now have more than MAX_HIGH_SCORES, delete the lowest scores
        if ((existingScores?.length || 0) + topScores.length > MAX_HIGH_SCORES) {
          // Get all scores again after insertion
          const { data: allScores, error: getAllError } = await supabase
            .from('high_scores')
            .select('*')
            .order('score', { ascending: false });
          
          if (getAllError || !allScores) {
            console.error('Error getting all scores after insertion:', getAllError);
            return true; // We did insert successfully, so return true
          }
          
          if (allScores.length > MAX_HIGH_SCORES) {
            // Get the IDs of scores to delete (the ones beyond MAX_HIGH_SCORES)
            const scoresToDelete = allScores.slice(MAX_HIGH_SCORES);
            const idsToDelete = scoresToDelete.map(score => score.id).filter(Boolean);
            
            if (idsToDelete.length > 0) {
              const { error: deleteError } = await supabase
                .from('high_scores')
                .delete()
                .in('id', idsToDelete);
              
              if (deleteError) {
                console.error('Error pruning excess high scores:', deleteError);
              }
            }
          }
        }
        
        console.log('High scores saved to Supabase');
      }
      
      return true;
    } catch (supabaseError) {
      console.error('Supabase operation failed:', supabaseError);
      return true; // Return true since we updated the in-memory cache
    }
  } catch (error) {
    console.error('Error saving high scores:', error);
    return false;
  }
};

// GET handler to retrieve high scores
export async function GET() {
  try {
    // Get all high scores from Supabase
    const highScores = await getHighScores();
    
    // Remove any duplicates
    const uniqueScores = removeDuplicateScores(highScores);
    
    // Sort by score and return only the top 5 for display in the game
    // (We store 100 in the database but only show 5 in the UI)
    const topFiveScores = uniqueScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
      
    return NextResponse.json(topFiveScores);
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve high scores' },
      { status: 500 }
    );
  }
}

// Helper function to remove duplicate scores
function removeDuplicateScores(scores: HighScore[]): HighScore[] {
  const uniqueScores: HighScore[] = [];
  const seen = new Set<string>();
  
  for (const score of scores) {
    // Create a unique key for this score
    const key = `${score.name}-${score.score}-${score.wave}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueScores.push(score);
    }
  }
  
  return uniqueScores;
}

// POST handler to add a new high score
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let newScores: HighScore[] = [];
    
    // Check if we're receiving a single score or an array of scores
    if (Array.isArray(data)) {
      // We received the entire high scores array
      newScores = data as HighScore[];
      
      // Validate all scores
      for (const score of newScores) {
        if (!score.name || typeof score.score !== 'number' || !score.date) {
          return NextResponse.json(
            { error: 'Invalid score data in array' },
            { status: 400 }
          );
        }
      }
    } else {
      // We received a single new score
      const newScore = data as HighScore;
      
      // Validate the new score
      if (!newScore.name || typeof newScore.score !== 'number' || !newScore.date) {
        return NextResponse.json(
          { error: 'Invalid score data' },
          { status: 400 }
        );
      }
      
      // Add to new scores array
      newScores.push(newScore);
    }
    
    // Combine with existing scores and remove duplicates
    const combinedScores = [...highScoresCache, ...newScores];
    const uniqueScores = removeDuplicateScores(combinedScores);
    
    // Update in-memory cache with the new scores
    highScoresCache = uniqueScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Keep top 5 in memory
    
    try {
      // First, check if there are existing scores to avoid primary key conflicts
      const { data: existingScores } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false });
      
      // Log debugging information
      console.log('Debugging Supabase connection...');
      
      // Log the data we're trying to insert
      const scoresToInsert = newScores.map(score => ({
        // Add a unique ID for each score if not already present
        id: crypto.randomUUID(),
        ...score
      }));
      console.log('Attempting to insert scores:', JSON.stringify(scoresToInsert));
      
      // Try a simpler operation first - just select
      console.log('Testing SELECT operation...');
      const { error: selectError } = await supabase
        .from('high_scores')
        .select('count');
      
      if (selectError) {
        console.error('SELECT operation failed:', selectError);
      } else {
        console.log('SELECT operation succeeded');
      }
      
      // Try using the stored procedure first
      console.log('Attempting to use insert_high_score stored procedure directly...');
      
      // Log the actual scores being submitted
      console.log('Submitting high scores:', JSON.stringify(newScores, null, 2));
      
      // Process each new score
      const insertResults = [];
      let allSucceeded = true;
      
      for (const score of newScores) {
        try {
          // Ensure we're using the actual player's score data
          console.log(`Inserting score for ${score.name}: ${score.score} (Wave ${score.wave})`);
          
          // Generate a unique ID for this score to avoid conflicts
          const scoreId = crypto.randomUUID();
          
          // Try direct insert first (more reliable than RPC)
          const { data: insertData, error: insertError } = await supabase
            .from('high_scores')
            .insert([
              {
                id: scoreId,
                name: score.name,
                score: score.score,
                date: score.date,
                wave: score.wave || 1
              }
            ])
            .select();
          
          if (insertError) {
            console.error('Direct insert error:', insertError);
            // Cast error to any to access properties without TypeScript errors
            const errorObj = insertError as any;
            if (errorObj.code) console.error('Error code:', errorObj.code);
            if (errorObj.message) console.error('Error message:', errorObj.message);
            
            // Fall back to RPC if direct insert fails
            console.log('Falling back to RPC...');
            const { data: sqlData, error: sqlError } = await supabase.rpc(
              'insert_high_score',
              {
                p_name: score.name,
                p_score: score.score,
                p_date: score.date,
                p_wave: score.wave || 1 // Default to wave 1 if not provided
              }
            );
            
            if (sqlError) {
              console.error('Stored procedure error:', sqlError);
              // Cast error to any to access properties without TypeScript errors
              const errorObj = sqlError as any;
              if (errorObj.code) console.error('Error code:', errorObj.code);
              if (errorObj.message) console.error('Error message:', errorObj.message);
              allSucceeded = false;
            } else {
              console.log('Score inserted successfully via RPC:', sqlData);
              insertResults.push(sqlData);
            }
          } else {
            console.log('Score inserted successfully via direct insert:', insertData);
            if (insertData && insertData.length > 0) {
              insertResults.push(insertData[0]);
            }
          }
        } catch (insertError) {
          console.error('Error executing insert operations:', insertError);
          allSucceeded = false;
        }
      }
      
      // If any insert operations succeeded, return success with the actual inserted scores
      if (insertResults.length > 0) {
        console.log('Some scores inserted successfully:', insertResults);
        
        // Create a combined list of scores from the cache and the newly inserted scores
        const combinedScores = [...highScoresCache];
        
        // Add the successfully inserted scores to the combined list
        for (const result of insertResults) {
          // Only add if not already in the list
          if (!combinedScores.some(s => s.name === result.name && s.score === result.score)) {
            combinedScores.push({
              name: result.name,
              score: result.score,
              date: result.date,
              wave: result.wave
            });
          }
        }
        
        // Sort and limit to top 5 for the cache
        highScoresCache = combinedScores
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        console.log('Updated high scores cache:', highScoresCache);
        return NextResponse.json(highScoresCache);
      }
      
      // If stored procedure failed, try direct table access
      console.log('Falling back to direct table access...');
      const { error } = await supabase
        .from('high_scores')
        .insert(scoresToInsert);
      
      // If insert fails, log detailed error information
      if (error) {
        console.error('INSERT operation failed:', error);
        
        // Cast error to any to access properties without TypeScript errors
        const errorObj = error as any;
        
        // Check if it's a Row Level Security error
        if (errorObj.code === '42501') {
          console.error('Row Level Security error when inserting scores in POST handler.');
          console.error('Please enable appropriate RLS policies in Supabase.');
          console.error('Using in-memory cache as fallback.');
        }
        // Check if it's a unique constraint error
        else if (errorObj.code === '23505') {
          console.error('Unique constraint violation:', errorObj.message);
          console.error('Using in-memory cache as fallback.');
        }
        // Log other error details if available
        else {
          if (errorObj.details) console.error('Error details:', errorObj.details);
          if (errorObj.message) console.error('Error message:', errorObj.message);
        }
        
        // Return the in-memory cache as fallback
        console.log('Using in-memory cache as fallback');
        return NextResponse.json(highScoresCache);
      }
    } catch (insertError) {
      console.error('Error during insert operation:', insertError);
      // Return the in-memory cache as fallback
      return NextResponse.json(highScoresCache);
    }
    
    try {
      // Get updated high scores
      const updatedScores = await getHighScores();
      
      // Make sure the player's new score is included in the response
      let combinedScores = [...updatedScores];
      
      // Check if any of the new scores are missing from the updated scores
      for (const newScore of newScores) {
        // Check if this score is already in the combined scores
        const scoreExists = combinedScores.some(
          s => s.name === newScore.name && s.score === newScore.score && s.wave === newScore.wave
        );
        
        // If not, add it
        if (!scoreExists) {
          console.log(`Adding missing score: ${newScore.name} - ${newScore.score}`);
          combinedScores.push(newScore);
        }
      }
      
      // Remove duplicates, sort and limit to top 5 for the response
      const uniqueScores = removeDuplicateScores(combinedScores);
      const topScores = uniqueScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      // Update the in-memory cache
      highScoresCache = topScores;
      
      console.log('Final high scores response:', topScores);
      return NextResponse.json(topScores);
    } catch (getError) {
      console.error('Error getting updated scores:', getError);
      // Return the in-memory cache as fallback, making sure it includes the new scores
      const combinedScores = [...highScoresCache, ...newScores];
      const uniqueScores = removeDuplicateScores(combinedScores);
      const finalScores = uniqueScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      return NextResponse.json(finalScores);
    }
  } catch (error) {
    console.error('Error processing high score:', error);
    // Return the in-memory cache as fallback even for general errors
    return NextResponse.json(highScoresCache);
  }
}