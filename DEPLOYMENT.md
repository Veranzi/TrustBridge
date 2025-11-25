# TrustBridge WhatsApp Bot - Global Deployment Guide

This guide covers deploying the TrustBridge WhatsApp bot globally so it works 24/7 for users worldwide.

## Deployment Options

### Option 1: Cloud VPS (Recommended for WhatsApp Web.js)

**Best for:** Direct WhatsApp Web.js integration (current setup)

#### Recommended Providers:
1. **DigitalOcean** ($6-12/month)
   - Ubuntu 22.04 LTS
   - 1GB RAM minimum (2GB recommended)
   - Easy setup, good documentation

2. **AWS EC2** (Pay as you go)
   - t3.micro (free tier eligible)
   - More complex but scalable

3. **Linode** ($5-10/month)
   - Similar to DigitalOcean
   - Good performance

4. **Vultr** ($6/month)
   - Good global coverage
   - Simple interface

#### Setup Steps:

1. **Create VPS Instance**
   ```bash
   # Choose Ubuntu 22.04 LTS
   # Minimum: 1GB RAM, 1 CPU, 25GB storage
   # Recommended: 2GB RAM, 2 CPU, 50GB storage
   ```

2. **Connect via SSH**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

4. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone/Upload Your Project**
   ```bash
   # Option A: Using Git
   git clone your-repo-url
   cd TrustBridge
   
   # Option B: Using SCP (from local machine)
   # scp -r TrustBridge root@your-server-ip:/root/
   ```

6. **Install Dependencies**
   ```bash
   cd TrustBridge
   npm install
   ```

7. **Setup Environment Variables**
   ```bash
   # Copy example env file
   cp config/env.example .env
   
   # Edit with your values
   nano .env
   ```
   
   Required variables:
   ```env
   PORT=3000
   NODE_ENV=production
   DB_PATH=./data/reports.db
   ADMIN_PASSWORD=your_secure_password
   GOOGLE_API_KEY=your_google_api_key
   GEMINI_MAX_RPM=12
   ```

8. **Initialize Database**
   ```bash
   npm run init-db
   ```

9. **Start with PM2**
   ```bash
   # Start the application
   pm2 start server.js --name trustbridge-bot
   
   # Save PM2 configuration
   pm2 save
   
   # Setup PM2 to start on boot
   pm2 startup
   # Follow the instructions it provides
   ```

10. **Monitor Application**
    ```bash
    # View logs
    pm2 logs trustbridge-bot
    
    # View status
    pm2 status
    
    # Restart if needed
    pm2 restart trustbridge-bot
    ```

11. **Setup Firewall**
    ```bash
    # Allow SSH
    sudo ufw allow 22/tcp
    
    # Allow your app port (if needed for admin dashboard)
    sudo ufw allow 3000/tcp
    
    # Enable firewall
    sudo ufw enable
    ```

---

### Option 2: Heroku (Easier but Limited)

**Best for:** Quick deployment, but WhatsApp Web.js may have issues with Heroku's ephemeral filesystem.

**Limitations:**
- Filesystem is ephemeral (session data may be lost)
- Need to use external storage for WhatsApp session
- May need to use WhatsApp Business API instead

**Steps:**
1. Create Heroku account
2. Install Heroku CLI
3. Create `Procfile`:
   ```
   web: node server.js
   ```
4. Deploy:
   ```bash
   heroku create trustbridge-bot
   heroku config:set GOOGLE_API_KEY=your_key
   heroku config:set GEMINI_MAX_RPM=12
   git push heroku main
   ```

---

### Option 3: WhatsApp Business API (Best for Scale)

**Best for:** Production, high volume, global scale

**Providers:**
1. **Twilio WhatsApp API** (Recommended)
   - Pay per message
   - No WhatsApp Web.js needed
   - More reliable
   - Requires business verification

2. **360dialog**
   - WhatsApp Business API provider
   - Good pricing
   - Easy integration

3. **MessageBird**
   - Enterprise solution
   - WhatsApp Business API

**Migration Steps:**
1. Get WhatsApp Business API access
2. Replace `whatsapp-web.js` with API provider SDK
3. Update message handling code
4. Deploy to cloud

---

## Important Considerations

### 1. WhatsApp Session Persistence

The current setup uses WhatsApp Web.js which requires:
- **Session folder must persist** between restarts
- Use external storage (AWS S3, Google Cloud Storage) for session files
- Or use a database to store session data

**Solution: Backup Session to Cloud Storage**

Create `scripts/backup-session.js`:
```javascript
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Backup WhatsApp session to S3
async function backupSession() {
  const sessionPath = path.join(__dirname, '../data/whatsapp-session');
  // Upload to S3 or cloud storage
}
```

### 2. Database Backup

Setup automated database backups:

```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /root/TrustBridge/data/reports.db /root/backups/reports_$DATE.db
# Keep only last 7 days
find /root/backups -name "reports_*.db" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-db.sh
```

### 3. Monitoring & Logging

**Setup PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Use PM2 Plus (Optional):**
```bash
pm2 link your-secret-key your-public-key
```

### 4. Domain & SSL (For Admin Dashboard)

If you want to access admin dashboard globally:

1. **Point domain to server IP**
2. **Setup Nginx reverse proxy:**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/trustbridge
   ```
   
   Configuration:
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
   
3. **Enable site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/trustbridge /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### 5. Environment Variables Security

**Never commit `.env` file!**

Use:
- Environment variables in hosting platform
- Secrets management (AWS Secrets Manager, etc.)
- Encrypted config files

---

## Quick Start: DigitalOcean Deployment

1. **Create Droplet** (Ubuntu 22.04, $6/month)
2. **SSH into server**
3. **Run setup script:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your project (or upload via SCP)
git clone your-repo-url
cd TrustBridge

# Install dependencies
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

# View logs
pm2 logs trustbridge-bot
```

---

## Troubleshooting

### WhatsApp Session Lost
- Session folder must persist
- Check `data/whatsapp-session` exists
- Re-scan QR code if needed

### Bot Not Responding
```bash
# Check if running
pm2 status

# View logs
pm2 logs trustbridge-bot

# Restart
pm2 restart trustbridge-bot
```

### High Memory Usage
- WhatsApp Web.js uses Chromium (memory intensive)
- Consider upgrading VPS RAM
- Or migrate to WhatsApp Business API

### Rate Limiting
- Check Google API quota
- Adjust `GEMINI_MAX_RPM` in `.env`
- Monitor API usage in Google Cloud Console

---

## Next Steps

1. **Choose deployment option** (VPS recommended)
2. **Setup server** following steps above
3. **Test locally** before deploying
4. **Monitor** with PM2 logs
5. **Setup backups** for database and session
6. **Consider migration** to WhatsApp Business API for production scale

---

## Support

For issues:
- Check PM2 logs: `pm2 logs trustbridge-bot`
- Check server logs: `tail -f /var/log/syslog`
- Verify environment variables: `pm2 env trustbridge-bot`

