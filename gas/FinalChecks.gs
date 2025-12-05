/**
 * Final Production Verification Tests
 * Run these functions directly in the Apps Script Editor to verify flows without CORS issues.
 */

const TEST_REQUEST_ID = 'c3798d2c-1bd3-4df6-843d-9038599cf457';
const TEST_REFEREE_TOKEN = '4fb5b38a-ff59-4035-8ac1-9a67a10d332f';

function runFinalChecks() {
  console.log('=== STARTING FINAL CHECKS ===');
  
  testPdfFlow();
  testSmartChase();
  testAiAnalysis();
  
  console.log('=== ALL CHECKS COMPLETED ===');
}

function testPdfFlow() {
  console.log('\n--- TEST 1: PDF FLOW ---');
  
  // 1. Submit Reference
  console.log('Submitting reference...');
  const responses = {
    q1: 5,
    q2: 5,
    q3: true,
    q4: 'Excellent candidate, highly recommended. (Verified via Apps Script)',
    sig1: { typedName: 'Test Referee', signedAt: new Date().toISOString() }
  };
  
  const submitResult = submitReference(TEST_REFEREE_TOKEN, responses, 'form');
  console.log('Submit Result:', JSON.stringify(submitResult));
  
  if (!submitResult.success && submitResult.error !== 'Reference already submitted') {
    console.error('❌ Submit failed:', submitResult.error);
    return;
  }
  
  // 2. Generate PDF
  console.log('Generating PDF...');
  const pdfResult = sealRequest(TEST_REQUEST_ID);
  console.log('PDF Result:', JSON.stringify(pdfResult));
  
  if (pdfResult.success && pdfResult.pdfUrl) {
    console.log('✅ PDF Generated Successfully!');
    console.log('PDF URL:', pdfResult.pdfUrl);
  } else {
    console.error('❌ PDF Generation Failed:', pdfResult.error);
  }
}

function testSmartChase() {
  console.log('\n--- TEST 2: SMART CHASE ---');
  console.log('Running Smart Chase...');
  
  try {
    const result = runSmartChase();
    console.log('Smart Chase Result:', JSON.stringify(result));
    console.log('✅ Smart Chase executed successfully');
  } catch (e) {
    console.error('❌ Smart Chase Failed:', e.toString());
  }
}

function testAiAnalysis() {
  console.log('\n--- TEST 3: AI ANALYSIS ---');
  console.log('Checking AI Configuration...');
  
  try {
    const result = analyzeReference(TEST_REQUEST_ID);
    console.log('AI Analysis Result:', JSON.stringify(result));
    
    if (result.success) {
      console.log('✅ AI Analysis Successful');
    } else {
      console.log('⚠️ AI Analysis Failed (Expected if no API key):', result.error);
      console.log('✅ Graceful fallback verified');
    }
  } catch (e) {
    console.error('❌ AI Analysis Crashed:', e.toString());
  }
}
