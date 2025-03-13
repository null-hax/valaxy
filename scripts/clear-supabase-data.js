// Script to clear all high scores from the Supabase database
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = 'https://hdcrrofrxznpcdqsunif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss';
const supabase = createClient(supabaseUrl, supabaseKey);

// Default high scores to insert after clearing
const defaultHighScores = [
  { name: 'HAX', score: 94900, date: new Date().toISOString(), wave: 14 },
  { name: 'AAA', score: 63950, date: new Date().toISOString(), wave: 10 },
  { name: 'HAX', score: 63950, date: new Date().toISOString(), wave: 10 }
];

async function clearHighScores() {
  console.log('Clearing all high scores from Supabase...');
  
  try {
    // First, check if we can access the database
    const { data: testData, error: testError } = await supabase
      .from('high_scores')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('Error connecting to Supabase:', testError);
      return;
    }
    
    console.log('Successfully connected to Supabase');
    
    // Try using the RPC function first
    try {
      console.log('Attempting to clear high scores using SQL...');
      
      // Execute a raw SQL query to truncate the table
      const { error: sqlError } = await supabase.rpc('truncate_high_scores');
      
      if (!sqlError) {
        console.log('Successfully cleared high scores using SQL');
      } else {
        console.error('Error clearing high scores using SQL:', sqlError);
        
        // Fall back to delete operation
        console.log('Falling back to delete operation...');
        const { error } = await supabase
          .from('high_scores')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (error) {
          console.error('Error clearing high scores:', error);
          return;
        }
        
        console.log('Successfully cleared all high scores from the database.');
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
      
      // Fall back to delete operation
      console.log('Falling back to delete operation...');
      const { error } = await supabase
        .from('high_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.error('Error clearing high scores:', error);
        return;
      }
      
      console.log('Successfully cleared all high scores from the database.');
    }
    
    // Insert default high scores
    console.log('Inserting default high scores...');
    
    for (const score of defaultHighScores) {
      try {
        // Try using the stored procedure first
        const { error: rpcError } = await supabase.rpc(
          'insert_high_score',
          {
            p_name: score.name,
            p_score: score.score,
            p_date: score.date,
            p_wave: score.wave
          }
        );
        
        if (!rpcError) {
          console.log(`Successfully inserted score for ${score.name}: ${score.score} via RPC`);
          continue; // Skip to next score
        }
        
        // Fall back to direct insert
        const { error: insertError } = await supabase
          .from('high_scores')
          .insert([
            {
              id: crypto.randomUUID(),
              name: score.name,
              score: score.score,
              date: score.date,
              wave: score.wave
            }
          ]);
        
        if (insertError) {
          console.error(`Error inserting score for ${score.name}:`, insertError);
        } else {
          console.log(`Successfully inserted score for ${score.name}: ${score.score} via direct insert`);
        }
      } catch (error) {
        console.error(`Error processing score for ${score.name}:`, error);
      }
    }
    
    // Verify the scores were inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false });
    
    if (verifyError) {
      console.error('Error verifying high scores:', verifyError);
    } else {
      console.log(`Verification: ${verifyData.length} high scores in database:`);
      verifyData.forEach(score => {
        console.log(`- ${score.name}: ${score.score} (Wave ${score.wave})`);
      });
    }
    
    console.log('High score reset complete.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
clearHighScores();