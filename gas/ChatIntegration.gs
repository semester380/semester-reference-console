
/**
 * Google Chat Integration
 * Webhook URL provided by User.
 */
const GOOGLE_CHAT_WEBHOOK_URL = 'https://chat.googleapis.com/v1/spaces/AAQAnVBfmWc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=MGK-lRxBf6wxoDVHWUjMVYqooJ6MmKFXD9-WkAiJkeo';

/**
 * Send notification to Google Chat
 */
function sendChatNotification(candidateName, refereeName, datesCovered, pdfUrl) {
  if (!GOOGLE_CHAT_WEBHOOK_URL) {
     console.warn("No Google Chat Webhook URL configured.");
     return;
  }

  // Format:
  // New Reference Received
  // 👤 Candidate: Ngozi Blessing Anucha
  // 📆 Dates Covered: 2024-06 → 2026-01
  // 📧 From: Semester Recruitment <reference@semester.co.uk> (Ref Name is best we have)
  // Attachment link
  
  // Note: We don't have Sender Email easily if it's token based, but we have Referee Name.
  // We can use "From: {refereeName}"
  
  const message = `*New Reference Received*\n` +
                  `👤 Candidate: ${candidateName}\n` +
                  `📆 Dates Covered: ${datesCovered}\n` +
                  `📧 From: ${refereeName}\n` +
                  `📎 Attachment: ${pdfUrl}`;

  const payload = {
    text: message
  };

  try {
    UrlFetchApp.fetch(GOOGLE_CHAT_WEBHOOK_URL, {
      method: 'post',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      payload: JSON.stringify(payload)
    });
    console.log("Chat notification sent for " + candidateName);
  } catch (e) {
    console.error("Failed to send Chat notification", e);
  }
}

/**
 * Extract and format dates from responses
 */
function extractDatesCovered(responses) {
  if (!responses) return "Unknown";
  
  // Known date fields across templates
  // Evaluation: startDate, endDate
  // C&F: assignmentStartDate, assignmentEndDate
  // Standard: employmentStartDate, employmentEndDate (?) - Usually start_date
  
  const start = responses.startDate || responses.assignmentStartDate || responses.employmentStartDate || responses.start_date;
  const end = responses.endDate || responses.assignmentEndDate || responses.employmentEndDate || responses.end_date;
  
  if (!start && !end) return "Unknown";
  
  const format = (val) => {
    if (!val) return "Present";
    // Check if YYYY-MM-DD string
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return val.substring(0, 7); // YYYY-MM
    }
    // If Date object
    if (val instanceof Date) {
       return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM");
    }
    return val;
  };
  
  return `${format(start)} → ${format(end)}`;
}
