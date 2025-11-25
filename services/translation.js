const axios = require('axios');

class TranslationService {
  static async detectLanguage(text) {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ GOOGLE_API_KEY not set - using language detection fallback');
        return 'en'; // Default to English if no API key
      }

      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`,
        {
          q: text
        },
        {
          timeout: 5000 // 5 second timeout
        }
      );

      if (response.data && response.data.data && response.data.data.detections) {
        const detectedLang = response.data.data.detections[0][0].language;
        return detectedLang;
      }
      return 'en';
    } catch (error) {
      // Only log 403 errors once per session to avoid spam
      if (error.response && error.response.status === 403 && !this._logged403) {
        console.warn('⚠️ Translation API not enabled - using fallback language detection');
        console.warn('💡 To enable: Go to Google Cloud Console → Enable "Cloud Translation API"');
        this._logged403 = true; // Only log once
      }
      // Fallback to simple detection (works fine without Translation API)
      return this.isSwahili(text) ? 'sw' : 'en';
    }
  }

  static async translate(text, targetLanguage = 'en', sourceLanguage = 'auto') {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return text; // Return original if no API key
      }

      // Don't translate if already in target language
      if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
        return text;
      }

      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          q: text,
          target: targetLanguage,
          source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
          format: 'text'
        },
        {
          timeout: 5000 // 5 second timeout
        }
      );

      if (response.data && response.data.data && response.data.data.translations) {
        return response.data.data.translations[0].translatedText;
      }
      return text;
    } catch (error) {
      // Silently fail - translation is optional, bot works without it
      // Return original text on error (no translation needed)
      return text;
    }
  }

  static async translateToSwahili(text) {
    return await this.translate(text, 'sw');
  }

  static async translateToEnglish(text) {
    return await this.translate(text, 'en');
  }

  static isSwahili(text) {
    // Simple heuristic: check for common Swahili words
    const swahiliWords = ['na', 'ya', 'wa', 'za', 'ni', 'kwa', 'hii', 'hilo', 'hili', 'haya', 'hayo'];
    const words = text.toLowerCase().split(/\s+/);
    const swahiliCount = words.filter(word => swahiliWords.includes(word)).length;
    return swahiliCount > words.length * 0.1; // If more than 10% are Swahili words
  }

  static async smartTranslate(text, userLanguage = null) {
    // If user language is known, translate to that
    if (userLanguage === 'sw') {
      return await this.translateToSwahili(text);
    } else if (userLanguage === 'en') {
      return text; // Already in English
    }

    // Auto-detect and translate if needed
    const detectedLang = await this.detectLanguage(text);
    
    // If user message is in Swahili, respond in Swahili
    if (detectedLang === 'sw' || this.isSwahili(text)) {
      // Don't translate - user is speaking Swahili, we'll respond in Swahili
      return text;
    }

    // Default to English
    return text;
  }
}

module.exports = TranslationService;

