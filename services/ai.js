const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.genAI = null;
    this.model = null;
    
    // Get model name from environment variable or use default
    this.modelName = process.env.GEMINI_CHAT_MODEL || 'models/gemini-2.5-flash';
    
    // Rate limiting: Track requests per minute
    // Free tier: 10 requests/minute (use 8 to be safe)
    // Paid tier 1: 15 requests/minute for gemini-2.5-flash (use 12 to be safe)
    this.requestQueue = [];
    this.requestCount = 0;
    this.windowStart = Date.now();
    this.isProcessingQueue = false;
    
    // Default to 12 RPM for paid tier (safer than 15) - user can override with GEMINI_MAX_RPM
    // Free tier: use 8 RPM, Paid tier: use 12 RPM
    this.maxRequestsPerMinute = parseInt(process.env.GEMINI_MAX_RPM) || 12;
    
    // Minimum delay between requests (in milliseconds) to prevent bursts
    // For paid tier (12 RPM): 60000ms / 12 requests = 5 seconds between requests
    // Add 0.5 second buffer to be safe (5.5 seconds total)
    this.minRequestDelay = Math.ceil(60000 / this.maxRequestsPerMinute) + 500;
    this.lastRequestTime = 0;
    
    if (this.apiKey) {
      // Validate API key format (should start with AIza)
      if (!this.apiKey.startsWith('AIza')) {
        console.warn('⚠️ GOOGLE_API_KEY format looks invalid (should start with "AIza")');
      }
      
      // Log API key status (masked for security)
      const maskedKey = this.apiKey.substring(0, 10) + '...' + this.apiKey.substring(this.apiKey.length - 4);
      console.log(`🔑 Loaded GOOGLE_API_KEY: ${maskedKey}`);
      
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        // Use the configured model (default: models/gemini-2.5-flash)
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        console.log(`✅ Using Gemini model: ${this.modelName}`);
        console.log(`📊 Rate limit: ${this.maxRequestsPerMinute} requests/minute`);
        console.log(`✅ AI Service initialized successfully with API key`);
      } catch (error) {
        console.error('❌ Error initializing Gemini AI:', error.message);
        console.error('💡 Check your GOOGLE_API_KEY in .env file');
        console.error('💡 Ensure Generative Language API is enabled in Google Cloud Console');
        console.error(`💡 Tried to use model: ${this.modelName}`);
        this.model = null;
      }
    } else {
      console.warn('⚠️ GOOGLE_API_KEY not set in .env file - AI features will be disabled');
      console.warn('💡 Add GOOGLE_API_KEY=your_api_key_here to your .env file');
    }
  }

  // Rate limiting helper with queue system to prevent concurrent requests
  async waitForRateLimit() {
    return new Promise((resolve) => {
      // Add request to queue
      this.requestQueue.push(resolve);
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processRequestQueue();
      }
    });
  }

  // Process requests from queue one at a time
  async processRequestQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const resolve = this.requestQueue.shift();
      
      const now = Date.now();
      const windowMs = 60000; // 1 minute
      
      // Reset counter if window expired
      if (now - this.windowStart >= windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }
      
      // Ensure minimum delay between requests to prevent bursts
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestDelay && this.lastRequestTime > 0) {
        const waitTime = this.minRequestDelay - timeSinceLastRequest;
        console.log(`⏳ Spacing requests: waiting ${Math.ceil(waitTime / 1000)}s to prevent rate limit...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // If at limit, wait until window resets
      if (this.requestCount >= this.maxRequestsPerMinute) {
        const waitTime = windowMs - (Date.now() - this.windowStart);
        console.log(`⏳ Rate limit reached (${this.requestCount}/${this.maxRequestsPerMinute}). Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      // Resolve to allow the request to proceed
      resolve();
      
      // Small delay to ensure requests are truly spaced out
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  async generateResponse(userMessage, context = {}, retryCount = 0) {
    if (!this.model) {
      return null; // Return null if AI is not available
    }

    // Rate limiting
    await this.waitForRateLimit();

    try {
      const { phone_number, state, report_data, conversation_history = [] } = context;
      
      // Build context for the AI - SHORTENED for faster responses
      let systemPrompt = `TrustBridge chatbot. Help with: 1) Report Issue, 2) View Reports, 3) Help. Current state: ${state || 'initial'}. Be brief (1-2 sentences max).

CRITICAL ANTI-HALLUCINATION RULES:
1. Only mention "submitted" or "submission" if state is 'report_submitted'. Otherwise, the report is NOT submitted yet.
2. Be ACCURATE - only mention information that actually exists. Do NOT make up reports, categories, or data.
3. Match user selections EXACTLY - if user selects "2" in category state, it means Infrastructure, NOT "View Reports".
4. Be CONSISTENT - do NOT contradict yourself. If user has reports, say so. If they don't, say so. Don't say both.
5. Follow the flow STRICTLY - respect the current state and guide user through it step by step.

${state === 'greeting' ? 'User just greeted. TrustBridge logo will be sent. Start with "🏛️ TrustBridge - Kenyan Government Services", respond warmly, show 3 options: 1. Report Issue, 2. View Reports, 3. Help. Do NOT mention submission.' : ''}
${state === 'initial' ? 'User starting conversation. TrustBridge logo will be sent. Begin with "🏛️ TrustBridge - Kenyan Government Services", greet warmly. Present 3 options: 1. Report Issue, 2. View Reports, 3. Help. Do NOT mention submission - they haven\'t submitted anything yet.' : ''}
${state === 'main_menu' ? 'Show main menu. TrustBridge logo will be sent. Present 3 options: 1. Report Issue, 2. View Reports, 3. Help. Start with "🏛️ TrustBridge - Kenyan Government Services". Do NOT mention submission.' : ''}
${state === 'view_reports' ? 'User wants to view their reports. Show their reports with status (pending, in_progress, resolved). Only mention reports that exist in database. Do NOT mention submission unless showing actual submitted reports.' : ''}
${state === 'no_reports' ? 'User has no reports yet. Encourage them to report an issue. Explain the process. Do NOT mention submission - they haven\'t submitted anything.' : ''}
${state === 'start_report' ? 'User starting to report an issue. TrustBridge logo will be sent. Welcome them to reporting process. Start with "🏛️ TrustBridge". Do NOT mention submission - they are just starting.' : ''}
${state === 'category_extraction' ? 'User described an issue. Extract category (Healthcare, Infrastructure, Education, Security, Other) and ask for more details. Do NOT mention submission - we are just collecting information.' : ''}
${state === 'description_prompt' ? 'Ask user for more details about their issue. Do NOT mention submission - we are still collecting information.' : ''}
${state === 'location_prompt' ? 'Ask user for location of the issue. Do NOT mention submission - we are still collecting information.' : ''}
${state === 'evidence_prompt' ? 'Ask if user has evidence (photos/documents). Do NOT mention submission - we are still collecting information.' : ''}
${state === 'confirmation' ? 'Show report summary and ask user to confirm (yes/no). Do NOT say it is submitted yet - they need to confirm first.' : ''}
${state === 'report_submitted' ? 'User JUST successfully submitted a report. TrustBridge logo will be sent. Thank them warmly, mention report ID, say it will be reviewed. This is the ONLY time to mention submission.' : ''}

${report_data.category ? `Category: ${report_data.category}` : ''}
${report_data.subcategory ? `Subcategory: ${report_data.subcategory}` : ''}
${report_data.description ? `Description: ${report_data.description}` : ''}
${report_data.location ? `Location: ${report_data.location}` : ''}

Guidelines:
- Be friendly, empathetic, and professional
- FOCUS ONLY on: Reporting issues, Viewing reports, or Getting help
- If user asks about other topics, politely redirect to the three main functions
- If the user is reporting an issue, ask for specific details (when did it happen? how severe? who is affected?)
- When showing reports, explain the statuses: pending (waiting), in_progress (being reviewed), resolved (fixed)
- Respond in the same language the user is using (English or Swahili)
- Keep responses concise (2-3 sentences max for WhatsApp)
- If you need more info, ask ONE question at a time
- Be conversational and natural, not robotic
- Show genuine interest in helping

Recent conversation:
${conversation_history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User message: ${userMessage}

Provide a helpful, conversational response that either:
1. Answers their question (if related to reporting issues, viewing reports, or getting help)
2. Politely redirects them to the three main functions if they ask about other topics
3. Asks a clarifying question to gather more information for reporting
4. Guides them through the reporting process

REMEMBER: Only focus on Report an Issue, View My Reports, or Help. If users ask about other topics, politely say: "I'm here to help you report issues, view your reports, or provide help. Which would you like to do?"`;

      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          }
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      // Handle 429 (rate limit) errors with retry and exponential backoff
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        // Extract retry delay from error or use calculated delay
        let retryDelay = this.extractRetryDelay(error);
        
        if (!retryDelay) {
          // Calculate delay based on remaining time in window
          const now = Date.now();
          const windowMs = 60000;
          const timeSinceWindowStart = now - this.windowStart;
          retryDelay = Math.max(windowMs - timeSinceWindowStart, 30000); // At least 30 seconds
        }
        
        // Reset rate limit counters since we hit the limit
        this.requestCount = 0;
        this.windowStart = Date.now();
        
        if (retryCount < 2) { // Max 2 retries
          console.warn(`⚠️ Rate limit hit (429). Retrying in ${Math.ceil(retryDelay / 1000)}s... (attempt ${retryCount + 1}/2)`);
          console.warn(`💡 Current limit: ${this.maxRequestsPerMinute} requests/minute. If this persists, reduce GEMINI_MAX_RPM in .env`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.generateResponse(userMessage, context, retryCount + 1);
        } else {
          console.error('❌ Rate limit exceeded after retries. AI temporarily unavailable.');
          console.error(`💡 Current limit: ${this.maxRequestsPerMinute} requests/minute`);
          console.error('💡 To fix: 1) Enable billing in Google Cloud Console, 2) Reduce GEMINI_MAX_RPM in .env, or 3) Wait a minute');
          return null;
        }
      }
      
      // Handle 404 (model not found) errors
      if (error.message && error.message.includes('404')) {
        console.error(`💡 Model ${this.modelName} not found.`);
        console.error('💡 Check GEMINI_CHAT_MODEL in .env or use default: models/gemini-2.5-flash');
        // Try to reinitialize with default model
        try {
          const defaultModel = 'models/gemini-2.5-flash';
          this.model = this.genAI.getGenerativeModel({ model: defaultModel });
          this.modelName = defaultModel;
          console.log(`✅ Switched to default model: ${defaultModel}`);
        } catch (e) {
          console.error('❌ Could not initialize default model. AI features disabled.');
          this.model = null;
        }
      } else {
        console.error('AI generation error:', error.message || error);
      }
      return null;
    }
  }

  // Extract retry delay from error response
  extractRetryDelay(error) {
    try {
      // Try multiple ways to extract retry delay
      if (error.errorDetails) {
        // Method 1: Check for RetryInfo in errorDetails array
        const retryInfo = error.errorDetails.find(detail => 
          detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' ||
          detail['google.rpc.RetryInfo']
        );
        
        if (retryInfo) {
          const retryDelay = retryInfo.retryDelay || retryInfo['google.rpc.RetryInfo']?.retryDelay;
          if (retryDelay) {
            // Convert to milliseconds if it's in seconds (string format like "31s")
            if (typeof retryDelay === 'string') {
              const seconds = parseFloat(retryDelay.replace('s', ''));
              return seconds * 1000;
            }
            return retryDelay * 1000;
          }
        }
      }
      
      // Method 2: Check error message for retry delay
      if (error.message) {
        const match = error.message.match(/retry.*?(\d+)\s*s/i);
        if (match) {
          return parseInt(match[1]) * 1000;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  async enhanceReportDescription(description, category) {
    if (!this.model) {
      return description;
    }

    // Rate limiting
    await this.waitForRateLimit();

    try {
      const prompt = `The user is reporting a ${category} issue. They said: "${description}"

Please enhance this description by:
1. Making it more detailed and specific
2. Adding relevant context
3. Keeping it clear and professional
4. Not changing the core meaning

Return only the enhanced description, nothing else:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('AI enhancement error:', error);
      return description;
    }
  }

  async askFollowUpQuestion(report_data, state) {
    if (!this.model) {
      return null;
    }

    // Rate limiting
    await this.waitForRateLimit();

    try {
      let prompt = `You're helping a citizen report a ${report_data.category || 'government service'} issue. `;
      
      if (report_data.description) {
        prompt += `They described: "${report_data.description}". `;
      }
      if (report_data.location) {
        prompt += `Location: ${report_data.location}. `;
      }

      prompt += `Current step: ${state}

Generate ONE follow-up question to gather more useful information. 
The question should be:
- Specific and relevant
- Helpful for understanding the issue better
- Concise (one sentence)
- In the same language as the user (detect from context)

Examples of good questions:
- "When did this issue first occur?"
- "How many people are affected by this?"
- "Is this an emergency situation?"
- "Have you reported this before?"

Return only the question, nothing else:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      // Handle 429 errors gracefully - don't retry to avoid cascading rate limits
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.warn('⚠️ Rate limit hit while asking follow-up question. Skipping...');
        return null; // Don't retry follow-up questions to avoid cascading rate limits
      }
      console.error('AI follow-up question error:', error);
      return null;
    }
  }

  async summarizeReport(report_data) {
    if (!this.model) {
      return null;
    }

    // Rate limiting
    await this.waitForRateLimit();

    try {
      const prompt = `Summarize this government service report in 2-3 sentences:

Category: ${report_data.category}
Subcategory: ${report_data.subcategory || 'N/A'}
Description: ${report_data.description}
Location: ${report_data.location}

Provide a clear, professional summary:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('AI summarization error:', error);
      return null;
    }
  }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;

