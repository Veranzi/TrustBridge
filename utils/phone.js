/**
 * Normalize WhatsApp phone number format
 * Converts formats like "254712345678@c.us" or "whatsapp:+254712345678" to "254712345678"
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;
  
  // Remove whatsapp: prefix if present
  let normalized = phoneNumber.replace(/^whatsapp:/, '');
  
  // Remove @c.us suffix if present
  normalized = normalized.replace(/@c\.us$/, '');
  
  // Remove any other non-digit characters except +
  normalized = normalized.replace(/[^\d+]/g, '');
  
  // Remove + if present
  normalized = normalized.replace(/^\+/, '');
  
  return normalized;
}

/**
 * Format phone number for WhatsApp (adds @c.us suffix)
 */
function formatForWhatsApp(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return `${normalized}@c.us`;
}

module.exports = {
  normalizePhoneNumber,
  formatForWhatsApp
};

