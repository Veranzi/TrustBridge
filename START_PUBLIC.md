# Quick Start: Make Your Reports Endpoint Public

## Fastest Option: ngrok (5 minutes)

### Step 1: Install ngrok
Download from: https://ngrok.com/download
Or install via npm:
```bash
npm install -g ngrok
```

### Step 2: Start Your Server
```bash
npm start
```

### Step 3: Start ngrok (in a new terminal)
```bash
ngrok http 3000
```

### Step 4: Access Your Endpoints
ngrok will show you a URL like: `https://abc123.ngrok.io`

- **Admin Dashboard:** `https://abc123.ngrok.io/admin`
- **Reports API:** `https://abc123.ngrok.io/api/admin/reports?password=YOUR_PASSWORD`
- **Health Check:** `https://abc123.ngrok.io/health`

**Example API Call:**
```bash
curl "https://abc123.ngrok.io/api/admin/reports?password=YOUR_PASSWORD"
```

---

## Cloud Deployment Options

### Option 1: Railway (Recommended - Easiest)
1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select your TrustBridge repo
5. Add environment variables in Railway dashboard
6. Deploy!

**Your URL will be:** `https://your-app-name.railway.app`

### Option 2: Render (Free Tier)
1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect your GitHub repo
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add environment variables
8. Deploy!

**Your URL will be:** `https://your-app-name.onrender.com`

### Option 3: DigitalOcean (Most Reliable)
See `DEPLOYMENT.md` for detailed VPS setup instructions.

---

## Environment Variables Needed

Make sure these are set in your cloud platform:

```
PORT=3000
NODE_ENV=production
DB_PATH=./data/reports.db
ADMIN_PASSWORD=your_secure_password_here
GOOGLE_API_KEY=your_google_api_key
GEMINI_MAX_RPM=12
```

---

## Testing Your Public Endpoint

Once deployed, test with:

```bash
# Health check
curl https://your-domain.com/health

# Get all reports
curl "https://your-domain.com/api/admin/reports?password=YOUR_PASSWORD"

# Get statistics
curl "https://your-domain.com/api/admin/stats?password=YOUR_PASSWORD"
```

---

## Full Documentation

See `QUICK_DEPLOY.md` for detailed deployment instructions.

