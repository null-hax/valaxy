# High Scores Solution for Valaxy Arcade Game

## Problem

The original high scores implementation was trying to write to the file system (`/var/task/data/highscores.json`) in a serverless environment (Vercel), which has a read-only file system. This was causing the following error:

```
Error saving high scores: Error: EROFS: read-only file system, open '/var/task/data/highscores.json'
```

## Solution

The solution implements a serverless-friendly approach to storing high scores:

1. **Supabase Database**: The API uses Supabase to store high scores persistently.
2. **In-memory cache**: The API also uses an in-memory cache as a fallback.
3. **Local storage**: The client-side game continues to use local storage as a reliable backup.
4. **Top 5 scores**: The implementation displays the top 5 scores in the UI, while storing up to 100 in the database.
5. **Improved error handling**: Better fallback mechanisms when the API is unavailable.

## How It Works

### Server-side (API)

- The `/api/highscores` API endpoint uses Supabase as the primary storage solution.
- It also maintains an in-memory cache as a fallback.
- The API includes robust error handling and duplicate prevention.

### Client-side (Game)

- The game tries to save scores to the API first.
- If the API fails, it falls back to using local storage.
- When loading scores, it tries the API first, then local storage, then defaults.

## Implementation Details

### Supabase Integration

The high scores are stored in a Supabase table with the following structure:

- `id`: UUID (primary key)
- `name`: Text (player's 3-letter name)
- `score`: Integer (player's score)
- `date`: Timestamp (when the score was achieved)
- `wave`: Integer (the wave number reached)
- `created_at`: Timestamp (when the record was created)

The API communicates with Supabase in two ways:

1. **Stored Procedures**: For reliable database operations that bypass Row Level Security.
2. **Direct Table Access**: As a fallback if stored procedures are not available.

### Duplicate Prevention

The system includes robust duplicate prevention mechanisms:

1. Server-side duplicate detection based on name, score, and wave.
2. Client-side duplicate filtering before sending scores to the API.
3. Improved sorting to ensure the highest scores are always kept.

## Deployment Notes

When deploying to Vercel:

1. Make sure the Supabase project URL and API key are correctly configured.
2. Ensure the Supabase database has the correct table structure and stored procedures.
3. Set up appropriate Row Level Security policies if using direct table access.

For more details on the Supabase implementation, see the `README-SUPABASE.md` file.