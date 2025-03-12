// Script to check the Supabase high_scores table structure
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://hdcrrofrxznpcdqsunif.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseTable() {
  console.log('Checking Supabase high_scores table...');

  try {
    // Check if the table exists by trying to query it
    console.log('Testing SELECT operation...');
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error accessing table:', error);
      
      if (error.code === '42501') {
        console.error('\nRow Level Security (RLS) error detected!');
        console.error('You need to set up RLS policies for the high_scores table.');
        console.error('Please run the SQL in scripts/setup-supabase-policies.sql');
        console.error('Or follow the instructions in README-SUPABASE.md');
      } else if (error.message.includes('does not exist')) {
        console.error('\nTable does not exist!');
        console.error('You need to create the high_scores table in Supabase.');
        console.error('Suggested table structure:');
        console.error('- id: uuid (primary key, auto-generated)');
        console.error('- name: text (required)');
        console.error('- score: integer (required)');
        console.error('- date: timestamp with time zone (required)');
        console.error('- wave: integer (required)');
        console.error('- created_at: timestamp with time zone (default: now())');
      }
      return;
    }

    console.log('Table exists and is accessible.');
    console.log('Sample data:', data);
    
    // Check RLS policies
    console.log('\nChecking RLS policies...');
    
    // Test INSERT operation
    console.log('Testing INSERT operation...');
    const testScore = {
      id: crypto.randomUUID(),
      name: 'TEST',
      score: 1,
      date: new Date().toISOString(),
      wave: 1
    };
    
    const { error: insertError } = await supabase
      .from('high_scores')
      .insert(testScore);
    
    if (insertError) {
      console.error('INSERT operation failed:', insertError);
      
      if (insertError.code === '42501') {
        console.error('\nRow Level Security (RLS) error for INSERT!');
        console.error('You need to set up an INSERT policy for the high_scores table.');
        console.error('Please run the SQL in scripts/setup-supabase-policies.sql');
      }
    } else {
      console.log('INSERT operation succeeded.');
      
      // Test DELETE operation to clean up the test score
      console.log('Testing DELETE operation...');
      const { error: deleteError } = await supabase
        .from('high_scores')
        .delete()
        .eq('id', testScore.id);
      
      if (deleteError) {
        console.error('DELETE operation failed:', deleteError);
        
        if (deleteError.code === '42501') {
          console.error('\nRow Level Security (RLS) error for DELETE!');
          console.error('You need to set up a DELETE policy for the high_scores table.');
          console.error('Please run the SQL in scripts/setup-supabase-policies.sql');
        }
      } else {
        console.log('DELETE operation succeeded.');
      }
    }
    
    console.log('\nCheck complete!');
    
    // Summary
    if (!error && !insertError) {
      console.log('\n✅ Your Supabase setup appears to be working correctly!');
    } else {
      console.log('\n❌ There are issues with your Supabase setup.');
      console.log('Please fix the errors above and run this script again.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkSupabaseTable();