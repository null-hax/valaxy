# Supabase Integration for Valaxy Arcade High Scores

This document explains how the Valaxy Arcade game uses Supabase for persistent high score storage.

## Overview

The game now uses Supabase as a backend database to store high scores. This provides a reliable, persistent storage solution that works across all deployments.

Key features:
- Stores the top 100 high scores in the database
- Displays the top 5 scores in the game UI
- Automatically syncs scores between all players
- Fallback to local storage if the Supabase connection fails

## Implementation Details

### Database Structure

The high scores are stored in a Supabase table called `high_scores` with the following structure:

- `id`: UUID (primary key, auto-generated)
- `name`: Text (player's 3-letter name)
- `score`: Integer (player's score)
- `date`: Timestamp (when the score was achieved)
- `wave`: Integer (the wave number reached)
- `created_at`: Timestamp (when the record was created, auto-generated)

### API Integration

The game communicates with Supabase through the `/api/highscores` API endpoint:

- `GET /api/highscores`: Retrieves the top 5 high scores for display
- `POST /api/highscores`: Submits a new high score to the database

### Client-Side Integration

The game client attempts to save scores to the API first, then falls back to local storage if the API is unavailable. When loading scores, it tries the API first, then local storage, then defaults.

## Setup Instructions

### 1. Supabase Project Configuration

The Supabase project is already configured with the following details:
- Project URL: `https://hdcrrofrxznpcdqsunif.supabase.co`
- Anon public API key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkY3Jyb2ZyeHpucGNkcXN1bmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NjM5MzUsImV4cCI6MjA1NzMzOTkzNX0.bgSLkXBbSYFea0aUxnQl1VJ19mUUZRsO1wbylJ2Ajss`

### 2. Database Setup

#### Creating the Table

First, you need to create the `high_scores` table in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the contents of `scripts/create-supabase-table.sql`
5. Run the query to create the table

```bash
# View the SQL script
cat scripts/create-supabase-table.sql

# Or open it in your editor
code scripts/create-supabase-table.sql
```

#### Initializing Default High Scores

After creating the table, initialize it with default high scores:

```bash
npm run setup-supabase
```

This script will:
1. Check if the `high_scores` table exists
2. Insert default high scores if the table is empty

### 3. Database Access Methods

There are two ways to access the high scores database in Supabase:

#### Option A: Row Level Security (RLS) Policies

Supabase requires Row Level Security (RLS) policies to be set up for each table. These policies determine who can perform various operations on the data.

For the high scores table, you need to set up the following policies:

1. **SELECT Policy** - Allows reading high scores
2. **INSERT Policy** - Allows adding new high scores
3. **UPDATE Policy** - Allows updating existing high scores
4. **DELETE Policy** - Allows deleting high scores

We've provided a SQL script to help you set up these policies:

```bash
# View the SQL script
cat scripts/setup-supabase-policies.sql

# Or open it in your editor
code scripts/setup-supabase-policies.sql
```

To apply these policies:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the contents of `scripts/setup-supabase-policies.sql`
5. Run the query to create all policies at once

Alternatively, you can create each policy individually through the UI:
- Go to Authentication > Policies
- Select the high_scores table
- Click "New Policy" for each operation type (SELECT, INSERT, UPDATE, DELETE)
- Set the policy to "Permissive" and the using expression to "true"

#### Option B: Stored Procedures (Recommended)

If you're having issues with RLS policies, you can use stored procedures instead. These procedures bypass RLS and provide a more reliable way to access the database.

We've provided a SQL script to create these procedures:

```bash
# View the SQL script
cat scripts/create-supabase-function.sql

# Or open it in your editor
code scripts/create-supabase-function.sql
```

To create these procedures:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the contents of `scripts/create-supabase-function.sql`
5. Run the query to create the procedures

The API will automatically try to use these procedures first, and fall back to direct table access if they're not available.

**Important**: Without either RLS policies or stored procedures, operations on the high_scores table will fail, and the system will fall back to using the in-memory cache.

### 4. Verify Your Setup

To check if your Supabase setup is working correctly, run:

```bash
npm run check-supabase
```

This script will:
1. Check if the high_scores table exists and is accessible
2. Test the RLS policies by performing INSERT and DELETE operations
3. Provide detailed error messages and instructions if any issues are found

If everything is set up correctly, you should see:
```
✅ Your Supabase setup appears to be working correctly!
```

If there are issues, the script will provide specific guidance on how to fix them.

### 3. Local Development

For local development, the Supabase client is already configured in the API route with the project URL and anon key.

## Troubleshooting

If you encounter issues with the high scores:

1. Check the browser console for any API errors
2. Verify that the Supabase project is active and accessible
3. Check that the `high_scores` table exists in the Supabase dashboard
4. Ensure the API key has the necessary permissions

## Future Improvements

Potential improvements to the high score system:

1. Add player authentication for verified high scores
2. Implement leaderboards by time period (daily, weekly, all-time)
3. Add additional statistics beyond just the score
4. Create a separate admin interface for managing high scores