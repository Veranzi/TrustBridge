require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const whatsappService = require('./services/whatsapp');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Swagger/OpenAPI documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TrustBridge API',
      version: '1.0.0',
      description: 'API documentation for TrustBridge WhatsApp Bot - Kenyan Government Services Issue Reporting',
      contact: {
        name: 'TrustBridge Support'
      }
    },
    servers: [
      {
        url: process.env.RENDER_URL || 'http://localhost:3000',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        adminPassword: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-password',
          description: 'Admin password for authentication'
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TrustBridge API Documentation'
}));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// Serve admin dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    whatsapp: whatsappService.isClientReady() ? 'connected' : 'disconnected'
  });
});

// QR Code display endpoint - shows QR code as image for easier scanning
app.get('/qr-code', (req, res) => {
  const qr = whatsappService.getCurrentQR();
  
  if (!qr) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TrustBridge - WhatsApp QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          .message { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 TrustBridge WhatsApp QR Code</h1>
          <p class="message">⏳ QR code not available yet. Please wait for WhatsApp initialization...</p>
          <p class="message">Check server logs for initialization status.</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
  
  // Generate QR code as SVG using qrcode library
  const QRCode = require('qrcode');
  
  QRCode.toDataURL(qr, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 2
  }, (err, url) => {
    if (err) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>TrustBridge - WhatsApp QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 TrustBridge WhatsApp QR Code</h1>
            <p class="error">Error generating QR code image</p>
            <p><a href="/">← Back to Home</a></p>
          </div>
        </body>
        </html>
      `);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TrustBridge - WhatsApp QR Code</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            text-align: center;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 500px;
          }
          h1 { color: #333; margin-bottom: 10px; }
          .qr-code {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 10px;
          }
          .qr-code img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          .instructions {
            color: #666;
            margin: 20px 0;
            text-align: left;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
          }
          .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
          }
          .note {
            color: #ff9800;
            font-size: 14px;
            margin-top: 15px;
            padding: 10px;
            background: #fff3e0;
            border-radius: 5px;
          }
          a {
            color: #1976d2;
            text-decoration: none;
            margin-top: 20px;
            display: inline-block;
          }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 TrustBridge WhatsApp QR Code</h1>
          <div class="qr-code">
            <img src="${url}" alt="WhatsApp QR Code">
          </div>
          <div class="instructions">
            <strong>How to Scan:</strong>
            <ol>
              <li>Open WhatsApp on your phone</li>
              <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
              <li>Point your camera at the QR code above</li>
              <li>Wait for connection confirmation</li>
            </ol>
          </div>
          <div class="note">
            💡 <strong>Tip:</strong> This QR code will auto-refresh if it expires. If scanning fails, refresh this page to get the latest QR code.
          </div>
          <a href="/">← Back to Home</a>
        </div>
      </body>
      </html>
    `);
  });
});

// Reset WhatsApp session endpoint (for troubleshooting on Render)
app.post('/admin/reset-whatsapp', (req, res) => {
  const adminPassword = req.body.password || req.headers['x-admin-password'];
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const fs = require('fs');
  const path = require('path');
  const sessionPath = path.join(__dirname, 'data', 'whatsapp-session');
  
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('✅ WhatsApp session cleared via admin endpoint');
    }
    
    // Restart WhatsApp client
    whatsappService.destroy().then(() => {
      whatsappService.initialize().catch(err => {
        console.error('Error reinitializing WhatsApp:', err);
      });
    });
    
    res.json({ 
      success: true, 
      message: 'WhatsApp session cleared. Check logs for new QR code.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear session', 
      message: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>TrustBridge WhatsApp Bot</h1>
    <p>WhatsApp chatbot for Kenyan government service issue reporting</p>
    <p><a href="/admin">Admin Dashboard</a></p>
    <p><a href="/webhook/status">WhatsApp Status</a></p>
    <p>Health: <a href="/health">/health</a></p>
    <p style="margin-top: 20px; color: #666;">
      ${whatsappService.isClientReady() 
        ? '✅ WhatsApp is connected' 
        : '⚠️ WhatsApp is connecting... <a href="/qr-code">Click here to scan QR code</a>'}
    </p>
  `);
});

// Initialize WhatsApp and start server
async function startServer() {
  // Database initializes automatically when db.js is loaded
  // Just require it to ensure it's initialized
  require('./database/db');
  console.log('✅ Database ready');
  
  // Start Express server IMMEDIATELY (don't wait for WhatsApp)
  // This ensures Render detects the open port
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
    console.log(`📱 WhatsApp Status: http://localhost:${PORT}/webhook/status`);
    console.log(`🔐 Admin API: http://localhost:${PORT}/api/admin`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`\n💡 Initializing WhatsApp connection in background...`);
    console.log(`\n🌐 To make it public, use ngrok: ngrok http ${PORT}`);
    console.log(`   Or deploy to Railway/Render/DigitalOcean (see QUICK_DEPLOY.md)\n`);
  });
  
  // Initialize WhatsApp client in background (non-blocking)
  whatsappService.initialize()
    .then(() => {
      console.log('✅ WhatsApp client initialized successfully');
    })
    .catch((error) => {
      console.error('⚠️ Failed to initialize WhatsApp:', error.message);
      console.log('⚠️ Server is running, but WhatsApp is not connected');
      console.log('⚠️ WhatsApp will retry on next message or restart');
    });
  
  return server;
}

// Start the application
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await whatsappService.destroy();
  const { closeDatabase } = require('./database/db');
  await closeDatabase();
  process.exit(0);
});

