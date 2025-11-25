# 🚀 Deploy TrustBridge to Render - Step by Step Guide

## Prerequisites

- ✅ GitHub repository: https://github.com/Veranzi/TrustBridge
- ✅ Render account (free tier available)
- ✅ Your `.env` file with API keys (for reference)

## Step 1: Create Render Account

1. **Go to Render:**
   - Visit: https://render.com
   - Click "Get Started for Free"

2. **Sign Up:**
   - Choose "Continue with GitHub"
   - Authorize Render to access your GitHub account

## Step 2: Create New Web Service

1. **Click "New +"** (top right)
2. **Select "Web Service"**
3. **Connect your repository:**
   - Click "Connect account" if needed
   - Find and select: `Veranzi/TrustBridge`
   - Click "Connect"

## Step 3: Configure Service Settings

Fill in the service configuration:

### Basic Settings:
- **Name:** `trustbridge-bot` (or any name you prefer)
- **Region:** Choose closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
- **Branch:** `main` (should be auto-detected)
- **Root Directory:** Leave empty (or `/` if needed)

### Build & Deploy:
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Plan:
- **Free:** Select "Free" plan (includes 750 hours/month)
- **Or Paid:** Choose "Starter" ($7/month) for better performance

### Advanced Settings (Click to expand):
- **Auto-Deploy:** `Yes` (deploys on every push to main)
- **Health Check Path:** `/health` (optional but recommended)

## Step 4: Add Environment Variables

**Before clicking "Create Web Service":**

1. **Scroll down to "Environment Variables"**
2. **Click "Add Environment Variable"** and add each:

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
- Click "Add Environment Variable"
- Enter key (e.g., `PORT`)
- Enter value (e.g., `3000`)
- Click "Add"
- Repeat for each variable

### Important Notes:
- **ADMIN_PASSWORD:** Use a strong password for accessing the admin dashboard
- **GOOGLE_API_KEY:** Copy from your local `.env` file
- **GEMINI_MAX_RPM:** Set to `12` for paid tier, `8` for free tier
- **PORT:** Render automatically sets `PORT`, but we include it for clarity

## Step 5: Create Web Service

1. **Review all settings**
2. **Click "Create Web Service"**
3. **Wait for deployment** (usually 5-10 minutes)

Render will:
- Clone your repository
- Install dependencies (`npm install`)
- Build your application
- Start the service (`npm start`)

## Step 6: Monitor Deployment

1. **Watch the build logs:**
   - You'll see real-time build progress
   - Wait for "Your service is live" message

2. **Check for errors:**
   - If build fails, check logs for errors
   - Common issues: missing environment variables, build errors

## Step 7: Get Your Public URL

Once deployed, Render provides a URL automatically:

- **Format:** `https://trustbridge-bot.onrender.com`
- **Or custom:** You can add your own domain later

The URL is shown at the top of your service dashboard.

## Step 8: Access Your Application

### Admin Dashboard:
```
https://your-app-name.onrender.com/admin
```

### Reports API:
```
https://your-app-name.onrender.com/api/admin/reports?password=YOUR_PASSWORD
```

### Health Check:
```
https://your-app-name.onrender.com/health
```

### WhatsApp Status:
```
https://your-app-name.onrender.com/webhook/status
```

## Step 9: Connect WhatsApp

1. **Check the service logs:**
   - Go to "Logs" tab in Render dashboard
   - Look for QR code output

2. **Scan QR code:**
   - The WhatsApp bot will generate a QR code in the logs
   - Scan it with your WhatsApp

3. **Note:** If QR code is hard to see:
   - Render logs support terminal output
   - QR code should display in the logs
   - If not visible, check the health endpoint for connection status

## Step 10: Verify Everything Works

### Test Health Endpoint:
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "whatsapp": "connected" or "disconnected"
}
```

### Test WhatsApp Status:
```bash
curl https://your-app-name.onrender.com/webhook/status
```

### Test Reports API:
```bash
curl "https://your-app-name.onrender.com/api/admin/reports?password=YOUR_PASSWORD"
```

### Test Admin Dashboard:
- Open: `https://your-app-name.onrender.com/admin`
- Enter your admin password

## 🚨 Important Considerations

### WhatsApp Session Persistence

**Problem:** Render's filesystem is ephemeral - files are lost on redeploy.

**Solutions:**

1. **Accept Re-scanning** (Simple for testing):
   - Re-scan QR code after each deployment
   - Works for testing, not ideal for production
   - Free tier is fine for this

2. **Use External Storage** (Production):
   - Store WhatsApp session in AWS S3 or similar
   - Requires code changes to backup/restore session
   - More complex but production-ready

3. **Migrate to WhatsApp Business API** (Best for production):
   - Use Twilio or similar service
   - No session files needed
   - More reliable for production
   - Requires business verification

### Database Persistence

**Current Setup:** SQLite database in `data/reports.db`

**Options:**

1. **Render Disk (Paid):**
   - Add "Disk" service in Render
   - Mount to `/opt/render/project/src/data`
   - Persists across deployments
   - Requires paid plan

2. **External Database (Recommended for production):**
   - Use Render PostgreSQL (free tier available)
   - Or use external database service
   - More reliable and scalable

3. **Accept Ephemeral (Free tier):**
   - Database resets on redeploy
   - Fine for testing
   - Not suitable for production

### Free Tier Limitations

**Render Free Tier:**
- ✅ 750 hours/month (enough for 24/7 if it's your only service)
- ✅ Automatic HTTPS
- ✅ Custom domains
- ⚠️ Services spin down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes ~30 seconds (cold start)
- ⚠️ Ephemeral filesystem (data lost on redeploy)

**For Production:**
- Consider Render Starter plan ($7/month)
- Or use external database and storage
- Or migrate to WhatsApp Business API

## 🔧 Troubleshooting

### Build Fails

**Check:**
- Environment variables are set correctly
- `package.json` has correct start script
- Node.js version is compatible (Render uses Node 18+ by default)

**Common fixes:**
- Check build logs for specific errors
- Verify all dependencies in `package.json`
- Ensure `npm start` command works locally

### App Crashes

**Check logs for:**
- Missing environment variables
- Database connection errors
- WhatsApp connection issues
- Port binding errors

**Solutions:**
- Verify all environment variables are set
- Check that `PORT` is not hardcoded (use `process.env.PORT`)
- Review error messages in logs

### WhatsApp Not Connecting

**Solutions:**
- Check logs for QR code
- Verify session folder has write permissions
- Try redeploying to get fresh QR code
- Check health endpoint for connection status

### Service Spins Down (Free Tier)

**Problem:** Service goes to sleep after 15 minutes of inactivity.

**Solutions:**
- First request after sleep takes ~30 seconds
- Use a monitoring service to ping your app every 10 minutes
- Or upgrade to paid plan (no spin-down)

**Free monitoring service:**
- UptimeRobot (free tier)
- Ping your `/health` endpoint every 10 minutes

### API Returns 401

**Check:**
- `ADMIN_PASSWORD` is set correctly
- Using correct password in API calls
- Password doesn't have extra spaces

### Database Not Persisting

**Problem:** Database resets on redeploy (free tier).

**Solutions:**
- Use Render PostgreSQL addon (free tier available)
- Or use external database service
- Or upgrade to paid plan with persistent disk

## 📊 Render Pricing

- **Free Tier:** 
  - 750 hours/month
  - Services spin down after inactivity
  - Ephemeral filesystem
  - Perfect for testing

- **Starter Plan:** $7/month
  - No spin-down
  - Persistent disk available
  - Better for production

- **Professional:** $25/month
  - More resources
  - Better performance

## 🎯 Next Steps After Deployment

1. **Set up monitoring:**
   - Use UptimeRobot to ping `/health` endpoint
   - Prevents spin-down on free tier
   - Get alerts if service goes down

2. **Add custom domain** (optional):
   - Go to Settings → Custom Domains
   - Add your domain
   - Configure DNS records

3. **Set up database backup:**
   - Export database regularly
   - Or use Render PostgreSQL with automatic backups

4. **Monitor logs:**
   - Check Render dashboard regularly
   - Watch for errors or warnings
   - Monitor WhatsApp connection status

## ✅ Success Checklist

- [ ] Account created on Render
- [ ] Web service created and connected to GitHub
- [ ] All environment variables set
- [ ] Service deployed successfully
- [ ] Public URL generated
- [ ] Health endpoint working
- [ ] WhatsApp QR code scanned
- [ ] Admin dashboard accessible
- [ ] Reports API working
- [ ] Monitoring set up (optional)

## 🔄 Updating Your Deployment

When you push changes to GitHub:

1. **Render auto-deploys** (if enabled)
2. **Or manually deploy:**
   - Go to Render dashboard
   - Click "Manual Deploy" → "Deploy latest commit"

**Note:** After redeploy, you may need to:
- Re-scan WhatsApp QR code (session lost)
- Re-initialize database (if using ephemeral storage)

## 📝 Environment Variables Reference

Copy these to Render's environment variables:

```env
PORT=3000
NODE_ENV=production
DB_PATH=./data/reports.db
ADMIN_PASSWORD=your_secure_password_here
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MAX_RPM=12
```

## 🆘 Getting Help

- **Render Docs:** https://render.com/docs
- **Render Support:** https://render.com/support
- **Check Logs:** Always check service logs first
- **Health Endpoint:** Use `/health` to verify service status

---

**Ready to deploy?** Follow the steps above and your TrustBridge bot will be live on Render! 🚀

