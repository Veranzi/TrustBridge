# TrustBridge - WhatsApp Government Services Bot

A WhatsApp chatbot that allows Kenyan citizens to report issues related to government services such as public hospitals, roads, infrastructure, education, and security.

## Features

- 📱 **WhatsApp Integration**: Citizens can report issues directly via WhatsApp
- 🏛️ **Multiple Categories**: Healthcare, Infrastructure, Education, Security, and more
- 📊 **Admin Dashboard**: Web-based dashboard to view and manage reports
- 🔍 **Report Tracking**: Citizens can view their submitted reports
- 📈 **Statistics**: Real-time statistics on reports and their status

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- WhatsApp account (for scanning QR code to connect)
- Chrome/Chromium browser (for Puppeteer)

## Setup Instructions

### 1. Clone and Install

```bash
cd TrustBridge
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/reports.db

# Admin Configuration
ADMIN_PASSWORD=change_this_password
```

You can copy the example file:
```bash
# Windows PowerShell
Copy-Item config\env.example .env

# Linux/Mac
cp config/env.example .env
```

### 4. Initialize Database

```bash
npm run init-db
```

Or just start the server - the database will be created automatically.

### 5. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 6. Connect WhatsApp

1. Start the server:
   ```bash
   npm start
   ```

2. A QR code will appear in the terminal
3. Open WhatsApp on your phone
4. Go to **Settings** → **Linked Devices** → **Link a Device**
5. Scan the QR code shown in the terminal
6. Wait for the "✅ WhatsApp client is ready!" message

### 7. Test the Bot

1. Send a WhatsApp message to the connected WhatsApp number
2. Type `menu` to see the main menu
3. Follow the prompts to report an issue

## Usage

### For Citizens

Send a WhatsApp message to the bot number:

- `menu` or `help` - Show main menu
- `1` or `report an issue` - Start reporting an issue
- `2` or `my reports` - View your submitted reports
- `3` or `help` - Get help

### For Administrators

1. Open the admin dashboard: `http://localhost:3000/admin`
2. Enter the admin password (set in `.env`)
3. View and manage reports
4. Update report statuses
5. View statistics

## API Endpoints

### WhatsApp Status
- `GET /webhook/status` - Check WhatsApp connection status
- `POST /webhook/send` - Manually send a message (for testing/admin)
  ```json
  {
    "phoneNumber": "254712345678",
    "message": "Test message"
  }
  ```

### Admin API (requires password)
- `GET /api/admin/reports` - Get all reports
- `GET /api/admin/reports/:id` - Get specific report
- `PATCH /api/admin/reports/:id/status` - Update report status
- `GET /api/admin/stats` - Get statistics

All admin endpoints require authentication via:
- Query parameter: `?password=your_password`
- Or header: `X-Admin-Password: your_password`

## Project Structure

```
TrustBridge/
├── config/           # Configuration files
├── database/         # Database setup
│   └── db.js        # SQLite database connection
├── models/          # Data models
│   ├── Report.js    # Report model
│   └── UserSession.js # User session model
├── routes/          # Express routes
│   ├── webhook.js   # WhatsApp webhook handler
│   └── admin.js     # Admin API routes
├── services/        # Business logic
│   └── chatbot.js   # Chatbot conversation logic
├── public/          # Static files
│   └── admin.html   # Admin dashboard
├── data/            # Database files (created automatically)
├── server.js        # Main server file
└── package.json     # Dependencies
```

## Report Categories

1. **Healthcare**: Hospitals, Clinics, Pharmacies, Ambulance services
2. **Infrastructure**: Roads, Bridges, Water Supply, Electricity
3. **Education**: Schools, Universities, Libraries, Scholarships
4. **Security**: Police, Emergency services, Safety, Crime
5. **Other**: Miscellaneous issues

## Database Schema

### Reports Table
- `id`: Primary key
- `phone_number`: WhatsApp number of reporter
- `category`: Issue category
- `subcategory`: Issue subcategory
- `description`: Detailed description
- `location`: Location of the issue
- `status`: pending, in_progress, resolved, closed
- `priority`: low, medium, high
- `created_at`: Timestamp
- `updated_at`: Timestamp

### User Sessions Table
- `phone_number`: Primary key
- `state`: Current conversation state
- `report_data`: JSON data for current report
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Security Notes

- Change the `ADMIN_PASSWORD` in production
- Use HTTPS in production
- Consider adding rate limiting
- Implement proper authentication for admin endpoints
- Sanitize user inputs
- Keep your WhatsApp session secure (stored in `./data/whatsapp-session`)
- Don't share your session files

## Important Notes

⚠️ **WhatsApp Connection:**
- This uses WhatsApp Web protocol (similar to WhatsApp Web in browser)
- You need to scan QR code on first run
- Session is saved locally, so you won't need to scan again unless session expires
- Keep the server running to maintain connection
- If connection drops, restart the server and scan QR code again if needed

## Deployment

For production deployment:

1. Use a production database (PostgreSQL recommended)
2. Set up proper environment variables
3. Use HTTPS
4. Set up proper logging and monitoring
5. Implement backup strategies
6. Consider using a process manager like PM2
7. Keep WhatsApp session files secure and backed up

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

