// Script to set up the Supabase high_scores table
const { createClient } = require('@supabase/supabase-js');

console.log('Starting Supabase setup script...');

// Initialize Supabase client
const supabaseUrl = 'https://hdcrrofrxznpcdqsunif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss';

console.log(`Connecting to Supabase at ${supabaseUrl}...`);
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase client created.');

// Default high scores
const defaultHighScores = [
  { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
  { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
  { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 },
  { name: 'ZOE', score: 5000, date: new Date().toISOString(), wave: 1 },
  { name: 'DAN', score: 2500, date: new Date().toISOString(), wave: 1 }
];

async function setupSupabase() {
  console.log('Setting up Supabase high_scores table...');

  try {
    console.log('Checking if high_scores table exists...');
    // Check if the table exists by trying to query it
    const { error: queryError } = await supabase
      .from('high_scores')
      .select('count')
      .limit(1);

    if (queryError) {
      console.log('Table check result: Error occurred');
      console.log('Error details:', queryError);
      console.log('Table does not exist or cannot be accessed.');
      
      // Instructions for manual table creation
      console.log('\n=== MANUAL TABLE CREATION REQUIRED ===');
      console.log('Please create the high_scores table in the Supabase dashboard with the following structure:');
      console.log('- id: uuid (primary key, auto-generated)');
      console.log('- name: text (required)');
      console.log('- score: integer (required)');
      console.log('- date: timestamp with time zone (required)');
      console.log('- wave: integer (required)');
      console.log('- created_at: timestamp with time zone (default: now())');
      console.log('\nAfter creating the table, run this script again to insert default high scores.');
      console.log('=== END OF INSTRUCTIONS ===\n');
    } else {
      console.log('Table check result: Success - table exists');
      console.log('Checking for existing data...');
      
      // Check if there's any data
      const { data, error } = await supabase
        .from('high_scores')
        .select('*');
      
      if (error) {
        console.error('Error checking for data:', error);
        return;
      }
      
      console.log(`Data check result: Found ${data ? data.length : 0} records`);
      
      if (!data || data.length === 0) {
        console.log('No data found. Inserting default high scores...');
        
        // Insert default high scores
        const { error: insertError, data: insertData } = await supabase
          .from('high_scores')
          .insert(defaultHighScores)
          .select();
        
        if (insertError) {
          console.error('Error inserting default high scores:', insertError);
        } else {
          console.log(`Successfully inserted ${defaultHighScores.length} default high scores!`);
          console.log('Insert response:', insertData);
        }
      } else {
        console.log(`Found ${data.length} existing high scores. No need to insert defaults.`);
      }
    }
    
    console.log('Setup process completed!');
  } catch (error) {
    console.error('Unexpected error setting up Supabase:', error);
  }
}

// Run the setup
setupSupabase();