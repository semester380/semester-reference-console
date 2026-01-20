/**
 * Smart Chase System
 * Automatically chases pending references based on configured rules.
 */

const CHASE_LIMIT_DAYS = 21; // 3 Weeks

function runSmartChase(staff) {
  console.log('Starting Smart Chase run...');
  const ss = getDatabaseSpreadsheet();
  const sheet = ss.getSheetByName('Requests_Log');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Column Mappings
  const colMap = {};
  headers.forEach((h, i) => colMap[h] = i);
  
  const now = new Date();
  let chasesSent = 0;
  
  // Iterate requests
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[colMap['Status']];
    const requestId = row[colMap['RequestID']];
    
    // Only chase Pending states
    if (status !== 'Pending Referee' && status !== 'Pending Candidate') {
      continue;
    }
    
    // Determine last activity time
    const createdAt = new Date(row[colMap['CreatedAt']]);
    const lastChaseRaw = row[colMap['LastChaseDate']];
    let lastChase = lastChaseRaw ? new Date(lastChaseRaw) : null;
    
    // Check Total Duration Limit (3 Weeks)
    const totalDurationDays = Math.ceil(Math.abs(now - createdAt) / (1000 * 60 * 60 * 24));
    if (totalDurationDays > CHASE_LIMIT_DAYS) {
       // Stop chasing
       continue;
    }
    
    // Base time to compare against: Last Chase OR CreatedAt (if never chased)
    let baseTime = lastChase || createdAt;
    
    // Calculate difference since LAST ACTIVITY
    const diffTime = Math.abs(now - baseTime);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Standard Chase Interval (e.g., 3 days)
    const interval = (typeof CHASE_INTERVAL_DAYS !== 'undefined') ? CHASE_INTERVAL_DAYS : 3;
    
    if (diffDays >= interval) {
       console.log(`Chasing Request ${requestId} (${status}) - Days since last: ${diffDays} (Total: ${totalDurationDays})`);
       
       try {
         const requesterEmail = row[colMap['RequesterEmail']];
         
         if (status === 'Pending Referee') {
            const refereeEmail = row[colMap['RefereeEmail']];
            const refereeName = row[colMap['RefereeName']];
            const candidateName = row[colMap['CandidateName']];
            const refereeToken = row[colMap['RefereeToken']];
            
            // Use Reminder Email
            sendRefereeReminderEmail(
                refereeEmail, 
                refereeName, 
                candidateName, 
                refereeToken, 
                requesterEmail
            );
            
         } else if (status === 'Pending Candidate') {
            const candidateEmail = row[colMap['CandidateEmail']];
            const candidateName = row[colMap['CandidateName']];
            const consentToken = row[colMap['ConsentToken']];
            const refereeName = row[colMap['RefereeName']];
            
            // Use Reminder Email
            sendCandidateConsentReminderEmail(
                candidateEmail, 
                candidateName, 
                consentToken, 
                refereeName,
                requesterEmail
            );
         }
         
         // Update Last Chase Date
         sheet.getRange(i + 1, colMap['LastChaseDate'] + 1).setValue(now);
         chasesSent++;
         
       } catch (e) {
         console.error(`Failed to chase ${requestId}:`, e);
       }
    }
  }
  
  return { success: true, chasesSent: chasesSent };
}
