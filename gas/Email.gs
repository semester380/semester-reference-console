
/**
 * Sends a branded email using the official Semester Recruitment template.
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject line of the email.
 * @param {string} bodyContent - The HTML content of the email body.
 * @param {Object} options - Optional settings (e.g., attachments, replyTo).
 */
function sendBrandedEmail(recipient, subject, bodyContent, options) {
  options = options || {};

  // Brand Colors
  var BRAND_BLUE = '#0052CC';
  var BRAND_PLUM = '#5E17EB';
  var BRAND_PINK = '#FF0080';

  // Logo URL (using public URL if available, or inline SVG)
  // Since Gmail blocks many external images, we'll try to use a hosted URL or a very simple text fallback if needed.
  // Ideally, use the Cloud Storage URL or a reliable CDN. For now, we will use a text-based logo fallback styled with CSS if no image.
  // Or better, inline the SVG logic if supported, but email support for SVG is spotty.
  // Best bet: Use a publicly hosted PNG. I will assume we have one or use a placeholder.
  var LOGO_URL = 'https://references.semester.co.uk/semester-logo.png'; // Assuming Vercel deployment hosts this

  var htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { padding: 20px 0; text-align: left; }
        .brand-strip { height: 4px; background: linear-gradient(90deg, ${BRAND_BLUE} 0%, ${BRAND_PLUM} 50%, ${BRAND_PINK} 100%); width: 100%; }
        .content { padding: 30px 20px; background-color: #ffffff; }
        .footer { padding: 20px; background-color: #f8f9fa; border-top: 1px solid #eaeaea; font-size: 12px; color: #888; text-align: center; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${BRAND_BLUE}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
        h1, h2, h3 { color: #111; margin-bottom: 15px; }
        p { margin-bottom: 15px; }
        .logo-text { font-size: 24px; font-weight: bold; color: ${BRAND_BLUE}; text-decoration: none; display: inline-block; }
        .logo-dot { color: ${BRAND_PINK}; }
      </style>
    </head>
    <body style="background-color: #f4f6f8; padding: 20px;">
      <div class="container">
        <!-- Brand Strip -->
        <div style="height: 4px; background: linear-gradient(90deg, ${BRAND_BLUE} 0%, ${BRAND_PLUM} 50%, ${BRAND_PINK} 100%); width: 100%;"></div>
        
        <!-- Content -->
        <div class="content">
          <!-- Logo -->
          <div style="margin-bottom: 30px;">
             <span style="font-size: 24px; font-weight: bold; color: #0052CC;">Semester</span><span style="color: #FF0080; font-size: 30px; line-height: 0; vertical-align: middle;">.</span>
          </div>

          ${bodyContent}
          
          <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666;">
            <p><strong>Secure Reference Portal</strong><br>
            This email was sent securely via Semester Recruitment's compliance platform.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          &copy; ${new Date().getFullYear()} Semester Recruitment. All rights reserved.<br>
          <a href="#" style="color: #888; text-decoration: underline;">Privacy Policy</a> | <a href="#" style="color: #888; text-decoration: underline;">Support</a>
        </div>
      </div>
    </body>
    </html>
  `;

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlTemplate,
    replyTo: options.replyTo,
    attachments: options.attachments,
    name: 'Semester Reference Team'
  });
}

/**
 * Send critical error alert to admin
 */
function sendErrorAlert(context, error) {
  try {
    const recipients = 'rob@semester.co.uk'; // Configurable
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
      name: 'Semester Ops'
    });
    console.log("Error alert sent to " + recipients);
    
  } catch (alertError) {
    console.error("Failed to send error alert: " + alertError.toString());
  }
}
