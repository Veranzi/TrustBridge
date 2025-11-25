require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
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
        : '⚠️ WhatsApp is connecting... Check server logs for QR code'}
    </p>
  `);
});

// Initialize WhatsApp and start server
async function startServer() {
  try {
    // Database initializes automatically when db.js is loaded
    // Just require it to ensure it's initialized
    require('./database/db');
    console.log('✅ Database ready');
    
    // Initialize WhatsApp client
    console.log('Initializing WhatsApp connection...');
    await whatsappService.initialize();
    
    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📱 WhatsApp Status: http://localhost:${PORT}/webhook/status`);
      console.log(`🔐 Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
      console.log(`\n💡 Scan the QR code above with WhatsApp to connect!`);
      console.log(`\n🌐 To make it public, use ngrok: ngrok http ${PORT}`);
      console.log(`   Or deploy to Railway/Render/DigitalOcean (see QUICK_DEPLOY.md)\n`);
    });
  } catch (error) {
    console.error('Failed to initialize WhatsApp:', error);
    console.log('Starting server without WhatsApp connection...');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on port ${PORT} (WhatsApp not connected)`);
      console.log(`📱 WhatsApp Status: http://localhost:${PORT}/webhook/status`);
      console.log(`🔐 Admin API: http://localhost:${PORT}/api/admin`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
      console.log(`\n🌐 To make it public, use ngrok: ngrok http ${PORT}`);
      console.log(`   Or deploy to Railway/Render/DigitalOcean (see QUICK_DEPLOY.md)\n`);
    });
  }
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

