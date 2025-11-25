# Setting Up Google API Key

## Quick Setup

1. **Create or edit your `.env` file** in the root directory:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

2. **Make sure the `.env` file is in the root directory** (same folder as `server.js`)

3. **Restart your server** after adding the API key:
   ```bash
   npm start
   ```

## Verification

When you start the server, you should see:
```
🔑 Loaded GOOGLE_API_KEY: AIzaSyCXDq...
✅ Using Gemini model: models/gemini-2.5-flash
📊 Rate limit: 12 requests/minute
✅ AI Service initialized successfully with API key
```

## Full .env Example

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/reports.db

# Admin Configuration
ADMIN_PASSWORD=change_this_password

# Google API Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Gemini Model Configuration (optional)
# GEMINI_CHAT_MODEL=models/gemini-2.5-flash
# GEMINI_MAX_RPM=12
```

## Troubleshooting

### API Key Not Loading
- Make sure `.env` file is in the root directory
- Check that the file is named exactly `.env` (not `.env.txt`)
- Restart the server after making changes
- Check for typos in the variable name: `GOOGLE_API_KEY` (not `GOOGLE_API` or `API_KEY`)

### API Key Format
- Should start with `AIza`
- Should be about 39 characters long
- No spaces or quotes needed in `.env` file

### Still Not Working?
1. Check server logs for error messages
2. Verify the API key is correct in Google Cloud Console
3. Ensure Generative Language API is enabled
4. Check that billing is enabled (for paid tier)

