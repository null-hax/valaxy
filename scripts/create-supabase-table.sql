-- SQL script to create the high_scores table in Supabase

-- Create the high_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.high_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    wave INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comment to the table
COMMENT ON TABLE public.high_scores IS 'Stores high scores for the Valaxy Arcade game';

-- Add comments to columns
COMMENT ON COLUMN public.high_scores.id IS 'Unique identifier for the high score entry';
COMMENT ON COLUMN public.high_scores.name IS 'Player name (3 letters)';
COMMENT ON COLUMN public.high_scores.score IS 'Player score';
COMMENT ON COLUMN public.high_scores.date IS 'Date and time when the score was achieved';
COMMENT ON COLUMN public.high_scores.wave IS 'Wave number reached';
COMMENT ON COLUMN public.high_scores.created_at IS 'Timestamp when the record was created';

-- Enable Row Level Security
ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;

-- Instructions:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this SQL
-- 5. Run the query to create the table
-- 6. After creating the table, run the SQL in setup-supabase-policies.sql to add RLS policies