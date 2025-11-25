# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create .env File

Copy the example environment file:

```bash
# On Windows PowerShell
Copy-Item config\env.example .env

# On Linux/Mac
cp config/env.example .env
```

Then edit `.env` and set your admin password.

## Step 3: Configure .env

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/reports.db
ADMIN_PASSWORD=your_secure_password_here
```

No WhatsApp API credentials needed - you'll connect directly via QR code!

## Step 5: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Step 6: Connect WhatsApp

1. When you start the server, a QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code shown in the terminal
5. Wait for the "✅ WhatsApp client is ready!" message

**Note:** The session is saved locally, so you won't need to scan again unless the session expires.

## Step 7: Test the Bot

1. Send a WhatsApp message to the connected WhatsApp number
2. Type `menu` to see the main menu
3. Type `1` to start reporting an issue
4. Follow the prompts

## Step 8: Access Admin Dashboard

1. Open browser: `http://localhost:3000/admin`
2. Enter the admin password (from `.env`)
3. View and manage reports

## Troubleshooting

### Database Issues
- The database will be created automatically in the `data/` folder
- If you need to reset, delete `data/reports.db` and restart the server

### WhatsApp Not Connecting
- Make sure you scan the QR code within 60 seconds (it refreshes)
- Check that your phone has internet connection
- Try restarting the server if connection fails
- Delete `data/whatsapp-session` folder and restart to get a new QR code
- Make sure Chrome/Chromium is installed (required for Puppeteer)

### Messages Not Sending
- Check that WhatsApp shows "✅ WhatsApp client is ready!" in logs
- Verify the phone number format (should be: 254712345678)
- Check server logs for error messages
- Make sure the WhatsApp session is still active

## Important Notes

⚠️ **WhatsApp Connection:**
- This connects directly to WhatsApp (like WhatsApp Web)
- You need to scan QR code on first run
- Session is saved, so you won't need to scan again unless it expires
- Keep the server running to maintain connection
- If connection drops, restart the server

## Next Steps

- Customize categories in `services/chatbot.js`
- Add more features to the admin dashboard
- Set up email notifications for new reports
- Deploy to production
- Consider using PM2 or similar for process management

