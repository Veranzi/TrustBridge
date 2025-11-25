# 🚂 Deploy TrustBridge to Railway - Step by Step Guide

## Prerequisites

- ✅ GitHub repository: https://github.com/Veranzi/TrustBridge
- ✅ Railway account (free tier available)
- ✅ Your `.env` file with API keys (for reference)

## Step 1: Create Railway Account

1. **Go to Railway:**
   - Visit: https://railway.app
   - Click "Start a New Project"

2. **Sign Up:**
   - Choose "Login with GitHub"
   - Authorize Railway to access your GitHub account

## Step 2: Create New Project

1. **Click "New Project"** (top right)
2. **Select "Deploy from GitHub repo"**
3. **Find and select:** `Veranzi/TrustBridge`
4. **Click "Deploy Now"**

Railway will automatically:
- Detect it's a Node.js project
- Start building your application
- Deploy it (but it won't work yet - we need to configure it)

## Step 3: Configure Environment Variables

1. **Click on your project** (TrustBridge)
2. **Click on the service** (the deployed app)
3. **Go to "Variables" tab**
4. **Click "New Variable"** and add each of these:

### Required Variables:

```env
PORT=3000
NODE_ENV=production
DB_PATH=./data/reports.db
ADMIN_PASSWORD=your_secure_password_here
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MAX_RPM=12
```

**Add them one by one:**
- Click "New Variable"
- Enter variable name (e.g., `PORT`)
- Enter value (e.g., `3000`)
- Click "Add"
- Repeat for each variable

### Important Notes:
- **ADMIN_PASSWORD:** Use a strong password for accessing the admin dashboard
- **GOOGLE_API_KEY:** Copy from your local `.env` file
- **GEMINI_MAX_RPM:** Set to `12` for paid tier, `8` for free tier

## Step 4: Configure Build Settings (Optional)

Railway should auto-detect, but verify:

1. **Go to "Settings" tab**
2. **Build Command:** Should be `npm install` (or leave empty)
3. **Start Command:** Should be `npm start` (or leave empty)
4. **Root Directory:** Leave empty (or set to `/`)

## Step 5: Add Persistent Storage (IMPORTANT for WhatsApp)

WhatsApp Web.js needs persistent storage for session files. Railway provides ephemeral storage by default, so we need to handle this:

### Option A: Use Railway Volumes (Recommended)

1. **Go to your service**
2. **Click "Settings"**
3. **Scroll to "Volumes"**
4. **Click "New Volume"**
5. **Mount Path:** `/app/data`
6. **Click "Create"**

This ensures your WhatsApp session and database persist across deployments.

### Option B: Use External Storage (Alternative)

If volumes don't work, you can:
- Use AWS S3 for session backup
- Use a database service for session storage
- Accept that you'll need to re-scan QR code after each deployment

## Step 6: Deploy and Monitor

1. **Railway will automatically redeploy** when you add environment variables
2. **Go to "Deployments" tab** to see build logs
3. **Wait for deployment to complete** (usually 2-5 minutes)

## Step 7: Get Your Public URL

1. **Go to "Settings" tab**
2. **Scroll to "Domains"**
3. **Click "Generate Domain"**
4. **Copy the URL** (e.g., `trustbridge-production.up.railway.app`)

## Step 8: Access Your Application

### Admin Dashboard:
```
https://your-app-name.up.railway.app/admin
```

### Reports API:
```
https://your-app-name.up.railway.app/api/admin/reports?password=YOUR_PASSWORD
```

### Health Check:
```
https://your-app-name.up.railway.app/health
```

## Step 9: Connect WhatsApp

1. **Check the deployment logs:**
   - Go to "Deployments" tab
   - Click on the latest deployment
   - View logs

2. **Look for QR code:**
   - The WhatsApp bot will generate a QR code in the logs
   - Scan it with your WhatsApp

3. **Note:** If you can't see the QR code in logs:
   - Railway logs might not display QR codes well
   - Consider using Railway's web terminal to see it
   - Or check the health endpoint to see connection status

## Step 10: Verify Everything Works

### Test Health Endpoint:
```bash
curl https://your-app-name.up.railway.app/health
```

### Test WhatsApp Status:
```bash
curl https://your-app-name.up.railway.app/webhook/status
```

### Test Reports API:
```bash
curl "https://your-app-name.up.railway.app/api/admin/reports?password=YOUR_PASSWORD"
```

## 🚨 Important Considerations

### WhatsApp Session Persistence

**Problem:** Railway's filesystem is ephemeral - files are lost on redeploy.

**Solutions:**

1. **Use Railway Volumes** (Best):
   - Mount `/app/data` as a volume
   - Session files will persist

2. **Accept Re-scanning** (Simple):
   - Re-scan QR code after each deployment
   - Works for testing, not ideal for production

3. **Migrate to WhatsApp Business API** (Production):
   - Use Twilio or similar service
   - No session files needed
   - More reliable for production

### Database Persistence

- SQLite database in `data/reports.db` will persist if you use volumes
- Consider using Railway's PostgreSQL addon for production
- Or use external database service

### Monitoring

1. **Check Logs:**
   - Railway dashboard → Deployments → View logs
   - Monitor for errors

2. **Set Up Alerts:**
   - Railway can send email notifications
   - Monitor deployment failures

## 🔧 Troubleshooting

### Build Fails

**Check:**
- Environment variables are set correctly
- `package.json` has correct start script
- Node.js version is compatible (Railway uses Node 18+ by default)

### App Crashes

**Check logs for:**
- Missing environment variables
- Database connection errors
- WhatsApp connection issues

### WhatsApp Not Connecting

**Solutions:**
- Check logs for QR code
- Verify session folder has write permissions
- Try using Railway's web terminal to see QR code
- Consider using volumes for persistent storage

### API Returns 401

**Check:**
- `ADMIN_PASSWORD` is set correctly
- Using correct password in API calls

## 📊 Railway Pricing

- **Free Tier:** $5 credit/month (usually enough for testing)
- **Hobby:** $5/month (if you exceed free tier)
- **Pro:** $20/month (for production)

## 🎯 Next Steps After Deployment

1. **Set up custom domain** (optional):
   - Add your domain in Railway settings
   - Configure DNS records

2. **Enable HTTPS:**
   - Railway provides HTTPS automatically
   - No additional setup needed

3. **Set up monitoring:**
   - Use Railway's built-in metrics
   - Set up alerts for failures

4. **Backup database:**
   - Export database regularly
   - Or use external database service

## ✅ Success Checklist

- [ ] Project deployed on Railway
- [ ] All environment variables set
- [ ] Volume mounted for persistent storage
- [ ] Public URL generated
- [ ] Health endpoint working
- [ ] WhatsApp QR code scanned
- [ ] Admin dashboard accessible
- [ ] Reports API working

---

**Need Help?** Check Railway docs: https://docs.railway.app

