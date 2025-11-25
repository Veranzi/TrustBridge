const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');

// Status endpoint to check WhatsApp connection
router.get('/status', async (req, res) => {
  const isReady = whatsappService.isClientReady();
  const connectedNumber = isReady ? await whatsappService.getConnectedNumber() : null;
  
  res.json({
    connected: isReady,
    phoneNumber: connectedNumber ? `+${connectedNumber}` : null,
    message: isReady 
      ? `WhatsApp is connected and ready${connectedNumber ? ` (Number: +${connectedNumber})` : ''}` 
      : 'WhatsApp is not connected. Check server logs for QR code.'
  });
});

// Manual message sending endpoint (for testing/admin)
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber and message are required' });
    }

    if (!whatsappService.isClientReady()) {
      return res.status(503).json({ error: 'WhatsApp client is not ready' });
    }

    const success = await whatsappService.sendMessageToNumber(phoneNumber, message);

    if (success) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

module.exports = router;

