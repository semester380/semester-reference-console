/**
 * Test PDF generation with the fix
 * Run this after deploying v35
 */
function testPdfGenerationFix() {
  console.log('=== TESTING PDF GENERATION FIX ===');
  
  // Create a fresh request for clean testing
  console.log('Creating new test request...');
  const createResult = initiateRequest({
    candidateName: 'PDF Test ' + new Date().getTime(),
    candidateEmail: 'test@example.com',
    refereeName: 'PDF Test Referee',
    refereeEmail: 'test@example.com',
    templateId: 'default'
  });
  
  if (!createResult.success) {
    console.error('Failed to create request:', createResult.error);
    return;
  }
  
  const requestId = createResult.requestId;
  console.log('Created request:', requestId);
  
  // Get the consent token
  const requests = getMyRequests();
  const request = requests.data.find(r => r.requestId === requestId);
  const consentToken = request.token;
  console.log('Consent token:', consentToken);
  
  // Process consent
  console.log('Processing consent...');
  const consentResult = processCandidateConsent(consentToken, 'CONSENT_GIVEN');
  console.log('Consent result:', JSON.stringify(consentResult));
  
  // Get referee token
  const updatedRequests = getMyRequests();
  const updatedRequest = updatedRequests.data.find(r => r.requestId === requestId);
  const refereeToken = updatedRequest.refereeToken;
  console.log('Referee token:', refereeToken);
  
  // Submit reference
  console.log('Submitting reference...');
  const responses = {
    q1: 5,
    q2: 4,
    q3: true,
    q4: 'Outstanding candidate with excellent skills. Highly recommended for this position.',
    sig1: { typedName: 'PDF Test Referee', signedAt: new Date().toISOString() }
  };
  
  const submitResult = submitReference(refereeToken, responses, 'form');
  console.log('Submit result:', JSON.stringify(submitResult));
  
  // Generate PDF
  console.log('Generating PDF...');
  const pdfResult = sealRequest(requestId);
  console.log('PDF result:', JSON.stringify(pdfResult));
  
  if (pdfResult.success && pdfResult.pdfUrl) {
    console.log('');
    console.log('✅✅✅ PDF GENERATED SUCCESSFULLY! ✅✅✅');
    console.log('');
    console.log('PDF URL: ' + pdfResult.pdfUrl);
    console.log('');
    console.log('Please click the URL above to verify the PDF displays correctly.');
  } else {
    console.log('❌ PDF generation failed:', pdfResult.error);
  }
}
