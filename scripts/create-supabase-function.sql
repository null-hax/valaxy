-- SQL script to create a stored procedure for inserting high scores

-- Create a function to insert a high score
CREATE OR REPLACE FUNCTION public.insert_high_score(
    p_name TEXT,
    p_score INTEGER,
    p_date TEXT,
    p_wave INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the creator
AS $$
DECLARE
    result JSONB;
    new_id UUID;
BEGIN
    -- Generate a new UUID for this score
    SELECT gen_random_uuid() INTO new_id;
    
    -- Insert the high score
    INSERT INTO public.high_scores (id, name, score, date, wave)
    VALUES (new_id, p_name, p_score, p_date::TIMESTAMPTZ, p_wave)
    RETURNING to_jsonb(high_scores.*) INTO result;
    
    -- Return the result
    RETURN result;
EXCEPTION
    WHEN unique_violation THEN
        -- If we get a unique violation, try again with a new UUID
        SELECT gen_random_uuid() INTO new_id;
        INSERT INTO public.high_scores (id, name, score, date, wave)
        VALUES (new_id, p_name, p_score, p_date::TIMESTAMPTZ, p_wave)
        RETURNING to_jsonb(high_scores.*) INTO result;
        RETURN result;
    WHEN OTHERS THEN
        -- Log any other errors
        RAISE NOTICE 'Error inserting high score: %', SQLERRM;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.insert_high_score TO anon;

-- Create a function to get high scores
CREATE OR REPLACE FUNCTION public.get_high_scores()
RETURNS SETOF public.high_scores
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.high_scores
    ORDER BY score DESC
    LIMIT 100;
$$;

-- Grant execute permission to the anon role
GRANT EXECUTE ON FUNCTION public.get_high_scores TO anon;

-- Instructions:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this SQL
-- 5. Run the query to create the functions
-- 6. These functions will bypass RLS and allow inserting and retrieving high scores