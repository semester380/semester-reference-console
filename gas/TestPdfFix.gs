function runManualSealVerification() {
  const requestId = '3606fd47-2851-4671-ac8a-c1107dc6c5a3';
  const staff = { email: 'rob@semester.co.uk', name: 'Rob', roles: ['Admin'] };
  
  console.log('Triggering manual seal for verification...');
  const result = sealRequest(requestId, staff);
  
  console.log('Seal Result:', JSON.stringify(result));
  return result;
}
