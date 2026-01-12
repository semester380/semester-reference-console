const fs = require('fs');
const path = require('path');

// Mock Data
const sections = {
  summary: `<div class="info-row"><div class="info-cell full-width"><div class="ai-summary-text">The candidate demonstrates strong initiative and reliability. They have consistently met performance targets and are well-regarded by their peers. No significant issues were noted during their tenure.</div></div></div>`,

  employment: `
      <div class="info-row"><div class="info-cell half"><div class="info-label">Job Title</div><div class="info-value">Senior Care Specialist</div></div><div class="info-cell half"><div class="info-label">Dates of Employment</div><div class="info-value">Jan 2020 — Jan 2023</div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Reason for Leaving</div><div class="info-value">End of contract.</div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Disciplinary Action</div><div class="info-value"><span class="val-no">☐ No</span></div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Safeguarding Concerns</div><div class="info-value"><span class="val-no">☐ No</span></div></div></div>
  `,

  ratings: `
      <div class="info-row"><div class="info-cell half"><div class="info-label">Suitable for Role</div><div class="rating-container"><span class="rating-num">5/5</span><div class="rating-track"><div class="rating-fill" style="width:100%"></div></div><span class="rating-text">Excellent</span></div></div><div class="info-cell half"><div class="info-label">Reliability</div><div class="rating-container"><span class="rating-num">5/5</span><div class="rating-track"><div class="rating-fill" style="width:100%"></div></div><span class="rating-text">Excellent</span></div></div></div>
      <div class="info-row"><div class="info-cell half"><div class="info-label">Punctuality</div><div class="rating-container"><span class="rating-num">4/5</span><div class="rating-track"><div class="rating-fill" style="width:80%"></div></div><span class="rating-text">Very Good</span></div></div><div class="info-cell half"><div class="info-label">Honesty & Integrity</div><div class="rating-container"><span class="rating-num">5/5</span><div class="rating-track"><div class="rating-fill" style="width:100%"></div></div><span class="rating-text">Excellent</span></div></div></div>
      <div class="info-row"><div class="info-cell half"><div class="info-label">Attitude to Work</div><div class="rating-container"><span class="rating-num">5/5</span><div class="rating-track"><div class="rating-fill" style="width:100%"></div></div><span class="rating-text">Excellent</span></div></div><div class="info-cell half"><div class="info-label">Initiative</div><div class="rating-container"><span class="rating-num">4/5</span><div class="rating-track"><div class="rating-fill" style="width:80%"></div></div><span class="rating-text">Very Good</span></div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Communication Skills</div><div class="rating-container"><span class="rating-num">5/5</span><div class="rating-track"><div class="rating-fill" style="width:100%"></div></div><span class="rating-text">Excellent</span></div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Performance Comments</div><div class="info-value">Excellent candidate.</div></div></div>
  `,

  safeguarding: `
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Character Reservations</div><div class="info-value"><span class="val-no">☐ No</span></div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Reason NOT to Employ</div><div class="info-value"><span class="val-no">☐ No</span></div></div></div>
      <div class="info-row"><div class="info-cell full-width"><div class="info-label">Knowledge of ROA</div><div class="info-value"><span class="val-yes">☑ Yes</span></div></div></div>
  `,

  declaration: `
      <div class="info-row"><div class="info-cell half"><div class="info-label">Referee Name</div><div class="info-value">Pdf Referee Standard Test</div></div><div class="info-cell half"><div class="info-label">Position</div><div class="info-value">Manager</div></div></div>
      <div class="info-row"><div class="info-cell half"><div class="info-label">Organization</div><div class="info-value">Test Co</div></div><div class="info-cell half"><div class="info-label">Contact</div><div class="info-value">12345 • referee@example.com</div></div></div>
      <div class="info-row"><div class="info-cell full-width">
        <div class="signature-card">
           <div class="signature-header">DIGITALLY SIGNED</div>
           <div class="signature-img">
              <!-- Placeholder signature for visual test -->
              <div style="font-family:cursive; font-size:24px; color:#0052CC">John Doe</div>
           </div>
           <div class="signature-meta">
              Signed: 06/01/2026, 12:00:00<br>
              IP: 127.0.0.1<br>
              Device: Mozilla/5.0...
           </div>
        </div>
      </div></div>
  `
};

function buildSection(title, content) {
  return `
      <div class="section">
        <div class="section-header">
           <div class="section-indicator"></div>
           <div class="section-title">${title}</div>
        </div>
        <div class="card">
           <div class="info-grid">
             ${content}
           </div>
        </div>
      </div>
    `;
}

function generate(filename, isCompact, title) {
  // Generate Full Content
  let content =
    buildSection("Executive Summary", sections.summary) +
    buildSection("Employment Details", sections.employment) +
    buildSection("Ratings & Attributes", sections.ratings) +
    buildSection("Safeguarding & Conduct", sections.safeguarding) +
    buildSection("Consent & Declaration", sections.declaration);

  if (isCompact) {
    // Double the content to simulate length
    content += buildSection("Additional History (Simulated)", sections.employment);
    content += buildSection("Extended Feedback (Simulated)", sections.ratings);
  }

  // Read Template
  const templatePath = path.join(__dirname, '../gas/PdfTemplate.html');
  let template = "";
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (e) {
    console.error("Could not find template at " + templatePath);
    process.exit(1);
  }

  // Inject
  const output = template
    .replace('{{content}}', content)
    .replace('{{bodyClass}}', isCompact ? 'compact-mode' : '')
    .replace(/{{requestId}}/g, 'REQ-TEST-' + (isCompact ? 'LONG' : 'STD'))
    .replace(/{{candidateName}}/g, title)
    .replace(/{{refereeName}}/g, 'Pdf Referee')
    .replace(/{{date}}/g, '06 Jan 2026');

  fs.writeFileSync(path.join(__dirname, filename), output);
  console.log(`Generated ${filename}`);
}

generate('qa_mock_standard.html', false, 'Standard Candidate');
generate('qa_mock_long.html', true, 'Long Candidate');
