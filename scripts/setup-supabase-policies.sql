-- Complete set of RLS policies for high_scores table

-- 1. Allow public read access (SELECT)
CREATE POLICY "Allow public read access"
ON public.high_scores
FOR SELECT
USING (true);

-- 2. Allow public insert access (INSERT)
CREATE POLICY "Allow public insert access"
ON public.high_scores
FOR INSERT
WITH CHECK (true);

-- 3. Allow public update access (UPDATE)
CREATE POLICY "Allow public update access"
ON public.high_scores
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4. Allow public delete access (DELETE)
CREATE POLICY "Allow public delete access"
ON public.high_scores
FOR DELETE
USING (true);

-- Instructions:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste all of the above SQL
-- 5. Run the query to create all policies at once
-- 6. Alternatively, you can create each policy individually through the UI:
--    - Go to Authentication > Policies
--    - Select the high_scores table
--    - Click "New Policy" for each operation type (SELECT, INSERT, UPDATE, DELETE)
--    - Set the policy to "Permissive" and the using expression to "true"