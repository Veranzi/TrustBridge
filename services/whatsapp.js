const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ChatbotService = require('./chatbot');
const { normalizePhoneNumber } = require('../utils/phone');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.processedMessages = new Set(); // Track processed messages to prevent duplicates
  }

  initialize() {
    return new Promise((resolve, reject) => {
      console.log('Initializing WhatsApp client...');
      console.log('⏳ This may take a moment, especially on first run...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './data/whatsapp-session'
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-pings',
            '--disable-default-apps'
          ],
          timeout: 60000, // 60 seconds for browser launch
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/wa-web-version.html',
        },
      });

      // QR Code generation
      this.client.on('qr', (qr) => {
        console.log('\n📱 Scan this QR code with WhatsApp to connect:');
        console.log('==========================================');
        qrcode.generate(qr, { small: true });
        console.log('==========================================');
        console.log('💡 Tips:');
        console.log('   - Make sure your phone and computer are on the same network');
        console.log('   - You have about 60 seconds to scan (QR code will auto-refresh if needed)');
        console.log('   - If it fails, try restarting the server\n');
      });

      // Client ready
      this.client.on('ready', async () => {
        console.log('✅ WhatsApp client is ready! (ready event fired)');
        clearInterval(statusInterval);
        try {
          const clientInfo = this.client.info;
          if (clientInfo && clientInfo.wid) {
            const connectedNumber = clientInfo.wid.user;
            console.log(`📱 Connected WhatsApp Number: +${connectedNumber}`);
            console.log(`💬 Send messages to +${connectedNumber} to interact with the bot!`);
            console.log(`💡 Or message yourself if you scanned with your own phone.`);
            console.log(`\n🔍 Debug: Message handlers registered. Waiting for messages...\n`);
          } else {
            console.log('📱 Bot is ready! Send messages to the connected WhatsApp number.\n');
          }
        } catch (err) {
          console.log('📱 Bot is ready! Send messages to the connected WhatsApp number.\n');
          console.log('Note: If you scanned with your phone, message yourself to test.\n');
        }
        this.isReady = true;
        resolve();
      });

      // Authentication
      this.client.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated successfully!');
        console.log('⏳ Waiting for client to be ready...');
        // Set a timeout to check if ready event fires
        setTimeout(() => {
          if (!this.isReady) {
            console.log('⚠️ Still waiting for ready event...');
            console.log('💡 This can take 30-60 seconds after scanning');
          }
        }, 30000); // Check after 30 seconds
      });

      // Authentication failure
      this.client.on('auth_failure', (msg) => {
        console.error('❌ Authentication failure:', msg);
        console.error('💡 Try deleting ./data/whatsapp-session folder and restarting');
        reject(new Error('Authentication failed'));
      });

      // Disconnected
      this.client.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp client disconnected:', reason);
        this.isReady = false;
        if (reason === 'NAVIGATION') {
          console.log('💡 Connection lost. Restart the server to reconnect.');
        }
      });

      // Loading screen
      this.client.on('loading_screen', (percent, message) => {
        console.log(`⏳ Loading: ${percent}% - ${message}`);
        // If we're at 100%, we should be close to ready
        if (percent === 100) {
          console.log('✅ Loading complete! Client should be ready soon...');
          // Give it a moment, then check if ready
          setTimeout(() => {
            if (!this.isReady) {
              console.log('⏳ Still initializing after 100% load...');
              console.log('💡 This is normal - WhatsApp Web is finishing setup');
            }
          }, 10000); // Check after 10 seconds
        }
      });

      // Remote session saved
      this.client.on('remote_session_saved', () => {
        console.log('💾 Remote session saved successfully');
      });

      // Change state
      this.client.on('change_state', (state) => {
        console.log(`🔄 State changed: ${state}`);
        // If state is CONNECTED, we might be ready
        if (state === 'CONNECTED' && !this.isReady) {
          console.log('✅ State is CONNECTED - checking if client is ready...');
          // Small delay then check
          setTimeout(async () => {
            try {
              if (this.client && this.client.info) {
                console.log('✅ Client appears ready! Setting ready state...');
                this.isReady = true;
                resolve();
              }
            } catch (err) {
              console.log('⏳ Not quite ready yet, waiting for ready event...');
            }
          }, 2000);
        }
      });

      // Any other errors
      this.client.on('error', (error) => {
        console.error('❌ WhatsApp client error:', error);
      });

      // Message handler - use only 'message' event to prevent duplicates
      // CRITICAL: Only ONE message event listener to prevent duplicate processing
      this.client.on('message', async (message) => {
        // Skip if message is from status or group (early return)
        if (message.from === 'status@broadcast' || message.isGroupMsg) {
          return;
        }
        
        // Create unique message ID for deduplication
        // Use serialized ID if available, otherwise create composite ID
        const messageId = message.id?._serialized || 
                         message.id || 
                         `${message.from}_${message.timestamp}_${(message.body || 'media').substring(0, 50)}`;
        
        // Check if we've already processed this message (prevent duplicates)
        if (this.processedMessages.has(messageId)) {
          console.log('⚠️ Duplicate message detected, ignoring:', messageId.substring(0, 50));
          return;
        }
        
        // Mark as processed IMMEDIATELY to prevent race conditions
        this.processedMessages.add(messageId);
        
        // Keep only last 500 messages to prevent memory issues
        if (this.processedMessages.size > 500) {
          const first = this.processedMessages.values().next().value;
          this.processedMessages.delete(first);
        }
        
        console.log('🔔 Processing new message:', messageId.substring(0, 50));
        await this.handleIncomingMessage(message);
      });

      // Initialize client with progress indicators
      console.log('🚀 Starting WhatsApp client initialization...');
      console.log('⏳ Loading Chromium browser...');
      
      // Progress indicators with elapsed time
      const startTime = Date.now();
      let progressCount = 0;
      const statusInterval = setInterval(() => {
        if (!this.isReady) {
          progressCount++;
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const statuses = [
            `⏳ Initializing browser... (${elapsed}s)`,
            `⏳ Connecting to WhatsApp Web... (${elapsed}s)`,
            `⏳ Loading session... (${elapsed}s)`,
            `⏳ Almost ready... (${elapsed}s)`
          ];
          console.log(statuses[progressCount % statuses.length]);
        }
      }, 20000); // Every 20 seconds

      // Set a maximum timeout for initialization (increased to 3 minutes)
      const initPromise = this.client.initialize();
      const timeoutPromise = new Promise((_, timeoutReject) => {
        setTimeout(() => {
          clearInterval(statusInterval);
          timeoutReject(new Error('Initialization timeout after 3 minutes'));
        }, 180000); // 3 minutes max
      });

      Promise.race([initPromise, timeoutPromise])
        .then(() => {
          clearInterval(statusInterval);
        })
        .catch((err) => {
          clearInterval(statusInterval);
          console.error('❌ Error initializing WhatsApp client:', err);
          console.error('Error details:', err.message);
          if (err.message.includes('timeout')) {
            console.error('💡 Initialization timed out after 3 minutes');
            console.error('💡 Possible causes:');
            console.error('   1. Slow internet connection');
            console.error('   2. Firewall blocking Chromium');
            console.error('   3. Antivirus blocking the process');
            console.error('   4. WhatsApp Web servers may be slow');
            console.error('💡 Solutions:');
            console.error('   - Check firewall/antivirus settings');
            console.error('   - Try restarting with better internet');
            console.error('   - Clear session folder: rmdir /s /q data\\whatsapp-session');
          }
          reject(err);
        });

      // Additional check: If authenticated and loading is 100%, periodically check if ready
      let authComplete = false;
      let loadingComplete = false;
      
      // Track authentication
      this.client.on('authenticated', () => {
        if (!authComplete) {
          authComplete = true;
          console.log('🔍 Authentication detected - monitoring for ready state...');
        }
      });
      
      // Track loading completion
      this.client.on('loading_screen', (percent) => {
        if (percent === 100 && !loadingComplete) {
          loadingComplete = true;
          console.log('🔍 Loading complete detected - monitoring for ready state...');
        }
      });

      // Check every 3 seconds if we're authenticated and loaded but not ready
      const readyCheckInterval = setInterval(() => {
        if (authComplete && loadingComplete && !this.isReady) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          try {
            // Try multiple ways to check if client is ready
            let isActuallyReady = false;
            
            // Method 1: Check client.info
            if (this.client && this.client.info) {
              isActuallyReady = true;
              console.log('✅ Detected client.info available - client is ready!');
            }
            
            // Method 2: Try to get page (if available)
            if (!isActuallyReady && this.client && this.client.pupPage) {
              isActuallyReady = true;
              console.log('✅ Detected client.pupPage available - client is ready!');
            }
            
            // Method 3: Check if we can access state
            if (!isActuallyReady && this.client && typeof this.client.getState === 'function') {
              try {
                const state = this.client.getState();
                if (state === 'CONNECTED' || state === 'READY') {
                  isActuallyReady = true;
                  console.log(`✅ Detected state: ${state} - client is ready!`);
                }
              } catch (e) {
                // State check failed, but continue
              }
            }
            
            // Fallback: If authenticated and loaded for more than 60 seconds, assume ready
            if (!isActuallyReady && elapsed > 60) {
              console.log('⚠️ Ready event not fired, but authenticated for 60+ seconds');
              console.log('🚀 Assuming client is ready and proceeding...');
              isActuallyReady = true;
            }
            
            if (isActuallyReady) {
              console.log('✅ Client appears ready (detected via check)!');
              console.log('🚀 Proceeding with initialization...');
              clearInterval(readyCheckInterval);
              clearInterval(statusInterval);
              this.isReady = true;
              
              // Try to get client info
              try {
                const clientInfo = this.client.info;
                if (clientInfo && clientInfo.wid) {
                  const connectedNumber = clientInfo.wid.user;
                  console.log(`📱 Connected WhatsApp Number: +${connectedNumber}`);
                  console.log(`💬 Send messages to +${connectedNumber} to interact with the bot!`);
                  console.log(`💡 Or message yourself if you scanned with your own phone.`);
                } else {
                  console.log('📱 Bot is ready! Send messages to the connected WhatsApp number.');
                  console.log('💡 If you scanned with your phone, message yourself to test.');
                }
              } catch (err) {
                console.log('📱 Bot is ready! Send messages to the connected WhatsApp number.');
              }
              
              console.log(`\n🔍 Debug: Message handlers registered. Waiting for messages...\n`);
              resolve();
            } else {
              // Log progress every 15 seconds
              if (elapsed % 15 === 0 && elapsed > 0) {
                console.log(`⏳ Still waiting for ready event... (${elapsed}s elapsed)`);
                console.log('💡 If this takes too long, the client may be stuck. Try restarting.');
              }
            }
          } catch (err) {
            // Not ready yet, continue waiting
            if (elapsed % 15 === 0 && elapsed > 0) {
              console.log(`⏳ Still checking... (${elapsed}s elapsed)`);
            }
          }
        }
      }, 3000); // Check every 3 seconds (more frequent)

      // Clear intervals when ready
      this.client.once('ready', () => {
        clearInterval(readyCheckInterval);
        clearInterval(statusInterval);
      });
    });
  }

  async handleIncomingMessage(message) {
    try {
      // Create consistent message ID (same as in event handler)
      const messageId = message.id?._serialized || 
                       message.id || 
                       `${message.from}_${message.timestamp}_${(message.body || 'media').substring(0, 50)}`;
      
      // Additional check: ignore if already processed (safety net)
      if (this.processedMessages.has(messageId)) {
        console.log('⚠️ Message already processed in handleIncomingMessage, skipping');
        return;
      }
      
      // Mark as processed here too (in case event handler didn't catch it)
      this.processedMessages.add(messageId);
      
      console.log(`📨 Processing message from: ${message.from}, isGroup: ${message.isGroupMsg}, hasMedia: ${message.hasMedia}, type: ${message.type}`);
      
      // Ignore messages from groups or status (redundant check, but safe)
      if (message.from === 'status@broadcast' || message.isGroupMsg) {
        console.log('⚠️ Ignoring group/status message');
        return;
      }

      const phone_number = normalizePhoneNumber(message.from); // Normalize to: 254712345678
      
      // Check if message has media (image, document, etc.)
      if (message.hasMedia) {
        await this.handleMediaMessage(message, phone_number);
        return;
      }

      const incomingMessage = message.body;

      if (!incomingMessage) {
        console.log('⚠️ Message has no body and no media, ignoring');
        return;
      }

      console.log(`✅ Processing message from ${phone_number}: ${incomingMessage}`);

      // Let chatbot handle ALL messages dynamically - no static responses
      // This prevents duplicates and ensures consistent state management
      const ChatbotService = require('./chatbot');
      const response = await ChatbotService.handleMessage(phone_number, incomingMessage);

      // Send response
      if (response) {
        console.log(`📤 Sending response to ${phone_number}`);
        
        // Get session to check state for logo sending
        const UserSession = require('../models/UserSession');
        const session = await new Promise((resolve, reject) => {
          UserSession.get(phone_number, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        
        const currentState = session?.state || 'initial';
        const report_data = session?.report_data || {};
        
        // Only send logo on:
        // 1. First message (greeting/initial state)
        // 2. Last message (report submission confirmation - when report_data has sendLogo and justSubmitted flags)
        const isFirstMessage = this.isGreeting(incomingMessage) && currentState === 'initial';
        const isLastMessage = report_data.sendLogo === true && report_data.justSubmitted === true; // Report just submitted
        const shouldSendLogo = isFirstMessage || isLastMessage;
        
        // Clear session if report was just submitted (after we've checked for logo)
        if (isLastMessage) {
          const UserSession = require('../models/UserSession');
          UserSession.clear(phone_number, () => {
            console.log('✅ Session cleared after report submission');
          });
        }
        
        await this.sendMessage(phone_number, response, { 
          sendLogo: shouldSendLogo 
        });
        console.log(`✅ Response sent successfully`);
      } else {
        console.log('⚠️ No response generated for message');
      }
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
      console.error('Error stack:', error.stack);
      try {
        await this.sendMessage(message.from, '❌ Sorry, an error occurred. Please try again later.');
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  }

  async sendMessage(phone_number, message, options = {}) {
    try {
      if (!this.isReady) {
        console.error('WhatsApp client is not ready');
        return false;
      }

      // Format phone number for WhatsApp (add @c.us suffix)
      const formattedNumber = phone_number.includes('@') ? phone_number : `${phone_number}@c.us`;
      
      // Send image if specified (resized to small avatar size)
      if (options.sendLogo) {
        const path = require('path');
        const fs = require('fs');
        const sharp = require('sharp');
        // Logo path: TrustLogo.png in project root (use __dirname for deployment reliability)
        // Try multiple paths to ensure it works in different environments
        const possiblePaths = [
          path.join(__dirname, '../TrustLogo.png'),  // Relative to services/ directory
          path.join(process.cwd(), 'TrustLogo.png'),  // Project root
          path.resolve(__dirname, '../TrustLogo.png') // Absolute path
        ];
        
        let logoPath = null;
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            logoPath = possiblePath;
            console.log(`✅ Found logo at: ${logoPath}`);
            break;
          }
        }
        
        if (!logoPath) {
          console.warn(`⚠️ TrustLogo.png not found. Tried paths: ${possiblePaths.join(', ')}`);
        } else if (fs.existsSync(logoPath)) {
          try {
            // Ensure data directory exists
            const dataDir = path.join(__dirname, '../data');
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Resize logo to small avatar size (64x64 pixels - very small for WhatsApp)
            const resizedLogoPath = path.join(dataDir, 'logo_resized.png');
            
            // Check if resized logo exists and is recent (within 1 hour), otherwise recreate
            const shouldResize = !fs.existsSync(resizedLogoPath) || 
                                (Date.now() - fs.statSync(resizedLogoPath).mtime.getTime()) > 3600000;
            
            if (shouldResize) {
              await sharp(logoPath)
                .resize(64, 64, {
                  fit: 'contain',
                  background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(resizedLogoPath);
              console.log(`✅ Resized TrustLogo.png to 64x64 small avatar`);
            }
            
            const media = MessageMedia.fromFilePath(resizedLogoPath);
            await this.client.sendMessage(formattedNumber, media, { caption: message });
            console.log(`📷 Sent TrustBridge logo avatar (64x64) with message to ${phone_number}`);
            return true;
          } catch (error) {
            console.error('❌ Error resizing/sending logo:', error.message);
            // Fallback to original logo if resize fails
            try {
              const media = MessageMedia.fromFilePath(logoPath);
              await this.client.sendMessage(formattedNumber, media, { caption: message });
              console.log(`📷 Sent original TrustLogo.png (fallback) with message to ${phone_number}`);
              return true;
            } catch (fallbackError) {
              console.error('❌ Failed to send logo even with fallback:', fallbackError.message);
              // Send text message without logo
              await this.client.sendMessage(formattedNumber, message);
              return true;
            }
          }
        } else {
          console.warn(`⚠️ TrustLogo.png not found at: ${logoPath}`);
        }
      }
      
      await this.client.sendMessage(formattedNumber, message);
      console.log(`Sent message to ${phone_number}`);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  async handleMediaMessage(message, phone_number) {
    try {
      console.log(`📎 Media message received: type=${message.type}, mimetype=${message.mimetype}`);
      
      // Get user session to check if we're in evidence collection state
      const UserSession = require('../models/UserSession');
      const session = await new Promise((resolve, reject) => {
        UserSession.get(phone_number, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const state = session?.state || 'initial';
      const report_data = session?.report_data || {};

      // Allow media uploads during any reporting state (description, location, evidence_question, evidence_media)
      // This makes the flow more flexible and natural
      const isReportingState = state === 'description' || 
                                state === 'location' || 
                                state === 'evidence_question' || 
                                state === 'evidence_media' ||
                                (state === 'initial' && report_data.description); // User started describing issue
      
      if (isReportingState) {
        const media = await message.downloadMedia();
        const fileExtension = this.getFileExtension(message.mimetype || message.type);
        const fileName = `evidence_${Date.now()}_${phone_number}${fileExtension}`;
        const fs = require('fs');
        const path = require('path');

        // Create media directory if it doesn't exist
        const mediaDir = path.join(__dirname, '../data/media');
        if (!fs.existsSync(mediaDir)) {
          fs.mkdirSync(mediaDir, { recursive: true });
        }

        const filePath = path.join(mediaDir, fileName);
        fs.writeFileSync(filePath, media.data, { encoding: 'base64' });

        // Add to report data
        if (!report_data.evidence_files) {
          report_data.evidence_files = [];
        }
        report_data.evidence_files.push({
          fileName: fileName,
          filePath: filePath,
          mimeType: message.mimetype || message.type,
          type: message.type
        });

        // ALWAYS set state to evidence_media after upload - this ensures "done" is recognized
        const newState = 'evidence_media';

        // Save session with updated state IMMEDIATELY - critical for "done" recognition
        // Also ensure evidence_files is properly saved
        await new Promise((resolve, reject) => {
          UserSession.set(phone_number, newState, report_data, (err) => {
            if (err) {
              console.error('❌ Error saving session after evidence upload:', err);
              reject(err);
            } else {
              console.log(`✅ Session updated: state=${newState}, evidence_files=${report_data.evidence_files.length}`);
              // Verify the save by reading it back
              UserSession.get(phone_number, (verifyErr, verifySession) => {
                if (verifyErr) {
                  console.error('⚠️ Warning: Could not verify session save:', verifyErr);
                } else {
                  console.log(`✅ Verified: state=${verifySession?.state}, evidence_files=${verifySession?.report_data?.evidence_files?.length || 0}`);
                }
                resolve();
              });
            }
          });
        });

        const fileCount = report_data.evidence_files.length;
        
        // Quick acknowledgment - no AI delay, no duplicates
        // Only send acknowledgment, don't ask for more - let user say "done" when ready
        await this.sendMessage(phone_number, `✅ File ${fileCount} received!\n\nType *done* when finished uploading.`);
      } else {
        // Not in evidence collection state - use AI to respond creatively
        const aiService = require('./ai');
        if (aiService.model) {
          const responsePrompt = await aiService.generateResponse(
            'The user sent a file/photo but they are not in the report flow yet. Politely explain they need to start a report first by typing "menu" and selecting "Report an Issue". Be friendly and helpful.',
            {
              phone_number,
              state: 'media_out_of_context',
              report_data: {},
              conversation_history: []
            }
          );
          if (responsePrompt) {
            await this.sendMessage(phone_number, responsePrompt);
          } else {
            await this.sendMessage(phone_number, '📷 Please start a report first by typing *menu* and selecting "Report an Issue".');
          }
        } else {
          await this.sendMessage(phone_number, '📷 Please start a report first by typing *menu* and selecting "Report an Issue".');
        }
      }
    } catch (error) {
      console.error('Error handling media message:', error);
      try {
        await this.sendMessage(phone_number, '❌ Error processing your file. Please try again or type *done* to continue without evidence.');
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  }

  isGreeting(message) {
    const greetings = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'habari', 'jambo', 'hujambo', 'sijambo', 'mambo', 'poa',
      'greetings', 'salutations', 'howdy', 'yo', 'sup'
    ];
    
    const messageLower = message.toLowerCase().trim();
    return greetings.some(greeting => 
      messageLower === greeting || 
      messageLower.startsWith(greeting + ' ') ||
      messageLower.includes(' ' + greeting + ' ') ||
      messageLower.endsWith(' ' + greeting)
    );
  }

  getFileExtension(mimeType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
    };
    return extensions[mimeType] || '.bin';
  }

  async sendMessageToNumber(phoneNumber, message) {
    // Normalize phone number first
    const normalized = normalizePhoneNumber(phoneNumber);
    return await this.sendMessage(normalized, message);
  }

  getClient() {
    return this.client;
  }

  isClientReady() {
    return this.isReady;
  }

  async getConnectedNumber() {
    try {
      if (!this.client || !this.isReady) {
        return null;
      }
      const clientInfo = this.client.info;
      if (clientInfo && clientInfo.wid) {
        return clientInfo.wid.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting connected number:', error);
      return null;
    }
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;

