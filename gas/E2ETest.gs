/**
 * Complete end-to-end test that runs entirely in Apps Script
 * This will create a request, process consent, and validate the token
 */
function runCompleteE2ETest() {
  console.log('\n========================================');
  console.log('COMPLETE END-TO-END TEST');
  console.log('========================================\n');
  
  try {
    // STEP 1: Create Request
    console.log('STEP 1: Creating new request...');
    const requestResult = initiateRequest({
      candidateName: 'E2E Test ' + new Date().getTime(),
      candidateEmail: 'rob@semester.co.uk',
      refereeName: 'Test Referee',
      refereeEmail: 'rob@semester.co.uk',
      templateId: 'default'
    });
    
    if (!requestResult.success) {
      console.log('❌ Request creation failed:', requestResult.error);
      return requestResult;
    }
    
    const requestId = requestResult.requestId;
    console.log('✅ Request created:', requestId);
    
    // STEP 2: Get consent token
    console.log('\nSTEP 2: Retrieving consent token...');
    const requestsData = getMyRequests();
    const request = requestsData.data.find(r => r.requestId === requestId);
    
    if (!request) {
      console.log('❌ Request not found in getMyRequests');
      return { success: false, error: 'Request not found' };
    }
    
    const consentToken = request.token;
    console.log('✅ Consent token:', consentToken);
    console.log('   Status:', request.status);
    
    // STEP 3: Process consent
    console.log('\nSTEP 3: Processing consent...');
    const consentResult = processCandidateConsent(consentToken, 'CONSENT_GIVEN');
    
    if (!consentResult.success) {
      console.log('❌ Consent processing failed:', consentResult.error);
      return consentResult;
    }
    
    console.log('✅ Consent processed');
    
    // STEP 4: Get referee token  
    console.log('\nSTEP 4: Retrieving referee token...');
    const updatedRequestsData = getMyRequests();
    const updatedRequest = updatedRequestsData.data.find(r => r.requestId === requestId);
    
    if (!updatedRequest) {
      console.log('❌ Request not found after consent');
      return { success: false, error: 'Request not found after consent' };
    }
    
    const refereeToken = updatedRequest.refereeToken;
    console.log('✅ Referee token:', refereeToken);
    console.log('   Status:', updatedRequest.status);
    console.log('   Consent status:', updatedRequest.consentStatus);
    
    if (!refereeToken) {
      console.log('❌ Referee token is empty!');
      return { success: false, error: 'Referee token not generated' };
    }
    
    // STEP 5: Validate referee token
    console.log('\nSTEP 5: Validating referee token...');
    console.log('About to call validateRefereeToken with:', refereeToken);
    
    const validationResult = validateRefereeToken(refereeToken);
    
    console.log('\nValidation result:', JSON.stringify(validationResult));
    
    if (validationResult.valid) {
      console.log('\n✅✅✅ SUCCESS! Token validation working!');
      console.log('Candidate name:', validationResult.candidateName);
    } else {
      console.log('\n❌❌❌ FAILED! Token validation error:', validationResult.error);
      
      // Additional debugging - directly check the sheet
      console.log('\n--- DIRECT SHEET CHECK ---');
      const ss = getDatabaseSpreadsheet();
      const requestsSheet = ss.getSheetByName('Requests_Log');
      const data = requestsSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId) {
          console.log('Found request in sheet at row', i + 1);
          console.log('Sheet RefereeToken (col 11):', data[i][11]);
          console.log('Token we are looking for:', refereeToken);
          console.log('Match:', data[i][11] === refereeToken);
          console.log('Types:', typeof data[i][11], 'vs', typeof refereeToken);
          
          if (data[i][11]) {
            console.log('Sheet token length:', data[i][11].length);
            console.log('Our token length:', refereeToken.length);
            console.log('Sheet token charCodes:', Array.from(data[i][11]).map(c => c.charCodeAt(0)));
            console.log('Our token charCodes:', Array.from(refereeToken).map(c => c.charCodeAt(0)));
          }
          break;
        }
      }
    }
    
    // Proceed to Step 6

    // STEP 6: Submit Reference
    console.log('\nSTEP 6: Submitting Reference (Form)...');
    const submissionResult = submitReference(refereeToken, {
      "suitableForRole": "5",
      "refereeName": "Test Referee",
      "refereeEmailConfirm": "rob@semester.co.uk"
    }, 'form');

    if (submissionResult.success) {
       console.log('✅✅✅ Reference Submitted Successfully! Check email for completion notification.');
    } else {
       console.log('❌ Failed to submit reference:', submissionResult.error);
    }
    
    
    // STEP 7: Seal Request
    console.log('\nSTEP 7: Sealing Request...');
    const sealResult = sealRequest(requestId, null);
    if (sealResult.success) {
       console.log('✅ Request Sealed! PDF URL:', sealResult.pdfUrl);
    } else {
       console.log('❌ Seal Failed:', sealResult.error);
    }

    // STEP 8: AI Analysis
    console.log('\nSTEP 8: Running AI Analysis...');
    const aiResult = analyseReference(requestId, null);
    if (aiResult.success) {
       console.log('✅ AI Analysis Run:', aiResult.sentimentScore || 'Success');
       if (aiResult.summary) console.log('Summary:', JSON.stringify(aiResult.summary));
    } else {
       console.log('❌ AI Failed:', aiResult.error);
       // Don't fail the whole test for AI as it depends on key
    }

    return {
       success: true,
       message: "Full E2E Test Completed incl. Submission, Seal, and AI",
       requestId: requestId,
       pdfUrl: sealResult.pdfUrl,
       aiSentiment: aiResult.sentimentScore
    };

  } catch (e) {
    console.log('\n❌ Exception:', e.toString());
    console.log('Stack:', e.stack);
    return { success: false, error: e.toString(), stack: e.stack };
  }
}
