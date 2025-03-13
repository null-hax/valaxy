-- SQL script to create a stored procedure for truncating the high_scores table

-- Create a function to truncate the high_scores table
CREATE OR REPLACE FUNCTION public.truncate_high_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the creator
AS $$
BEGIN
    -- Truncate the high_scores table
    TRUNCATE TABLE public.high_scores;
    
    -- Return success
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors
        RAISE NOTICE 'Error truncating high_scores table: %', SQLERRM;
        RAISE;
END;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.truncate_high_scores TO anon;

-- Instructions:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this SQL
-- 5. Run the query to create the function
-- 6. This function will bypass RLS and allow truncating the high_scores table