
/**
 * Temporary Seeder for Production Admin
 * Run via: npx @google/clasp run seedProductionAdmin
 */
function seedProductionAdmin() {
  console.log("Attempting to seed Rob Arnold...");
  
  // existing checks are inside addStaff, but let's be verbose
  const email = 'rob@semester.co.uk';
  const existing = getStaffByEmail(email);
  
  if (existing) {
    if (!existing.active) {
       console.log("User exists but inactive. Reactivating...");
       const result = reactivateStaff(existing.staffId);
       return "Reactivated: " + JSON.stringify(result);
    }
    return "User already exists and is active: " + JSON.stringify(existing);
  }
  
  const result = addStaff('Rob Arnold', email, 'Admin');
  console.log("Add Result:", result);
  return result;
}
