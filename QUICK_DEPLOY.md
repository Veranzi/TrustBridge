# Quick Deployment Guide - Access Reports Anywhere

This guide helps you deploy TrustBridge so you can access the reports endpoint from anywhere.

## Option 1: Quick Testing with ngrok (5 minutes)

**Best for:** Testing and development, temporary access

### Steps:

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or install via npm: `npm install -g ngrok`

2. **Start your server:**
   ```bash
   npm start
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Access your endpoints:**
   - ngrok will give you a URL like: `https://abc123.ngrok.io`
   - Admin Dashboard: `https://abc123.ngrok.io/admin`
   - Reports API: `https://abc123.ngrok.io/api/admin/reports?password=YOUR_PASSWORD`
   - Health Check: `https://abc123.ngrok.io/health`

**Note:** Free ngrok URLs change each time you restart. For permanent access, use Option 2 or 3.

---

## Option 2: Railway (Easiest Cloud Deployment)

**Best for:** Quick deployment, free tier available, automatic HTTPS

### Steps:

1. **Create Railway account:**
   - Go to: https://railway.app
   - Sign up with GitHub

2. **Deploy:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your TrustBridge repository
   - Railway will auto-detect Node.js

3. **Set Environment Variables:**
   - Go to Project → Variables
   - Add:
     ```
     PORT=3000
     NODE_ENV=production
     DB_PATH=./data/reports.db
     ADMIN_PASSWORD=your_secure_password
     GOOGLE_API_KEY=your_google_api_key
     GEMINI_MAX_RPM=12
     ```

4. **Access your app:**
   - Railway provides a URL like: `https://trustbridge-production.up.railway.app`
   - Admin Dashboard: `https://your-url.railway.app/admin`
   - Reports API: `https://your-url.railway.app/api/admin/reports?password=YOUR_PASSWORD`

**Note:** WhatsApp Web.js may have issues with Railway's ephemeral filesystem. Consider using WhatsApp Business API for production.

---

## Option 3: Render (Free Tier Available)

**Best for:** Free hosting, easy setup, automatic HTTPS

### Steps:

1. **Create Render account:**
   - Go to: https://render.com
   - Sign up with GitHub

2. **Create Web Service:**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name:** trustbridge-bot
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free (or paid for better performance)

3. **Set Environment Variables:**
   - Go to Environment tab
   - Add all variables from `.env`

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

5. **Access:**
   - URL: `https://trustbridge-bot.onrender.com`
   - Admin Dashboard: `https://trustbridge-bot.onrender.com/admin`

---

## Option 4: DigitalOcean Droplet (Most Reliable)

**Best for:** Production, WhatsApp Web.js compatibility, full control

### Quick Setup:

1. **Create Droplet:**
   - Ubuntu 22.04 LTS
   - $6/month (1GB RAM) or $12/month (2GB RAM recommended)

2. **SSH and Setup:**
   ```bash
   ssh root@your-server-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Clone your project (or upload via SCP)
   git clone your-repo-url
   cd TrustBridge
   npm install
   
   # Setup environment
   cp config/env.example .env
   nano .env  # Edit with your values
   
   # Initialize database
   npm run init-db
   
   # Start with PM2
   pm2 start server.js --name trustbridge-bot
   pm2 save
   pm2 startup  # Follow instructions
   ```

3. **Setup Nginx (for HTTPS):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/trustbridge
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/trustbridge /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Setup SSL:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Accessing Reports API

Once deployed, you can access reports from anywhere:

### Get All Reports:
```bash
curl "https://your-domain.com/api/admin/reports?password=YOUR_PASSWORD"
```

### Get Specific Report:
```bash
curl "https://your-domain.com/api/admin/reports/1?password=YOUR_PASSWORD"
```

### Update Report Status:
```bash
curl -X PATCH "https://your-domain.com/api/admin/reports/1/status?password=YOUR_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

### Get Statistics:
```bash
curl "https://your-domain.com/api/admin/stats?password=YOUR_PASSWORD"
```

### Using JavaScript/Fetch:
```javascript
const password = 'your_admin_password';
const baseUrl = 'https://your-domain.com';

// Get all reports
fetch(`${baseUrl}/api/admin/reports?password=${password}`)
  .then(res => res.json())
  .then(reports => console.log(reports));

// Update status
fetch(`${baseUrl}/api/admin/reports/1/status?password=${password}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'resolved' })
});
```

---

## Security Recommendations

1. **Use HTTPS:** Always use HTTPS in production (Railway, Render, and DigitalOcean with SSL provide this)

2. **Strong Admin Password:** Use a strong password in `ADMIN_PASSWORD`

3. **Rate Limiting:** Consider adding rate limiting for API endpoints

4. **CORS:** The current setup allows all origins. For production, restrict CORS:
   ```javascript
   app.use(cors({
     origin: 'https://your-trusted-domain.com'
   }));
   ```

---

## Testing Your Deployment

1. **Health Check:**
   ```bash
   curl https://your-domain.com/health
   ```

2. **WhatsApp Status:**
   ```bash
   curl https://your-domain.com/webhook/status
   ```

3. **Admin Dashboard:**
   - Open: `https://your-domain.com/admin`
   - Enter your admin password

---

## Troubleshooting

### Reports API Returns 401 Unauthorized
- Check that `ADMIN_PASSWORD` is set correctly
- Use the password in query: `?password=YOUR_PASSWORD`
- Or in header: `X-Admin-Password: YOUR_PASSWORD`

### WhatsApp Not Connecting
- WhatsApp Web.js requires persistent session storage
- On Railway/Render, consider using external storage (S3) for session files
- Or migrate to WhatsApp Business API

### Database Not Found
- Ensure `npm run init-db` was run
- Check that `DB_PATH` in `.env` is correct
- On cloud platforms, database file should persist in project directory

---

## Recommended: Railway or Render

For quick deployment with minimal setup:
- **Railway:** Best for automatic deployments, easy environment variables
- **Render:** Free tier, good for testing, automatic HTTPS

For production with WhatsApp Web.js:
- **DigitalOcean:** Most reliable, full control, persistent storage

