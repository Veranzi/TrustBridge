const Report = require('../models/Report');
const UserSession = require('../models/UserSession');
const TranslationService = require('./translation');
const aiService = require('./ai');

const CATEGORIES = {
  '1': { name: 'Healthcare', subcategories: ['Hospital', 'Clinic', 'Pharmacy', 'Ambulance'] },
  '2': { name: 'Infrastructure', subcategories: ['Roads', 'Bridges', 'Water Supply', 'Electricity'] },
  '3': { name: 'Education', subcategories: ['School', 'University', 'Library', 'Scholarship'] },
  '4': { name: 'Security', subcategories: ['Police', 'Emergency', 'Safety', 'Crime'] },
  '5': { name: 'Other', subcategories: [] }
};

const STATES = {
  INITIAL: 'initial',
  CATEGORY: 'category',
  SUBCATEGORY: 'subcategory',
  DESCRIPTION: 'description',
  LOCATION: 'location',
  EVIDENCE_QUESTION: 'evidence_question',
  EVIDENCE_MEDIA: 'evidence_media',
  CONFIRM: 'confirm'
};

class ChatbotService {
  static async handleMessage(phone_number, message) {
    try {
      return await this._handleMessageInternal(phone_number, message);
    } catch (error) {
      console.error('❌ Error in ChatbotService.handleMessage:', error);
      console.error('Error stack:', error.stack);
      
      // Try to provide a helpful error message using AI if available
      if (aiService.model) {
        try {
          const errorResponse = await aiService.generateResponse(
            'An error occurred while processing the user\'s message. Apologize and ask them to try again or type "menu" to start over.',
            {
              phone_number,
              state: 'error',
              report_data: {},
              conversation_history: []
            }
          );
          return errorResponse || '❌ Sorry, an error occurred. Please try again or type *menu* to start over.';
        } catch (aiError) {
          console.error('Error generating AI error message:', aiError);
        }
      }
      
      // Try AI for error message
      if (aiService.model) {
        try {
          const errorResponse = await aiService.generateResponse(
            'An error occurred. Apologize and ask user to try again or type menu. Be brief.',
            {
              phone_number,
              state: 'error',
              report_data: {},
              conversation_history: []
            }
          );
          return errorResponse || 'Sorry, an error occurred. Please try again or type *menu*.';
        } catch (aiError) {
          console.error('Error generating AI error message:', aiError);
        }
      }
      return 'Sorry, an error occurred. Please try again or type *menu*.';
    }
  }
  
  static async _handleMessageInternal(phone_number, message) {
    const session = await new Promise((resolve, reject) => {
      UserSession.get(phone_number, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const state = session?.state || STATES.INITIAL;
    const report_data = session?.report_data || {};
    
    // Debug logging for state tracking
    console.log(`🔍 Processing message in state: ${state}, message: "${message.substring(0, 50)}", category: ${report_data.category || 'none'}, subcategory: ${report_data.subcategory || 'none'}, evidence_files: ${report_data.evidence_files?.length || 0}`);
    
    // Detect user language and store in session
    let userLanguage = report_data.language || 'en';
    if (!report_data.language && message.trim().length > 3) {
      const detectedLang = await TranslationService.detectLanguage(message);
      if (detectedLang === 'sw' || TranslationService.isSwahili(message)) {
        userLanguage = 'sw';
        report_data.language = 'sw';
      } else {
        userLanguage = 'en';
        report_data.language = 'en';
      }
    }

    let response = '';
    let newState = state;
    let shouldSave = false;

    // Detect greetings and handle with AI - keep it dynamic
    const isGreeting = this.isGreeting(message);
    if (isGreeting && state === STATES.INITIAL) {
      // Use AI for dynamic greeting but keep it brief for speed
      const greetingResponse = await aiService.generateResponse(
        `User greeted: "${message}". Respond warmly, introduce TrustBridge, show 3 options: 1. Report Issue, 2. View Reports, 3. Help. Be brief (2 sentences max).`,
        {
          phone_number,
          state: 'greeting',
          report_data: { language: userLanguage, sendLogo: true },
          conversation_history: []
        }
      );
      
      if (greetingResponse) {
        // Set flag for logo on first greeting
        report_data.sendLogo = true;
        await new Promise((resolve, reject) => {
          UserSession.set(phone_number, STATES.INITIAL, report_data, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return greetingResponse;
      }
    }

    // Handle menu commands
    if (message.toLowerCase() === 'menu' || message.toLowerCase() === 'help') {
      await new Promise((resolve, reject) => {
        UserSession.set(phone_number, STATES.INITIAL, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const menuResponse = await this.getMainMenu(userLanguage, phone_number, { ...report_data, sendLogo: false });
      if (menuResponse) {
        return menuResponse;
      }
      // If menu is null, try AI one more time
      if (aiService.model) {
        const emergencyMenu = await aiService.generateResponse(
          'Show TrustBridge menu with 3 options. Be brief.',
          {
            phone_number,
            state: 'emergency_menu',
            report_data: { ...report_data, language: userLanguage },
            conversation_history: []
          }
        );
        return emergencyMenu || '🏛️ TrustBridge\n\n1. Report Issue\n2. View Reports\n3. Help';
      }
      return '🏛️ TrustBridge\n\n1. Report Issue\n2. View Reports\n3. Help';
    }

    // REMOVED: Global "2" check - this was causing issues when user selects category "2" (Infrastructure)
    // "View Reports" should only work in INITIAL state, handled in the switch statement below
    if (message.toLowerCase() === 'my reports' && state === STATES.INITIAL) {
      await new Promise((resolve, reject) => {
        UserSession.set(phone_number, STATES.INITIAL, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return await this.getUserReports(phone_number);
    }

    // Detect if user is reporting an issue - improved detection for short messages
    // Also handle follow-up responses to AI's clarifying questions
    if (state === STATES.INITIAL && !response && !isGreeting) {
      if (aiService.model) {
        const conversationHistory = report_data.conversation_history || [];
        
        // Check if we're in a conversation flow (AI asked questions, user is responding)
        const isFollowUpResponse = conversationHistory.length > 0 && 
                                   conversationHistory[conversationHistory.length - 1]?.role === 'assistant' &&
                                   (conversationHistory[conversationHistory.length - 1]?.content?.toLowerCase().includes('could you') ||
                                    conversationHistory[conversationHistory.length - 1]?.content?.toLowerCase().includes('tell me more') ||
                                    conversationHistory[conversationHistory.length - 1]?.content?.toLowerCase().includes('which') ||
                                    conversationHistory[conversationHistory.length - 1]?.content?.includes('?'));
        
        // Improved issue detection - check for keywords even in short messages
        const issueKeywords = [
          'problem', 'issue', 'broken', 'damaged', 'not working', 'faulty',
          'hospital', 'clinic', 'pharmacy', 'ambulance', 'health', 'medical',
          'road', 'roads', 'bridge', 'bridges', 'water', 'electricity', 'power', 'infrastructure',
          'school', 'university', 'library', 'libraries', 'education', 'scholarship',
          'police', 'security', 'crime', 'emergency', 'safety',
          'tatizo', 'shida', 'hospitali', 'barabara', 'shule', 'polisi'
        ];
        
        const messageLower = message.toLowerCase();
        const isIssueDescription = (message.length > 3 && 
          !message.match(/^(1|2|3|menu|help|report|view|my reports|yes|no)$/i) &&
          issueKeywords.some(keyword => messageLower.includes(keyword))) || isFollowUpResponse;
        
        if (isIssueDescription) {
          // User is describing an issue or responding to clarifying questions
          // If we already have a description (from previous conversation), append this as additional context
          if (report_data.description && isFollowUpResponse) {
            report_data.description += ' ' + message;
          } else if (!report_data.description) {
            report_data.description = message;
          }
          report_data.conversation_history = conversationHistory;
          
          // First, try to extract category from keywords - PRIORITIZE EDUCATION
          let detectedCategory = null;
          const msgLower = messageLower;
          
          // Education keywords - CHECK FIRST (most specific)
          // Include: university, funding, scholarship, education, school, library, student, teacher, tuition, curriculum, exam, learning
          if (msgLower.match(/\b(university|universities|funding|scholarship|education|school|schools|library|libraries|student|students|teacher|teachers|tuition|curriculum|exam|exams|learning|teaching|academic|academics|university funding|education funding|school funding)\b/i)) {
            detectedCategory = 'Education';
          }
          // Healthcare keywords
          else if (msgLower.match(/\b(hospital|hospitals|clinic|clinics|pharmacy|pharmacies|ambulance|ambulances|health|medical|doctor|doctors|nurse|nurses|patient|patients|medicine|medication|treatment|surgery)\b/i)) {
            detectedCategory = 'Healthcare';
          }
          // Infrastructure keywords
          else if (msgLower.match(/\b(road|roads|bridge|bridges|water|electricity|power|street|streets|highway|highways|pothole|potholes|drainage|sewer|sewage|pipeline|pipelines)\b/i)) {
            detectedCategory = 'Infrastructure';
          }
          // Security keywords
          else if (msgLower.match(/\b(police|security|crime|crimes|criminal|emergency|safety|theft|robbery|robberies|violence|violent)\b/i)) {
            detectedCategory = 'Security';
          }
          
          // Use AI to extract category - BE CREATIVE AND HELPFUL
          // If category is unclear, ask clarifying questions instead of forcing one
          const categoryExtractionPrompt = await aiService.generateResponse(
            `User described an issue: "${message}". 
            
            YOUR ROLE: Help the user categorize their issue creatively and conversationally.
            
            AVAILABLE CATEGORIES:
            1. EDUCATION - Universities, schools, libraries, funding, scholarships, curriculum, exams, students, teachers
            2. HEALTHCARE - Hospitals, clinics, pharmacies, ambulances, medical services, doctors, health
            3. INFRASTRUCTURE - Roads, bridges, water supply, electricity, streets, drainage, sewage
            4. SECURITY - Police, emergency services, crime, safety, theft
            5. OTHER - Anything that doesn't fit the above
            
            INSTRUCTIONS:
            - If the issue CLEARLY matches a category (e.g., "university funding" = Education, "hospital problem" = Healthcare), respond with:
              "CATEGORY: [CategoryName]" on the first line, then ask for more details.
            
            - If the issue is UNCLEAR or could fit multiple categories, BE CREATIVE:
              * Ask friendly clarifying questions
              * Suggest which category might fit and why
              * Help them understand what each category covers
              * Be conversational, not robotic
              * Example: "I see you mentioned [something]. This could be related to [Category A] or [Category B]. Could you tell me more about [specific aspect]?"
            
            - If it's clearly not in the main categories, suggest "Other" but still ask for details.
            
            BE CREATIVE: Think outside the box. "University funding model" = Education. "Road maintenance" = Infrastructure. But if someone says "government service delay", ask which service area it affects.
            
            IMPORTANT: Do NOT mention "submitted" or "submission" - we are just collecting information.`,
            {
              phone_number,
              state: 'category_extraction',
              report_data: { ...report_data, description: message, language: userLanguage },
              conversation_history: conversationHistory
            }
          );
          
          if (categoryExtractionPrompt) {
            // Check if AI provided a clear category or is asking questions
            const lines = categoryExtractionPrompt.split('\n');
            const firstLine = lines[0].trim();
            const categoryNames = ['Healthcare', 'Infrastructure', 'Education', 'Security', 'Other'];
            
            // Check if first line contains "CATEGORY:" or a category name
            let extractedCategory = null;
            if (firstLine.toLowerCase().includes('category:')) {
              // Extract category after "CATEGORY:"
              const categoryPart = firstLine.split(':')[1]?.trim() || '';
              extractedCategory = categoryNames.find(cat => 
                categoryPart.toLowerCase().includes(cat.toLowerCase())
              );
            } else {
              // Check if any category name appears in first line
              extractedCategory = categoryNames.find(cat => 
                firstLine.toLowerCase().includes(cat.toLowerCase())
              );
            }
            
            // If AI is asking clarifying questions (no clear category), stay in INITIAL and let user respond
            const isAskingQuestions = categoryExtractionPrompt.toLowerCase().includes('could you') || 
                                      categoryExtractionPrompt.toLowerCase().includes('tell me more') ||
                                      categoryExtractionPrompt.toLowerCase().includes('which') ||
                                      categoryExtractionPrompt.toLowerCase().includes('what') ||
                                      categoryExtractionPrompt.toLowerCase().includes('?') ||
                                      !extractedCategory;
            
            if (isAskingQuestions && !detectedCategory) {
              // AI is being creative and asking questions - don't force a category yet
              // Store the description and let user respond to the questions
              if (isFollowUpResponse && report_data.description) {
                // User is responding to AI's questions - append to description
                report_data.description += ' ' + message;
              } else {
                report_data.description = message;
              }
              report_data.conversation_history = [...(conversationHistory || []), { role: 'user', content: message }, { role: 'assistant', content: categoryExtractionPrompt }];
              response = categoryExtractionPrompt;
              newState = STATES.INITIAL; // Stay in INITIAL to continue conversation
              shouldSave = true;
            } else {
              // AI provided a clear category or we detected one from keywords
              report_data.category = detectedCategory || extractedCategory || 'Other';
              
              // If this is a follow-up response and we now have enough info, use it
              if (isFollowUpResponse && report_data.description) {
                // Keep the full description from conversation
                console.log(`✅ Category determined: ${report_data.category} after clarifying questions`);
              }
              
              // Remove category marker from response if present
              if (extractedCategory && firstLine.toLowerCase().includes('category:')) {
                response = lines.slice(1).join('\n').trim() || categoryExtractionPrompt.replace(/^.*?category:.*?\n/i, '').trim();
              } else if (extractedCategory && lines.length > 1) {
                response = lines.slice(1).join('\n').trim() || categoryExtractionPrompt;
              } else {
                response = categoryExtractionPrompt;
              }
              
              newState = STATES.DESCRIPTION;
              shouldSave = true;
            }
          } else if (detectedCategory) {
            // If AI fails but we detected category, use it
            report_data.category = detectedCategory;
            const prompt = await aiService.generateResponse(
              `User reported ${detectedCategory} issue: "${message}". Ask for more details. Be brief. IMPORTANT: Do NOT mention "submitted" or "submission" - we are just collecting information.`,
              {
                phone_number,
                state: 'description_prompt',
                report_data,
                conversation_history: []
              }
            );
            response = prompt || `Please provide more details about this ${detectedCategory} issue:`;
            newState = STATES.DESCRIPTION;
            shouldSave = true;
          }
        } else {
          // Not an issue description - show menu immediately
          response = await this.getMainMenu(userLanguage, phone_number, report_data);
        }
      }
    }

    switch (state) {
      case STATES.INITIAL:
        // CRITICAL: Only handle menu commands (1, 2, 3) in INITIAL state
        // If user has report data, they're in middle of reporting - continue that flow
        if (report_data.category || report_data.description) {
          // User is in middle of reporting, don't reset - continue with their report
          console.log(`⚠️ User in INITIAL state but has report data. Category: ${report_data.category}, Description: ${report_data.description ? 'yes' : 'no'}`);
          // Move to appropriate state based on what they have
          if (report_data.description && report_data.location) {
            newState = STATES.EVIDENCE_QUESTION;
            const evidencePrompt = await aiService.generateResponse(
              'Ask if user has evidence (photos/documents). Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
              {
                phone_number,
                state: 'evidence_prompt',
                report_data,
                conversation_history: []
              }
            );
            response = evidencePrompt || '📷 Do you have photos or documents as evidence?';
            shouldSave = true;
          } else if (report_data.description) {
            newState = STATES.LOCATION;
            const locationPrompt = await aiService.generateResponse(
              'Ask for location. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
              {
                phone_number,
                state: 'location_prompt',
                report_data,
                conversation_history: []
              }
            );
            response = locationPrompt || '📍 Please provide the location:';
            shouldSave = true;
          } else if (report_data.category) {
            newState = STATES.SUBCATEGORY;
            const category = Object.values(CATEGORIES).find(cat => cat.name === report_data.category);
            if (category && category.subcategories.length > 0) {
              const subcategoryList = category.subcategories.map((sub, idx) => `${idx + 1}. ${sub}`).join('\n');
              response = `📋 *Select Subcategory for ${report_data.category}:*\n\n${subcategoryList}\n\n💡 Type the name or number.`;
            } else {
              newState = STATES.DESCRIPTION;
              const descriptionPrompt = await aiService.generateResponse(
                `Ask user to describe the ${report_data.category} issue. Be brief. IMPORTANT: Do NOT mention "submitted" - we are just collecting information.`,
                {
                  phone_number,
                  state: 'description_prompt',
                  report_data,
                  conversation_history: []
                }
              );
              response = descriptionPrompt || `📝 Please describe the ${report_data.category} issue:`;
            }
            shouldSave = true;
          }
        } else {
          // Truly in INITIAL state - handle menu commands STRICTLY
          // Only process 1, 2, 3 as menu options when in INITIAL state
          const trimmedMsg = message.trim().toLowerCase();
          
          if (trimmedMsg === '1' || trimmedMsg === 'report an issue' || trimmedMsg === 'ripoti tatizo') {
            response = await this.startReport(phone_number, userLanguage);
          } else if (trimmedMsg === '2' || trimmedMsg === 'view my reports' || trimmedMsg === 'my reports' || trimmedMsg === 'angalia ripoti zangu') {
            response = await this.getUserReports(phone_number);
          } else if (trimmedMsg === '3' || trimmedMsg === 'help' || trimmedMsg === 'msaada') {
            // Use AI to generate help message
            const helpResponse = await aiService.generateResponse(
              'The user asked for help. Explain how to use TrustBridge, how to report issues, and what options are available. Be friendly and helpful.',
              {
                phone_number,
                state: 'help',
                report_data: { ...report_data, language: userLanguage },
                conversation_history: []
              }
            );
            response = helpResponse || await this.getMainMenu(userLanguage, phone_number, { ...report_data, sendLogo: false });
          } else {
            // Show main menu for any other message in initial state
            response = await this.getMainMenu(userLanguage, phone_number, { ...report_data, sendLogo: false });
          }
        }
        break;

      case STATES.CATEGORY:
        // CRITICAL: In CATEGORY state, user is selecting a category
        // Numbers 1-5 mean categories, NOT menu options
        // Be strict and accurate - match exactly what user selects
        const categoryKeys = Object.keys(CATEGORIES);
        const allCategories = Object.values(CATEGORIES).map(cat => cat.name);
        const categoryList = allCategories.join(', ');
        
        // First, try to match by number or exact name - STRICT MATCHING
        let selectedCategory = null;
        let matchedKey = null;
        
        const trimmedMessage = message.trim().toLowerCase();
        
        // PRIORITY 1: Check if it's a number (1-5) - this is a category selection, NOT menu
        if (/^\d+$/.test(trimmedMessage)) {
          const num = parseInt(trimmedMessage);
          if (num >= 1 && num <= categoryKeys.length) {
            matchedKey = categoryKeys[num - 1];
            selectedCategory = CATEGORIES[matchedKey];
            console.log(`✅ Category selected by number: ${num} = ${selectedCategory.name}`);
          }
        }
        
        // PRIORITY 2: If not a number, try exact category name match
        if (!selectedCategory) {
        } else if (CATEGORIES[trimmedMessage]) {
          // Check if it's a direct key match
          matchedKey = trimmedMessage;
          selectedCategory = CATEGORIES[matchedKey];
        } else {
          // Enhanced keyword matching for natural language
          const categoryKeywords = {
            '1': ['healthcare', 'health', 'hospital', 'hospitals', 'clinic', 'clinics', 'pharmacy', 'medical', 'doctor', 'nurse', 'patient', 'ambulance'],
            '2': ['infrastructure', 'road', 'roads', 'bridge', 'bridges', 'water', 'electricity', 'power', 'street', 'streets', 'highway', 'pothole', 'drainage', 'sewer', 'barabara'],
            '3': ['education', 'school', 'schools', 'university', 'universities', 'library', 'libraries', 'student', 'students', 'teacher', 'teachers', 'scholarship', 'shule'],
            '4': ['security', 'police', 'emergency', 'crime', 'safety', 'theft', 'robbery', 'polisi'],
            '5': ['other', 'misc', 'miscellaneous']
          };
          
          // Try to match by category name first
          for (const key of categoryKeys) {
            const cat = CATEGORIES[key];
            if (cat.name.toLowerCase() === trimmedMessage || 
                trimmedMessage.includes(cat.name.toLowerCase()) ||
                cat.name.toLowerCase().includes(trimmedMessage)) {
              matchedKey = key;
              selectedCategory = cat;
              break;
            }
          }
          
          // If no match, try keyword matching
          if (!selectedCategory) {
            for (const key of categoryKeys) {
              const keywords = categoryKeywords[key] || [];
              if (keywords.some(keyword => trimmedMessage.includes(keyword) || keyword.includes(trimmedMessage))) {
                matchedKey = key;
                selectedCategory = CATEGORIES[key];
                break;
              }
            }
          }
        }
        
        // If no direct match, use AI to interpret - but be STRICT and ACCURATE
        if (!selectedCategory && aiService.model) {
          const categoryInterpretation = await aiService.generateResponse(
            `User said: "${message}" while selecting a category.
            
            CRITICAL: User is in CATEGORY selection state. They must choose one of these EXACT categories:
            1. Healthcare (hospitals, clinics, pharmacies, ambulances, medical)
            2. Infrastructure (roads, bridges, water, electricity, streets, drainage)
            3. Education (schools, universities, libraries, scholarships)
            4. Security (police, emergency, crime, safety)
            5. Other
            
            Respond with ONLY the exact category name: Healthcare, Infrastructure, Education, Security, or Other.
            Do NOT mention "submitted" or "submission" - we are just selecting a category.
            Be ACCURATE - match the user's intent to one of these 5 categories exactly.
            Do NOT hallucinate or make up categories.`,
            {
              phone_number,
              state: 'category_interpretation',
              report_data,
              conversation_history: []
            }
          );
          
          if (categoryInterpretation && categoryInterpretation !== 'UNKNOWN') {
            // Extract category name from AI response
            const categoryNames = ['Healthcare', 'Infrastructure', 'Education', 'Security', 'Other'];
            const extractedCategory = categoryNames.find(cat => 
              categoryInterpretation.toLowerCase().includes(cat.toLowerCase()) ||
              cat.toLowerCase().includes(categoryInterpretation.trim().toLowerCase())
            );
            
            if (extractedCategory) {
              // Find the matched category key
              for (const key of categoryKeys) {
                const cat = CATEGORIES[key];
                if (cat.name === extractedCategory) {
                  matchedKey = key;
                  selectedCategory = cat;
                  break;
                }
              }
            }
          }
        }
        
        if (selectedCategory) {
          report_data.category = selectedCategory.name;
          if (selectedCategory.subcategories.length > 0) {
            // Quick subcategory menu - direct response for speed
            const subcategoryList = selectedCategory.subcategories.map((sub, idx) => `${idx + 1}. ${sub}`).join('\n');
            response = `📋 *Select Subcategory for ${selectedCategory.name}:*\n\n${subcategoryList}\n\n💡 Type the name or number.`;
            newState = STATES.SUBCATEGORY;
          } else {
            // Quick description prompt - direct and fast
            response = `📝 Please describe the ${selectedCategory.name} issue. Be as detailed as possible.`;
            newState = STATES.DESCRIPTION;
          }
          shouldSave = true;
        } else {
          // Quick error - no AI delay for speed
          response = await this.getCategoryMenu(userLanguage, phone_number, report_data);
        }
        break;

      case STATES.SUBCATEGORY:
        // Safety check: ensure report_data.category exists
        if (!report_data.category) {
          // Category is missing - reset to category selection
          console.warn('⚠️ Category missing in SUBCATEGORY state, resetting to category selection');
          response = await this.getCategoryMenu(userLanguage, phone_number, report_data);
          newState = STATES.CATEGORY;
          shouldSave = true;
          break;
        }
        
        // Find the category object that matches the current report_data.category
        const subcategoryCategoryKey = Object.keys(CATEGORIES).find(k => CATEGORIES[k] && CATEGORIES[k].name === report_data.category);
        const category = subcategoryCategoryKey && CATEGORIES[subcategoryCategoryKey] ? CATEGORIES[subcategoryCategoryKey] : null;
        
        if (!category) {
          // Category not found - reset to category selection
          console.warn(`⚠️ Category "${report_data.category}" not found, resetting to category selection`);
          response = await this.getCategoryMenu(userLanguage, phone_number, report_data);
          newState = STATES.CATEGORY;
          shouldSave = true;
          break;
        }
        
        // CRITICAL: In SUBCATEGORY state, user is selecting a subcategory
        // Be strict and accurate - match exactly what user selects
        let selectedSubcategory = null;
        const trimmedSubMessage = message.trim().toLowerCase();
        
        // PRIORITY 1: Check if it's a number (1, 2, 3, etc.) - strict number match
        if (category.subcategories && /^\d+$/.test(trimmedSubMessage)) {
          const num = parseInt(trimmedSubMessage);
          if (num >= 1 && num <= category.subcategories.length) {
            selectedSubcategory = category.subcategories[num - 1];
            console.log(`✅ Subcategory selected by number: ${num} = ${selectedSubcategory}`);
          }
        }
        
        // PRIORITY 2: Try exact name match (case-insensitive)
        if (!selectedSubcategory && category.subcategories) {
          for (const sub of category.subcategories) {
            if (sub.toLowerCase() === trimmedSubMessage) {
              selectedSubcategory = sub;
              console.log(`✅ Subcategory selected by name: ${sub}`);
              break;
            }
          }
        }
        
        // PRIORITY 3: Try partial match (if exact didn't work)
        if (!selectedSubcategory && category.subcategories) {
          for (const sub of category.subcategories) {
            if (trimmedSubMessage.includes(sub.toLowerCase()) || sub.toLowerCase().includes(trimmedSubMessage)) {
              selectedSubcategory = sub;
              console.log(`✅ Subcategory selected by partial match: ${sub}`);
              break;
            }
          }
        }
        
        // If no direct match, use AI to interpret - but be STRICT and ACCURATE
        if (!selectedSubcategory && category.subcategories && category.subcategories.length > 0 && aiService.model) {
          const subcategoryInterpretation = await aiService.generateResponse(
            `User said: "${message}" while selecting a subcategory for ${report_data.category}.
            
            CRITICAL: User is in SUBCATEGORY selection state. Available subcategories are: ${category.subcategories.join(', ')}.
            
            Respond with ONLY the exact subcategory name from this list: ${category.subcategories.join(', ')}.
            If unclear or doesn't match, respond with "UNKNOWN".
            Do NOT mention "submitted" or "submission" - we are just selecting a subcategory.
            Be ACCURATE - match exactly to one of the listed subcategories. Do NOT hallucinate.`,
            {
              phone_number,
              state: 'subcategory_interpretation',
              report_data,
              conversation_history: []
            }
          );
          
          if (subcategoryInterpretation && subcategoryInterpretation !== 'UNKNOWN') {
            // Find the matched subcategory
            for (const sub of category.subcategories) {
              if (sub.toLowerCase() === subcategoryInterpretation.trim().toLowerCase() ||
                  subcategoryInterpretation.toLowerCase().includes(sub.toLowerCase())) {
                selectedSubcategory = sub;
                break;
              }
            }
          }
        }
        
        if (selectedSubcategory) {
          report_data.subcategory = selectedSubcategory;
          console.log(`✅ Subcategory selected: ${selectedSubcategory} for category: ${report_data.category}. Moving to DESCRIPTION state.`);
          // Use AI for description prompt
          const descriptionPrompt = await aiService.generateResponse(
            `User selected ${selectedSubcategory} subcategory for ${report_data.category}. Ask them to describe the issue. Be brief and friendly. IMPORTANT: Do NOT mention "submitted" - we are just collecting information.`,
            {
              phone_number,
              state: 'description_prompt',
              report_data: { ...report_data, subcategory: selectedSubcategory },
              conversation_history: []
            }
          );
          response = descriptionPrompt || `📝 Please describe the ${report_data.category} - ${selectedSubcategory} issue. Be as detailed as possible.`;
          newState = STATES.DESCRIPTION;
          shouldSave = true;
          // CRITICAL: Save state immediately to prevent reset
          await new Promise((resolve, reject) => {
            UserSession.set(phone_number, newState, report_data, (err) => {
              if (err) {
                console.error('❌ Error saving state after subcategory selection:', err);
                reject(err);
              } else {
                console.log(`✅ State saved: ${newState}, subcategory: ${selectedSubcategory}`);
                resolve();
              }
            });
          });
        } else if (message.length > 10 && !parseInt(message.trim())) {
          // User typed free-form text (not a number or subcategory) - treat as description
          // This handles cases like "Model of funding and it's tabulation.it hard to compute"
          console.log(`✅ User typed free-form text in SUBCATEGORY state, treating as description: "${message.substring(0, 50)}"`);
          report_data.subcategory = null; // No specific subcategory, but accept the description
          report_data.description = message;
          const locationPrompt = await aiService.generateResponse(
            'Thank user for description. Ask for location. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'location_prompt',
              report_data: { ...report_data, description: message },
              conversation_history: []
            }
          );
          response = locationPrompt || '📍 Please provide the location of this issue:';
          newState = STATES.LOCATION;
          shouldSave = true;
        } else {
          // Use AI to generate error message dynamically and remind them they can type name or number
          const errorPrompt = await aiService.generateResponse(
            `User entered "${message}" which doesn't match any subcategory. Available subcategories for ${report_data.category} are: ${category.subcategories ? category.subcategories.join(', ') : 'none'}. 
            Politely tell them they can select by typing the subcategory name (like "Hospital" or "Roads") or the number. Show the subcategories again. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.`,
            {
              phone_number,
              state: 'subcategory_error',
              report_data,
              conversation_history: []
            }
          );
          
          if (category.subcategories && category.subcategories.length > 0) {
            const subcategoryList = category.subcategories.map((sub, idx) => `${idx + 1}. ${sub}`).join('\n');
            if (errorPrompt) {
              response = errorPrompt + '\n\n*Select Subcategory:*\n' + subcategoryList + '\n\nYou can type the name or number.';
            } else {
              // Generate dynamic error message if AI failed
              const fallbackError = await aiService.generateResponse(
                `The user entered an invalid subcategory. Show them the valid subcategories: ${category.subcategories.join(', ')}.`,
                {
                  phone_number,
                  state: 'subcategory_error_fallback',
                  report_data,
                  conversation_history: []
                }
              );
              if (fallbackError) {
                response = fallbackError + '\n\n*Select Subcategory:*\n' + subcategoryList + '\n\nYou can type the name or number.';
              } else {
                // Use AI for error message
                const errorMsg = await aiService.generateResponse(
                  'User selected invalid subcategory. Show subcategories and ask to select again. Be brief.',
                  {
                    phone_number,
                    state: 'subcategory_error_final',
                    report_data,
                    conversation_history: []
                  }
                );
                response = errorMsg ? errorMsg + '\n\n' + subcategoryList : `Please select:\n\n${subcategoryList}`;
              }
            }
          } else {
            // Generate dynamic error if no subcategories
            if (!errorPrompt) {
              const fallbackError = await aiService.generateResponse(
                'The user entered an invalid subcategory. Apologize and ask them to try again.',
                {
                  phone_number,
                  state: 'subcategory_error_no_list',
                  report_data,
                  conversation_history: []
                }
              );
              response = fallbackError || 'Invalid option. Please try again.';
            } else {
              response = errorPrompt;
            }
          }
        }
        break;

      case STATES.DESCRIPTION:
        // Handle follow-up answers or skip
        if (report_data.awaiting_followup) {
          if (message.toLowerCase() === 'skip' || message.toLowerCase() === 'next') {
            report_data.awaiting_followup = false;
            const locationPrompt = await aiService.generateResponse(
              'User skipped follow-up. Ask for location of the issue. Be brief.',
              {
                phone_number,
                state: 'location_prompt_skip',
                report_data,
                conversation_history: []
              }
            );
            response = locationPrompt || 'Please provide the location:';
            newState = STATES.LOCATION;
            shouldSave = true;
          } else {
            // Store follow-up answer and ask another question or move on
            if (!report_data.followup_answers) {
              report_data.followup_answers = [];
            }
            report_data.followup_answers.push(message);
            
            // Move to location with AI prompt
            report_data.awaiting_followup = false;
            const locationPrompt = await aiService.generateResponse(
              'Thank user for details. Ask for location of the issue. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
              {
                phone_number,
                state: 'location_prompt',
                report_data,
                conversation_history: []
              }
            );
            response = locationPrompt || 'Please provide the location:';
            newState = STATES.LOCATION;
            shouldSave = true;
          }
        } else if (message.trim().length < 10) {
          // Use AI to ask for more details
          const moreDetailsPrompt = await aiService.generateResponse(
            'User description too short. Ask for more details. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'description_prompt',
              report_data,
              conversation_history: []
            }
          );
          response = moreDetailsPrompt;
        } else {
          // Initial description - use AI to enhance and ask follow-up
          const enhancedDescription = await aiService.enhanceReportDescription(message, report_data.category);
          report_data.description = enhancedDescription || message;
          
          // Store description and move to location immediately - no AI delays for speed
          report_data.description = message;
          report_data.awaiting_followup = false;
          response = '📍 Please provide the location of this issue:';
          newState = STATES.LOCATION;
          shouldSave = true;
        }
        break;

      case STATES.LOCATION:
        // Store or append location (allow multiple messages for detailed location)
        if (report_data.location) {
          report_data.location += ' ' + message;
          report_data.location = report_data.location.trim();
        } else {
          report_data.location = message;
        }
        
        // Use AI to check location and ask for evidence
        if (report_data.location.length < 5) {
          const moreLocationPrompt = await aiService.generateResponse(
            'Location too short. Ask for more details. Be brief.',
            {
              phone_number,
              state: 'location_more_details',
              report_data,
              conversation_history: []
            }
          );
          response = moreLocationPrompt || 'Please provide more location details:';
          newState = STATES.LOCATION;
        } else {
          // Location is good, ask for evidence with AI
          const evidencePrompt = await aiService.generateResponse(
            'Thank for location. Ask if they have evidence (photos/documents). Be brief and enthusiastic. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'evidence_prompt',
              report_data,
              conversation_history: []
            }
          );
          response = evidencePrompt || 'Do you have photos or documents as evidence?';
          newState = STATES.EVIDENCE_QUESTION;
        }
        shouldSave = true;
        break;

      case STATES.EVIDENCE_QUESTION:
        // CRITICAL: If evidence already exists, skip yes/no and go straight to confirmation
        if (report_data.evidence_files && report_data.evidence_files.length > 0) {
          console.log(`✅ Evidence already exists (${report_data.evidence_files.length} files). Skipping yes/no, going to confirmation.`);
          const confirmationMsg = await this.getConfirmationMessage(report_data);
          response = `✅ ${report_data.evidence_files.length} file(s) already uploaded.\n\n${confirmationMsg}`;
          newState = STATES.CONFIRM;
          shouldSave = true;
        }
        // Handle "done" - user may have already uploaded evidence
        else if (message.toLowerCase() === 'done' || message.toLowerCase() === 'finish' || message.toLowerCase() === 'complete' || message.toLowerCase() === 'ready' || message.toLowerCase().includes('done')) {
          // User said "done" - check if they have evidence, then go to confirmation
          const confirmationMsg = await this.getConfirmationMessage(report_data);
          if (report_data.evidence_files && report_data.evidence_files.length > 0) {
            response = `✅ ${report_data.evidence_files.length} file(s) received.\n\n${confirmationMsg}`;
          } else {
            response = confirmationMsg;
          }
          newState = STATES.CONFIRM;
          shouldSave = true;
        } else if (message.toLowerCase() === 'yes' || message.toLowerCase() === 'y' || message.toLowerCase() === 'ndiyo' || message.toLowerCase() === 'ndio' || message.toLowerCase() === 'sure' || message.toLowerCase() === 'ok') {
          // Use AI for evidence upload prompt
          const evidenceUploadPrompt = await aiService.generateResponse(
            'User wants to upload evidence. Enthusiastically ask them to send photos/images/documents. Mention they can send multiple and type "done" when finished. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'evidence_upload',
              report_data,
              conversation_history: []
            }
          );
          response = evidenceUploadPrompt || 'Great! Send your evidence (photos/images/documents). Type *done* when finished.';
          newState = STATES.EVIDENCE_MEDIA;
          report_data.evidence_files = report_data.evidence_files || [];
          shouldSave = true;
        } else if (message.toLowerCase() === 'no' || message.toLowerCase() === 'n' || message.toLowerCase() === 'hapana' || message.toLowerCase() === 'skip') {
          // Skip evidence - go straight to confirmation, no AI delay
          const confirmationMsg = await this.getConfirmationMessage(report_data);
          response = confirmationMsg;
          newState = STATES.CONFIRM;
          shouldSave = true;
        } else {
          // Use AI for clarification
          const clarificationPrompt = await aiService.generateResponse(
            'User gave unclear answer about evidence. Ask them to reply yes/no/done. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'evidence_clarification',
              report_data,
              conversation_history: []
            }
          );
          response = clarificationPrompt || 'Please reply with *yes*, *no*, or *done*.';
        }
        break;

      case STATES.EVIDENCE_MEDIA:
        // If user types "done" or "no", move to confirmation IMMEDIATELY - no AI delay, no duplicates
        const doneKeywords = ['done', 'finish', 'complete', 'ready', 'ok', 'that\'s all', 'that\'s it', 'im done', 'i\'m done', 'i said done'];
        const isDone = doneKeywords.some(keyword => message.toLowerCase().includes(keyword));
        const isNo = message.toLowerCase() === 'no' || message.toLowerCase() === 'n' || message.toLowerCase().includes('no more');
        
        if (isDone || isNo) {
          // IMMEDIATE response - skip all AI calls, go straight to confirmation
          console.log(`✅ User said "${isDone ? 'done' : 'no'}" in EVIDENCE_MEDIA state. Moving to confirmation. Evidence files: ${report_data.evidence_files?.length || 0}`);
          const confirmationMsg = await this.getConfirmationMessage(report_data);
          if (report_data.evidence_files && report_data.evidence_files.length > 0) {
            response = `✅ ${report_data.evidence_files.length} file(s) received.\n\n${confirmationMsg}`;
          } else {
            response = confirmationMsg;
          }
          newState = STATES.CONFIRM;
          shouldSave = true;
        } else {
          // Use AI for reminder
          const reminderPrompt = await aiService.generateResponse(
            'User sent text but we need evidence files. Remind them to send photos/images/documents or type "done". Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.',
            {
              phone_number,
              state: 'evidence_reminder',
              report_data,
              conversation_history: []
            }
          );
          response = reminderPrompt || 'Please send a photo/image/document or type *done*.';
        }
        break;

      case STATES.CONFIRM:
        // Check if user is correcting the category (e.g., "No, the description lies with education not health care")
        const correctionKeywords = ['no', 'wrong', 'incorrect', 'not', 'lies with', 'should be', 'is', 'actually'];
        const isCorrection = correctionKeywords.some(keyword => message.toLowerCase().includes(keyword)) && 
                            (message.toLowerCase().includes('education') || message.toLowerCase().includes('healthcare') || 
                             message.toLowerCase().includes('health care') || message.toLowerCase().includes('infrastructure') || 
                             message.toLowerCase().includes('security') || message.toLowerCase().includes('other'));
        
        if (isCorrection && message.toLowerCase() !== 'no' && message.toLowerCase() !== 'n') {
          // User is correcting the category - extract the correct category
          console.log(`✅ User correcting category: "${message}"`);
          let correctedCategory = null;
          const msgLower = message.toLowerCase();
          
          // Extract the correct category from the correction
          if (msgLower.includes('education')) {
            correctedCategory = 'Education';
          } else if (msgLower.includes('healthcare') || msgLower.includes('health care')) {
            correctedCategory = 'Healthcare';
          } else if (msgLower.includes('infrastructure')) {
            correctedCategory = 'Infrastructure';
          } else if (msgLower.includes('security')) {
            correctedCategory = 'Security';
          } else if (msgLower.includes('other')) {
            correctedCategory = 'Other';
          }
          
          if (correctedCategory) {
            // Update category and regenerate confirmation
            report_data.category = correctedCategory;
            console.log(`✅ Category corrected to: ${correctedCategory}`);
            const confirmationMsg = await this.getConfirmationMessage(report_data);
            const correctionAck = await aiService.generateResponse(
              `User corrected category to ${correctedCategory}. Acknowledge the correction warmly and show updated confirmation. Be brief. IMPORTANT: Do NOT mention "submitted" - we are still collecting information.`,
              {
                phone_number,
                state: 'category_corrected',
                report_data,
                conversation_history: []
              }
            );
            response = (correctionAck || `✅ Category updated to ${correctedCategory}.\n\n`) + confirmationMsg;
            newState = STATES.CONFIRM;
            shouldSave = true;
            break;
          }
        }
        
        // Handle "yes" - IMMEDIATE save, no AI delays
        if (message.toLowerCase() === 'yes' || message.toLowerCase() === 'y' || message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready')) {
          // Validate required fields before saving - use AI for error messages
          if (!report_data.category) {
            console.error('❌ Missing category in report_data:', report_data);
            const errorMsg = await aiService.generateResponse(
              'Category is missing from report. Apologize and ask user to start new report. Be brief.',
              {
                phone_number,
                state: 'error_missing_category',
                report_data,
                conversation_history: []
              }
            );
            response = errorMsg || 'Error: Category missing. Please type *menu* to start over.';
            newState = STATES.INITIAL;
            shouldSave = true;
            break;
          }
          
          if (!report_data.description) {
            console.error('❌ Missing description in report_data:', report_data);
            const errorMsg = await aiService.generateResponse(
              'Description is missing from report. Apologize and ask user to start new report. Be brief.',
              {
                phone_number,
                state: 'error_missing_description',
                report_data,
                conversation_history: []
              }
            );
            response = errorMsg || 'Error: Description missing. Please type *menu* to start over.';
            newState = STATES.INITIAL;
            shouldSave = true;
            break;
          }
          
          if (!report_data.location) {
            console.error('❌ Missing location in report_data:', report_data);
            const errorMsg = await aiService.generateResponse(
              'Location is missing from report. Apologize and ask user to start new report. Be brief.',
              {
                phone_number,
                state: 'error_missing_location',
                report_data,
                conversation_history: []
              }
            );
            response = errorMsg || 'Error: Location missing. Please type *menu* to start over.';
            newState = STATES.INITIAL;
            shouldSave = true;
            break;
          }
          
          // Save report IMMEDIATELY - no AI delays
          try {
            await new Promise((resolve, reject) => {
              Report.create({
                phone_number,
                category: report_data.category,
                subcategory: report_data.subcategory || null,
                description: report_data.description,
                location: report_data.location,
                evidence_files: report_data.evidence_files ? JSON.stringify(report_data.evidence_files) : null
              }, (err, report) => {
                if (err) {
                  console.error('❌ Database error saving report:', err);
                  reject(err);
                } else {
                  console.log('✅ Report saved successfully:', report.id);
                  resolve(report);
                }
              });
            });

            const reportId = `${report_data.category.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
            
            // Set flag in session BEFORE clearing (so whatsapp.js can detect it)
            await new Promise((resolve, reject) => {
              UserSession.set(phone_number, STATES.CONFIRM, { ...report_data, reportId, sendLogo: true, justSubmitted: true }, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
            
            // Use AI for thank you message
            const thankYouMsg = await aiService.generateResponse(
              `User successfully submitted report with ID ${reportId}. Thank them warmly, mention report will be reviewed, invite them to report more or view reports. Be brief and appreciative.`,
              {
                phone_number,
                state: 'report_submitted',
                report_data: { ...report_data, reportId, sendLogo: true },
                conversation_history: []
              }
            );
            response = thankYouMsg || `✅ Report submitted! ID: ${reportId}\n\nThank you! Your report will be reviewed.\n\nType *menu* for more options.`;
            newState = STATES.INITIAL;
          } catch (error) {
            console.error('❌ Error saving report:', error);
            const errorMsg = await aiService.generateResponse(
              'Error occurred saving report. Apologize and ask user to try again or start over. Be brief.',
              {
                phone_number,
                state: 'error_saving',
                report_data,
                conversation_history: []
              }
            );
            response = errorMsg || 'Error saving report. Please try again or type *menu*.';
            newState = STATES.INITIAL;
          }
        } else if (message.toLowerCase() === 'no' || message.toLowerCase() === 'n') {
          // Use AI for cancel message
          const cancelPrompt = await aiService.generateResponse(
            'User cancelled report. Thank them and invite them to start new report anytime. Be brief.',
            {
              phone_number,
              state: 'report_cancelled',
              report_data,
              conversation_history: []
            }
          );
          response = cancelPrompt || 'Report cancelled. Type *menu* to start a new report.';
          await new Promise((resolve, reject) => {
            UserSession.clear(phone_number, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          newState = STATES.INITIAL;
        } else {
          // Use AI for clarification
          const clarificationPrompt = await aiService.generateResponse(
            'User gave unclear answer. Ask them to reply yes or no. Be brief. IMPORTANT: Do NOT mention "submitted" - they need to confirm first.',
            {
              phone_number,
              state: 'confirm_clarification',
              report_data,
              conversation_history: []
            }
          );
          const confirmationMsg = await this.getConfirmationMessage(report_data);
          response = clarificationPrompt ? clarificationPrompt + '\n\n' + confirmationMsg : 'Please reply with *yes* or *no*.\n\n' + confirmationMsg;
        }
        break;
    }

    // Save session if needed
    if (shouldSave || newState !== state) {
      await new Promise((resolve, reject) => {
        UserSession.set(phone_number, newState, report_data, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return response;
  }

  static isGreeting(message) {
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

  static async getMainMenu(userLanguage = 'en', phone_number = null, report_data = {}) {
    // Use AI for dynamic menu but keep prompt short for speed
    if (aiService.model) {
      const menuPrompt = await aiService.generateResponse(
        `Show TrustBridge menu with 3 options: 1. Report Issue, 2. View Reports, 3. Help. Be brief and friendly.`,
        {
          phone_number: phone_number || 'unknown',
          state: 'main_menu',
          report_data: { ...report_data, language: userLanguage },
          conversation_history: []
        }
      );
      
      if (menuPrompt) {
        return menuPrompt;
      }
    }
    
    // If AI unavailable, try one more time with simpler prompt
    if (aiService.model) {
      const fallbackMenu = await aiService.generateResponse(
        'Show menu: 1. Report Issue, 2. View Reports, 3. Help. Be very brief.',
        {
          phone_number: phone_number || 'unknown',
          state: 'main_menu_fallback',
          report_data: { ...report_data, language: userLanguage },
          conversation_history: []
        }
      );
      if (fallbackMenu) {
        return fallbackMenu;
      }
    }
    
    // Last resort - only if AI completely unavailable
    return null; // Let caller handle null
  }


  // Removed static getSubcategoryMenu - all menus are now AI-generated

  static async getConfirmationMessage(report_data) {
    // Validate data exists
    if (!report_data.category || !report_data.description || !report_data.location) {
      console.error('❌ Missing required fields in report_data:', report_data);
      return '❌ Error: Some required information is missing. Please start a new report by typing *menu*.';
    }
    
    // Use AI for dynamic confirmation but keep prompt short for speed
    if (aiService.model) {
      const reportSummary = `Category: ${report_data.category}${report_data.subcategory ? `, Subcategory: ${report_data.subcategory}` : ''}\nDescription: ${report_data.description}\nLocation: ${report_data.location}${report_data.evidence_files && report_data.evidence_files.length > 0 ? `\nEvidence: ${report_data.evidence_files.length} file(s)` : ''}`;
      
      const confirmationPrompt = await aiService.generateResponse(
        `Show this report summary and ask user to confirm (yes/no). Be brief: ${reportSummary}. IMPORTANT: Do NOT say it is submitted yet - they need to confirm first with "yes".`,
        {
          phone_number: 'unknown',
          state: 'confirmation',
          report_data,
          conversation_history: []
        }
      );
      
      if (confirmationPrompt) {
        return confirmationPrompt;
      }
    }
    
    // Fallback if AI unavailable
    const reportSummary = `*Category:* ${report_data.category}${report_data.subcategory ? `\n*Subcategory:* ${report_data.subcategory}` : ''}\n*Description:* ${report_data.description}\n*Location:* ${report_data.location}${report_data.evidence_files && report_data.evidence_files.length > 0 ? `\n*Evidence:* ${report_data.evidence_files.length} file(s)` : ''}`;
    
    return `📝 *Confirm Your Report:*\n\n${reportSummary}\n\nReply *yes* to submit or *no* to cancel.`;
  }

  static async getUserReports(phone_number) {
    return new Promise(async (resolve, reject) => {
      Report.findByPhone(phone_number, async (err, reports) => {
        if (err) {
          // Use AI to generate error message
          if (aiService.model) {
            const errorMsg = await aiService.generateResponse(
              'The user tried to view their reports but there was a database error. Apologize and ask them to try again later.',
              {
                phone_number,
                state: 'error',
                report_data: {},
                conversation_history: []
              }
            );
            resolve(errorMsg || '❌ Error retrieving your reports. Please try again later.');
          } else {
            // If AI is not available, still try to generate a message
            const noAiError = await aiService.generateResponse(
              'Database error occurred. Apologize briefly.',
              {
                phone_number,
                state: 'error_no_ai',
                report_data: {},
                conversation_history: []
              }
            );
            resolve(noAiError || '❌ Error retrieving your reports. Please try again later.');
          }
          return;
        }

        if (reports.length === 0) {
          // User has no reports - be clear and helpful, no contradictions
          const noReportsMsg = await aiService.generateResponse(
            'The user has no reports yet. Tell them they can report an issue by typing "menu" or "1". Be brief and encouraging. IMPORTANT: Do NOT mention "submitted" - they haven\'t submitted anything yet. Do NOT contradict yourself.',
            {
              phone_number,
              state: 'no_reports',
              report_data: {},
              conversation_history: []
            }
          );
          resolve(noReportsMsg || '📋 You have no reports yet. Type *menu* to report an issue.');
          return;
        }

        // Use AI to generate dynamic report summary
        if (aiService.model) {
          const reportSummary = reports.slice(0, 5).map((report, idx) => {
            const date = new Date(report.created_at).toLocaleDateString();
            return `${idx + 1}. ${report.category}${report.subcategory ? ` (${report.subcategory})` : ''} - Status: ${report.status || 'pending'}\n   Location: ${report.location}\n   Date: ${date}`;
          }).join('\n\n');
          
          const reportsMsg = await aiService.generateResponse(
            `The user has ${reports.length} report(s). Present this summary in a friendly way: ${reportSummary}. Explain the statuses (pending, in_progress, resolved) and encourage them to report more issues if needed.`,
            {
              phone_number,
              state: 'view_reports',
              report_data: { reportCount: reports.length },
              conversation_history: []
            }
          );
          
          if (reportsMsg) {
            // Add report details to AI response
            let detailedResponse = reportsMsg + '\n\n';
            reports.slice(0, 5).forEach((report, index) => {
              const date = new Date(report.created_at).toLocaleDateString();
              const statusEmoji = report.status === 'resolved' ? '✅' : report.status === 'in_progress' ? '🔄' : '⏳';
              detailedResponse += `${statusEmoji} *Report ${index + 1}:*\n`;
              detailedResponse += `   Category: ${report.category}${report.subcategory ? ` (${report.subcategory})` : ''}\n`;
              detailedResponse += `   Status: ${(report.status || 'pending').toUpperCase()}\n`;
              detailedResponse += `   Location: ${report.location}\n`;
              detailedResponse += `   Date: ${date}\n\n`;
            });
            
            if (reports.length > 5) {
              detailedResponse += `... and ${reports.length - 5} more report(s).\n\n`;
            }
            
            detailedResponse += 'Type *menu* to report a new issue or view more options.';
            resolve(detailedResponse);
            return;
          }
        }
        
        // Fallback if AI fails
        let response = `📋 *Your Reports (${reports.length}):*\n\n`;
        reports.slice(0, 5).forEach((report, index) => {
          const date = new Date(report.created_at).toLocaleDateString();
          const statusEmoji = report.status === 'resolved' ? '✅' : report.status === 'in_progress' ? '🔄' : '⏳';
          response += `${statusEmoji} *Report ${index + 1}:*\n`;
          response += `   Category: ${report.category}${report.subcategory ? ` (${report.subcategory})` : ''}\n`;
          response += `   Status: ${(report.status || 'pending').toUpperCase()}\n`;
          response += `   Location: ${report.location}\n`;
          response += `   Date: ${date}\n\n`;
        });

        if (reports.length > 5) {
          response += `... and ${reports.length - 5} more report(s).\n\n`;
        }

        response += 'Type *menu* to report a new issue.';
        resolve(response);
      });
    });
  }

  static async startReport(phone_number, userLanguage = 'en') {
    const response = await this.getCategoryMenu(userLanguage);
    await new Promise((resolve, reject) => {
      UserSession.set(phone_number, STATES.CATEGORY, { language: userLanguage }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return response;
  }

  static async getCategoryMenu(userLanguage = 'en', phone_number = null, report_data = {}) {
    // Use AI to generate dynamic category menu
    if (aiService.model) {
      const categories = Object.keys(CATEGORIES).map(key => `${key}. ${CATEGORIES[key].name}`).join('\n');
      const categoryPrompt = await aiService.generateResponse(
        `Present the issue categories to the user in a friendly way:\n${categories}\n\nTell them they can select by typing the category name (like "Healthcare" or "Infrastructure") or the number (1-5). Make it conversational.`,
        {
          phone_number: phone_number || 'unknown',
          state: 'category_menu',
          report_data: { ...report_data, language: userLanguage },
          conversation_history: []
        }
      );
      
      if (categoryPrompt) {
        return categoryPrompt;
      }
    }
    
      // If AI fails, try one more time with a simpler prompt
      const categories = Object.keys(CATEGORIES).map(key => `${key}. ${CATEGORIES[key].name}`).join('\n');
      const fallbackCategory = await aiService.generateResponse(
        `Show these categories: ${categories}. Ask user to select by number.`,
        {
          phone_number: phone_number || 'unknown',
          state: 'category_menu_fallback',
          report_data: { ...report_data, language: userLanguage },
          conversation_history: []
        }
      );
      
      // Last resort: minimal dynamic menu
      return fallbackCategory || `🏛️ TrustBridge\n\n${categories}\n\nReply with number.`;
  }
}

module.exports = ChatbotService;
