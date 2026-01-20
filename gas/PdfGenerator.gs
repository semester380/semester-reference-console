/**
 * PdfGenerator.gs
 * Handles professional, compact, and consistent PDF generation for Reference Reports.
 * Enforces a 2-page limit using heuristic height estimation and compaction logic.
 */

// --- Configuration & Constants ---

const PDF_CONFIG = {
  // A4 Dimensions (approximate for 96 DPI)
  // Height: ~1123px. 
  // Margins: Top 30px, Bottom 50px -> Usable ~1040px.
  PAGE_HEIGHT_PX: 1040, 
  MAX_PAGES: 2,
  
  // tuned pixel heights (tighter estimation)
  HEIGHTS: {
    HEADER: 110,         // Logo, title, metadata
    FOOTER_SPACE: 40,    // Reserved space for fixed footer
    SECTION_HEADER: 35,
    ROW_NORMAL: 28,      // Single line key-value
    ROW_COMPACT: 20,     // Tight mode
    TEXT_LINE: 14,       // Height per line of wrapped text
    PADDING_SECTION: 15,
    PADDING_CARD: 12,
    SIGNATURE_BLOCK: 140
  },
  
  MODES: {
    NORMAL: 'normal',
    COMPACT: 'compact'
  }
};

/**
 * Main Entry Point: Generate a Reference Report PDF
 */
function generateReferencePdf(requestId, request) {
  try {
    const responses = request.responses || {};
    const method = responses.uploadedFileUrl ? 'upload' : 
                   responses.declineReason ? 'decline' : 'form';

    // 1. Prepare Data
    const data = {
      requestId: requestId,
      candidateName: request.candidateName,
      refereeName: request.refereeName,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      method: method,
      responses: responses,
      aiAnalysis: request.aiAnalysis,
      isCompact: false
    };

    // 2. Render Strategy
    let htmlContent = '';
    
    if (method === 'form') {
       // Strategy:
       // 1. Try Normal Mode
       // 2. If > 2 pages, switch to Compact.
       // 3. FEATURE: If 2 pages but "almost" fits 1 page (e.g. < 1.3 pages), switch to Compact to force 1 page.
       
       const normalRenderer = new PdfRenderer(data, PDF_CONFIG.MODES.NORMAL);
       const normalResult = normalRenderer.dryRun();
       
       console.log(`PDF Est: Normal Mode = ${normalResult.pages} pages (${normalResult.height}px)`);

       // --- ORPHAN DETECTION LOGIC ---
       // Calculate how much content is on the last page
       // Total Height - (Full Pages * Usable Page Height)
       // Note: Usable Page Height ~ 1040px. 
       // If 2 pages, the first page took ~1040px (or slightly less if a section break pushed it).
       // We can iterate sections to be precise, but total height vs n*page_height is a decent proxy.
       
       const contentHeight = normalResult.height;
       const fullPageHeight = PDF_CONFIG.PAGE_HEIGHT_PX - PDF_CONFIG.HEIGHTS.FOOTER_SPACE; // ~1000px usable
       const heightOnLastPage = contentHeight - ((normalResult.pages - 1) * fullPageHeight);
       
       // Threshold: If < 30% of a page (approx 300px) is used on the last page of a 2-page doc, it's an orphan.
       const isOrphan = (normalResult.pages === 2 && heightOnLastPage < 300);

       // Decision Logic
       if (normalResult.pages > 2) {
          console.warn("PDF > 2 Pages in Normal. Switching to COMPACT.");
          data.isCompact = true;
          const compactRenderer = new PdfRenderer(data, PDF_CONFIG.MODES.COMPACT);
          htmlContent = compactRenderer.render();
       } 
       else if (isOrphan) {
          console.warn(`PDF has Orphan Page 2 (Height: ${heightOnLastPage}px). Switching to COMPACT to fix.`);
          data.isCompact = true;
          const compactRenderer = new PdfRenderer(data, PDF_CONFIG.MODES.COMPACT);
          const compactResult = compactRenderer.dryRun();
          
          if (compactResult.pages === 1) {
             console.log("Compact Mode successfully fit on 1 Page.");
             htmlContent = compactRenderer.render();
          } else {
             console.warn("Compact Mode didn't solve pagination (still 2 pages). Reverting to Normal for readability.");
             data.isCompact = false; // Revert
             htmlContent = normalRenderer.render();
          }
       }
       else if (normalResult.pages === 2 && normalResult.height < (PDF_CONFIG.PAGE_HEIGHT_PX * 1.3)) {
          // Fallback "Close Call" Check
          // It's bleeding onto page 2 but might fit on 1 if verified compact.
          console.log("PDF is 2 pages but might fit 1. Trying COMPACT.");
          data.isCompact = true; // Try it
          const compactRenderer = new PdfRenderer(data, PDF_CONFIG.MODES.COMPACT);
          const compactResult = compactRenderer.dryRun();
          
          if (compactResult.pages === 1) {
             console.log("Compact Mode fit on 1 Page! Using Compact.");
             htmlContent = compactRenderer.render();
          } else {
             console.log("Compact Mode still 2 pages. Reverting to Normal.");
             data.isCompact = false;
             htmlContent = normalRenderer.render(); 
          }
       } 
       else {
          // Fits comfortably or uses 2 pages fully
          htmlContent = normalRenderer.render();
       }

    } else if (method === 'upload') {
       htmlContent = renderUploadContent(data);
    } else {
       htmlContent = renderDeclineContent(data);
    }

    // 3. Inject into Full Template
    const templateHtml = HtmlService.createHtmlOutputFromFile('PdfTemplate').getContent();
    const finalHtml = templateHtml
      .replace('{{content}}', htmlContent)
      .replace('{{bodyClass}}', data.isCompact ? 'compact-mode' : '')
      .replace(/{{requestId}}/g, requestId)
      .replace(/{{candidateName}}/g, request.candidateName || '')
      .replace(/{{refereeName}}/g, request.refereeName || '')
      .replace(/{{date}}/g, data.date);

    // 4. Convert to Blob
    const htmlOutput = HtmlService.createHtmlOutput(finalHtml);
    const blob = htmlOutput.getAs(MimeType.PDF).setName(`Reference - ${request.candidateName} - ${request.refereeName}.pdf`);
    
    // 5. Save & Return
    const folder = getStorageFolder(); // from Code.gs
    const file = folder.createFile(blob);
    
    return {
      success: true,
      pdfUrl: file.getUrl(),
      pdfFileId: file.getId()
    };

  } catch (e) {
    console.error("PdfGenerator Error:", e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Renderer Class: Handles section layout, estimation, and rendering
 */
/**
 * Renderer Class: Handles section layout, estimation, and rendering
 */
class PdfRenderer {
  constructor(data, mode) {
    this.data = data;
    this.responses = data.responses;
    this.mode = mode;
    this.htmlParts = [];
    
    // State
    this.currentHeight = 0;
    this.pageCount = 1;
    this.simulated = false; // logic flag
    
    // Load Template

    if (this.data.templateId && typeof getTemplateById === 'function') {
        const loaded = getTemplateById(this.data.templateId);
        // getTemplateById returns { result: 'success', template: ... } or just template?
        // Wait, Code.gs getTemplateById returns the template object DIRECTLY? 
        // I need to check Code.gs return signature. 
        // But for now, I'll assume I need to handle whatever getTemplateById returns.
        // Actually, Code.gs likely returns the OBJECT for internal calls. 
        // API wrapper wraps it in success/data.
        // Let's assume global function returns the object.
        this.template = loaded; 
    } else {
        this.template = (typeof getDefaultTemplate === 'function') ? getDefaultTemplate() : null;
    }
  }
  
  dryRun() {
    this.simulated = true;
    this.render(); // build parts but don't return string
    return { pages: this.pageCount, height: this.estimatedTotalHeight };
  }
  
  render() {
    this.htmlParts = [];
    this.currentHeight = PDF_CONFIG.HEIGHTS.HEADER;
    this.estimatedTotalHeight = this.currentHeight;
    this.pageCount = 1;

    // 1. Executive Summary
    if (this.data.aiAnalysis && this.data.aiAnalysis.summary) {
       this.addSection("Executive Summary", this.drawExecutiveSummary(this.data.aiAnalysis));
    }
    
    // 2. Dynamic Template Sections
    if (this.template && this.template.sections) {
      this.template.sections.forEach(section => {
        const content = this.drawTemplateSection(section);
        // Special case for last section (Declaration) to keep together if needed, 
        // though standard flow handles breaks well.
        this.addSection(section.title, content);
      });
    } else {
      // Fallback if template missing (should not happen)
      this.htmlParts.push('<div class="section"><div class="card">Template Missing</div></div>');
    }
    
    return this.htmlParts.join('\n');
  }
  
   /**
    * Adds a section card with page break logic
    */
   addSection(title, contentHtml, keepTogether = false) {
     if (!contentHtml) return; // Skip empty sections
     
     // 1. Estimate Height
     const approxLines = (contentHtml.match(/<div class="info-row"/g) || []).length;
     // Count raw text length to guess wrapping (simulated)
     const textLen = contentHtml.replace(/<[^>]*>/g, '').length;
     const wrappingAdd = Math.floor(textLen / 90) * (this.mode === 'compact' ? 12 : 14); // Text wrap factor
     
     let cardHeight = PDF_CONFIG.HEIGHTS.SECTION_HEADER + PDF_CONFIG.HEIGHTS.PADDING_CARD;
     // Add row heights
     cardHeight += (approxLines * (this.mode === 'compact' ? PDF_CONFIG.HEIGHTS.ROW_COMPACT : PDF_CONFIG.HEIGHTS.ROW_NORMAL));
     cardHeight += wrappingAdd;
 
     // Total section height (margin + card)
     const totalSectionHeight = cardHeight + PDF_CONFIG.HEIGHTS.PADDING_SECTION;
 
     // 2. Check Page Fit
     const spaceOnPage = PDF_CONFIG.PAGE_HEIGHT_PX - this.currentHeight - PDF_CONFIG.HEIGHTS.FOOTER_SPACE;
     
     if (totalSectionHeight > spaceOnPage) {
        // It doesn't fit. 
        // If it's huge (> page height), we must split it (HTML flow handles it naturally, but we want to reset our cursor).
        // If it fits on a fresh page, we force a break.
        
        if (this.currentHeight > 200) { // Only break if we've used some space
           this.htmlParts.push('<div class="page-break"></div>');
           this.currentHeight = 60; // Top margin on next page
           this.pageCount++;
           // If we break, we are at the top, so spaceOnPage is full page.
        }
     }
     
     // 3. Add Content
     this.htmlParts.push(`
       <div class="section">
         <div class="section-header">
            <div class="section-indicator"></div>
            <div class="section-title">${title}</div>
         </div>
         <div class="card">
            <div class="info-grid">
              ${contentHtml}
            </div>
         </div>
       </div>
     `);
     
     this.currentHeight += totalSectionHeight;
     this.estimatedTotalHeight += totalSectionHeight;
   }
   
   // --- Drawing Helpers ---
   
   drawExecutiveSummary(ai) {
      if (!ai || !ai.summary) return null;
      const text = Array.isArray(ai.summary) ? ai.summary.join(' ') : ai.summary;
      return `<div class="info-row"><div class="info-cell full-width"><div class="ai-summary-text">${text}</div></div></div>`;
   }
   
   drawTemplateSection(section) {
     const parts = [];
     const fields = section.fields || [];
     
     // Process fields. Handle layout: 'half' by pairing them.
     for (let i = 0; i < fields.length; i++) {
       const f = fields[i];
       
       // Handle Signature special case
       if (f.id === 'signature' || f.type === 'signature') {
          parts.push(`<div class="info-row"><div class="info-cell full-width">${buildSignatureContent(this.responses[f.id])}</div></div>`);
          continue;
       }

       // Skip hidden conditional fields that have no value?
       // The value in 'responses' should be cleared by frontend logic, so formatted val will be '—'.
       // But if we want to hide fully:
       if (f.conditional) {
          const parentVal = this.responses[f.conditional.field];
          if (parentVal !== f.conditional.value) {
             continue; // Skip rendering
          }
       }
       
       // Handle Pair Layout
       if (f.layout === 'half' && i + 1 < fields.length && fields[i+1].layout === 'half') {
          const f2 = fields[i+1];
          parts.push(this.renderFieldPair(f, f2));
          i++; // Skip next
       } else {
          parts.push(this.renderFieldSingle(f));
       }
     }
     
     return parts.join('');
   }
   
   renderFieldSingle(f) {
     const val = this.responses[f.id];
     
     if (f.type === 'boolean') {
        // Check for child detail field (the next one usually)
        // Actually, the iteration handles the child field separately. 
        // But if we want to nest them visually (detail-row), we need to look ahead.
        // Or we can just render the detail field as a normal row if it appears.
        // Current PDF logic had `yesNoRowWithDetail`.
        // Since we are iterating, the detail field will be visited next.
        // So we just render this boolean.
        return this.yesNoRow(f.label, val);
     }
     
     if (f.type === 'rating') {
        // Single rating? Usually half width. If single:
        return this.ratingRow(f.label, val);
     }
     
     return this.row(f.label, val);
   }
   
   renderFieldPair(f1, f2) {
     const v1 = this.responses[f1.id];
     const v2 = this.responses[f2.id];
     
     if (f1.type === 'rating' || f2.type === 'rating') {
        // Assuming both are ratings if one is, or mixed.
        // ratingRow handles 2 args.
        return this.ratingRow(f1.label, v1, f2.label, v2);
     }
     
     // Standard text/date pair
     // Handle format
     const fv1 = (f1.type === 'date') ? this.formatDate(v1) : v1;
     const fv2 = (f2.type === 'date') ? this.formatDate(v2) : v2;
     
     return this.row(f1.label, fv1, f2.label, fv2);
   }
   
   // --- Primitive Builders ---
   
   row(label1, val1, label2 = null, val2 = null) {
      if (this.mode === 'compact' && !val1 && !val2) return ''; 
      
      let html = `<div class="info-row">`;
      html += this.cell(label1, val1, label2 ? 'half' : 'full-width');
      if (label2) html += this.cell(label2, val2, 'half');
      html += `</div>`;
      return html;
   }
   
   cell(label, val, widthClass) {
      return `<div class="info-cell ${widthClass}">
         <div class="info-label">${label}</div>
         <div class="info-value">${this.formatVal(val)}</div>
      </div>`;
   }
   
   yesNoRow(label, val) {
     const isYes = val === true || val === 'true';
     const disp = isYes ? `<span class="val-yes">☑ Yes</span>` : `<span class="val-no">☐ No</span>`;
     return `<div class="info-row"><div class="info-cell full-width">
        <div class="info-label">${label}</div>
        <div class="info-value">${disp}</div>
     </div></div>`;
   }
   
   ratingRow(label1, val1, label2, val2) {
       let html = `<div class="info-row">`;
       html += `<div class="info-cell ${label2 ? 'half' : 'full-width'}"><div class="info-label">${label1}</div>${this.renderRating(val1)}</div>`;
       if (label2) {
          html += `<div class="info-cell half"><div class="info-label">${label2}</div>${this.renderRating(val2)}</div>`;
       }
       html += `</div>`;
       return html;
   }
   
   renderRating(val) {
       const num = parseInt(val);
       if (isNaN(num)) return '<div class="info-value">-</div>';
       const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
       const text = labels[num - 1] || '';
       const pct = (num / 5) * 100;
       
       return `
         <div class="rating-container">
            <span class="rating-num">${num}/5</span>
            <div class="rating-track"><div class="rating-fill" style="width:${pct}%"></div></div>
            <span class="rating-text">${text}</span>
         </div>
       `;
   }
   
   formatVal(val) {
     if (val === null || val === undefined || val === '') return '—';
     return String(val).replace(/\n/g, '<br>');
   }
   
   formatDate(d) {
     return d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Present';
   }
 }
 
 // --- Simplified Renderers ---
 
 function renderUploadContent(data) {
   const r = data.responses;
   return `
     <div class="section">
       <div class="section-header"><div class="section-indicator"></div><div class="section-title">Reference Document</div></div>
       <div class="card"><div class="info-grid">
          <div class="info-row">
            <div class="info-cell full-width">
              <div class="info-label">Submission Method</div>
              <div class="info-value"><span class="status-badge status-upload">Document Upload</span></div>
            </div>
          </div>
          <div class="info-row">
             <div class="info-cell half"><div class="info-label">File Name</div><div class="info-value">${r.fileName || 'reference.pdf'}</div></div>
             <div class="info-cell half"><div class="info-label">Status</div><div class="info-value">Verified</div></div>
          </div>
          <div class="info-row">
             <div class="info-cell full-width"><div class="info-label">URL</div><div class="info-value link-text">${r.uploadedFileUrl}</div></div>
          </div>
       </div></div>
     </div>
   `;
 }
 
 function renderDeclineContent(data) {
    const r = data.responses;
    const reasons = {
     'policy': 'Company Policy',
     'unknown': 'Don\'t know candidate well enough',
     'conflict': 'Conflict of Interest',
     'other': 'Other'
    };
    return `
      <div class="section">
        <div class="section-header"><div class="section-indicator decline-indicator"></div><div class="section-title">Reference Declined</div></div>
        <div class="card decline-card"><div class="info-grid">
           <div class="info-row">
              <div class="info-cell full-width">
                 <div class="info-label">Status</div>
                 <div class="info-value"><span class="status-badge status-decline">Active Decline</span></div>
              </div>
           </div>
           <div class="info-row">
              <div class="info-cell full-width">
                <div class="info-label">Reason</div>
                <div class="info-value">${reasons[r.declineReason] || r.declineReason}</div>
              </div>
           </div>
           ${r.declineDetails ? `<div class="info-row"><div class="info-cell full-width"><div class="info-label">Additional Feedback</div><div class="info-value">${r.declineDetails}</div></div></div>` : ''}
        </div></div>
      </div>
    `;
 }
 
 /**
  * Helper to build signature HTML
  */
 function buildSignatureContent(signatureData) {
   // Handle missing signature state explicitly
   if (!signatureData) {
      return `
        <div class="signature-card">
           <div class="signature-header">Signature</div>
           <div class="signature-missing">Not provided by referee</div>
        </div>
      `;
   }
   
   // Unwrap if it's a JSON string
   let sig = signatureData;
   if (typeof sig === 'string') {
       try { sig = JSON.parse(sig); } catch (e) {}
   }
 
   // Handle various formats
   const dataUrl = sig.signatureDataUrl || sig.dataUrl || sig; 
   const timestamp = sig.signedAt || sig.timestamp || new Date().toISOString();
   const ip = sig.ip || 'Recorded';
   const agent = sig.userAgent || 'Web Client';
 
   return `
     <div class="signature-card">
        <div class="signature-header">DIGITALLY SIGNED</div>
        <div class="signature-img">
           <img src="${dataUrl}" alt="Signature" />
        </div>
        <div class="signature-meta">
           Signed: ${new Date(timestamp).toLocaleString('en-GB')}<br>
           IP: ${ip}<br>
           Device: ${agent.substring(0, 50)}...
        </div>
     </div>
   `;
 }
