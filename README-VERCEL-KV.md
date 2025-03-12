# Setting Up Vercel KV for Valaxy Arcade High Scores

This document explains how to set up Vercel KV for persistent high scores in the Valaxy Arcade game.

## What is Vercel KV?

Vercel KV is a Redis-compatible key-value store designed for Vercel serverless functions. It provides a persistent storage solution that works well with Vercel's serverless architecture.

## Prerequisites

- A Vercel account
- Your project deployed on Vercel or ready to be deployed

## Setup Instructions

### 1. Add Vercel KV to Your Project

1. Log in to your Vercel dashboard
2. Select your project
3. Go to the "Storage" tab
4. Click "Connect" next to "Vercel KV"
5. Follow the prompts to create a new KV database or connect to an existing one

### 2. Required Environment Variables

After connecting Vercel KV, Vercel will automatically add the following environment variables to your project:

- `KV_URL`: The connection URL for your KV database
- `KV_REST_API_URL`: The REST API URL for your KV database
- `KV_REST_API_TOKEN`: The authentication token for the REST API
- `KV_REST_API_READ_ONLY_TOKEN`: A read-only token for the REST API

These variables are required for the `@vercel/kv` package to connect to your KV database.

### 3. Local Development Setup

For local development, you'll need to add these environment variables to your local environment. You can do this by creating a `.env.local` file in the root of your project with the following content:

```
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

Replace the placeholder values with the actual values from your Vercel project's environment variables.

### 4. Fallback Mechanism

The high scores system is designed with a fallback mechanism:

1. First, it tries to use Vercel KV for persistent storage
2. If Vercel KV is not available, it falls back to using the in-memory cache
3. The in-memory cache is reset when the serverless function is redeployed or scaled

This ensures that high scores are always available, even if there are issues with the KV database.

## Troubleshooting

If you encounter issues with Vercel KV:

1. Check that all required environment variables are set correctly
2. Verify that your Vercel KV database is active and running
3. Check the Vercel logs for any error messages related to KV
4. Make sure you're using the latest version of the `@vercel/kv` package

## Additional Resources

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel KV API Reference](https://vercel.com/docs/storage/vercel-kv/kv-reference)