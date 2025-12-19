
/**
 * Sends a branded email using the official Semester Recruitment template.
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject line of the email.
 * @param {string} bodyContent - The HTML content of the email body.
 * @param {Object} options - Optional settings (e.g., attachments, replyTo, textBody).
 */
function sendBrandedEmail(recipient, subject, bodyContent, options) {
  options = options || {};

  // Brand Colors
  var BRAND_BLUE = '#0052CC';
  var BRAND_PLUM = '#5E17EB';
  var BRAND_PINK = '#FF0080';

  // Logo URL (Hosted stable version)
  // Inline SVG fallback is safer for deliverability if external images are blocked.
  var LOGO_URL = 'https://references.semester.co.uk/semester-logo.png'; 

  var htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en-GB">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f6f8; text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { padding: 20px 0; text-align: left; }
        .brand-strip { height: 4px; background: linear-gradient(90deg, ${BRAND_BLUE} 0%, ${BRAND_PLUM} 50%, ${BRAND_PINK} 100%); width: 100%; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .footer { padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eaeaea; font-size: 12px; color: #888; text-align: center; }
        .button { display: inline-block; padding: 14px 28px; background-color: ${BRAND_BLUE}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; text-align: center; }
        h1, h2, h3 { color: #111; margin-bottom: 20px; font-weight: 600; }
        p { margin-bottom: 16px; color: #4b5563; }
        .logo-text { font-size: 24px; font-weight: bold; color: ${BRAND_BLUE}; text-decoration: none; display: inline-block; }
        .logo-dot { color: ${BRAND_PINK}; }
        a { color: ${BRAND_BLUE}; text-decoration: none; }
        a:hover { text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          .content { padding: 20px; }
          .button { display: block; width: 100%; box-sizing: border-box; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Brand Strip -->
        <div class="brand-strip"></div>
        
        <!-- Content -->
        <div class="content">
          <!-- Logo -->
          <div style="margin-bottom: 30px;">
             <span style="font-size: 24px; font-weight: bold; color: #0052CC;">Semester</span><span style="color: #FF0080; font-size: 30px; line-height: 0; vertical-align: middle;">.</span>
          </div>

          ${bodyContent}
          
          <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #666;">
            <p style="margin: 0; font-size: 14px; color: #111; font-weight: 600;">Secure Reference Portal</p>
            <p style="margin: 5px 0 0 0; color: #666;">This message was sent securely via Semester Recruitment's compliance platform.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            <strong>Semester Recruitment</strong><br>
            London, United Kingdom
          </p>
          <p style="margin: 0 0 10px 0;">
            &copy; ${new Date().getFullYear()} Semester Recruitment. All rights reserved.
          </p>
          <p style="margin: 0;">
            <a href="https://semester.co.uk" target="_blank">Website</a> | 
            <a href="https://semester.co.uk/privacy" target="_blank">Privacy Policy</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Provide a reasonable plain text fallback if one wasn't provided
  var safeTextBody = options.textBody || bodyContent.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlTemplate,
    body: safeTextBody, // Crucial for spam reduction
    replyTo: options.replyTo,
    attachments: options.attachments,
    name: 'Semester Recruitment' // Consistent Sender Name
  });
}

/**
 * Send critical error alert to admin
 */
function sendErrorAlert(context, error) {
  try {
    const recipients = 'rob@semester.co.uk';
    const subject = 'Semester Reference Console – Error Alert';
    
    // Brand Colors
    var BRAND_BLUE = '#0052CC';
    
    const htmlBody = `
      <div style="font-family: monospace; padding: 20px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px;">
        <h2 style="color: #991b1b; margin-top: 0;">System Error Detected</h2>
        <p><strong>Context:</strong> ${context}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb; margin-top: 15px;">
           <strong>Error Details:</strong><br/>
           <pre style="white-space: pre-wrap;">${error.toString()}</pre>
           ${error.stack ? '<br/><strong>Stack:</strong><br/><pre style="white-space: pre-wrap;">' + error.stack + '</pre>' : ''}
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
           Sent by Semester Reference Console
        </div>
      </div>
    `;
    
    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      htmlBody: htmlBody,
      body: "System Error Detected. Please check the console.",
      name: 'Semester Ops'
    });
    console.log("Error alert sent to " + recipients);
    
  } catch (alertError) {
    console.error("Failed to send error alert: " + alertError.toString());
  }
}
