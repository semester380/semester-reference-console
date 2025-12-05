/**
 * Staff Management System
 * Handles CRUD operations for internal staff members with role-based access control
 */

const SHEET_STAFF = 'Staff';

/**
 * Initialize Staff sheet with schema and seed data
 */
function initializeStaffSheet() {
  const ss = getDatabaseSpreadsheet();
  
  // Check if sheet already exists
  let staffSheet = ss.getSheetByName(SHEET_STAFF);
  if (!staffSheet) {
    staffSheet = ss.insertSheet(SHEET_STAFF);
  } else {
    // Sheet exists, only add data if empty
    if (staffSheet.getLastRow() > 0) {
      return { success: true, message: 'Staff sheet already initialized' };
    }
  }
  
  // Set up headers
  const headers = [
    'StaffId',
    'Name',
    'Email',
    'Role',
    'Active',
    'CreatedAt',
    'UpdatedAt'
  ];
  
  staffSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  staffSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
  // Seed initial staff members
  const initialStaff = [
    {
      name: 'Rob Arnold',
      email: 'rob@semester.co.uk',
      role: 'Admin'
    },
    {
      name: 'Nichola Jenkinson',
      email: 'nichola@semester.co.uk',
      role: 'Recruiter'
    },
    {
      name: 'Nicola Wilson',
      email: 'nicola@semester.co.uk',
      role: 'Recruiter'
    },
    {
      name: 'Shaun Bourke',
      email: 'shaun@semester.co.uk',
      role: 'Recruiter'
    },
    {
      name: 'Sam Bedford',
      email: 'sam@semester.co.uk',
      role: 'Recruiter'
    },
    {
      name: 'Theresa Commons',
      email: 'theresa@semester.co.uk',
      role: 'Recruiter'
    }
  ];
  
  const now = new Date();
  const seedData = initialStaff.map(staff => [
    Utilities.getUuid(), // StaffId
    staff.name,
    staff.email,
    staff.role,
    true, // Active
    now, // CreatedAt
    now  // UpdatedAt
  ]);
  
  staffSheet.getRange(2, 1, seedData.length, headers.length).setValues(seedData);
  
  // Set column widths for readability
  staffSheet.setColumnWidth(1, 280); // StaffId (UUID)
  staffSheet.setColumnWidth(2, 180); // Name
  staffSheet.setColumnWidth(3, 220); // Email
  staffSheet.setColumnWidth(4, 100); // Role
  staffSheet.setColumnWidth(5, 80);  // Active
  staffSheet.setColumnWidth(6, 160); // CreatedAt
  staffSheet.setColumnWidth(7, 160); // UpdatedAt
  
  // Freeze header row
  staffSheet.setFrozenRows(1);
  
  return {
    success: true,
    message: `Staff sheet initialized with ${initialStaff.length} members`,
    count: initialStaff.length
  };
}

/**
 * Get staff member by email
 */
function getStaffByEmail(email) {
  if (!email) return null;
  
  const ss = getDatabaseSpreadsheet();
  const staffSheet = ss.getSheetByName(SHEET_STAFF);
  
  if (!staffSheet) {
    console.error('Staff sheet does not exist. Run initializeStaffSheet() first.');
    return null;
  }
  
  const data = staffSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Dynamic column lookup
  const colStaffId = headers.indexOf('StaffId');
  const colName = headers.indexOf('Name');
  const colEmail = headers.indexOf('Email');
  const colRole = headers.indexOf('Role');
  const colActive = headers.indexOf('Active');
  const colCreatedAt = headers.indexOf('CreatedAt');
  const colUpdatedAt = headers.indexOf('UpdatedAt');
  
  // Search for email (case-insensitive)
  const emailLower = email.toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][colEmail]).toLowerCase();
    if (rowEmail === emailLower) {
      return {
        staffId: data[i][colStaffId],
        name: data[i][colName],
        email: data[i][colEmail],
        role: data[i][colRole],
        active: data[i][colActive],
        createdAt: data[i][colCreatedAt],
        updatedAt: data[i][colUpdatedAt]
      };
    }
  }
  
  return null;
}

/**
 * List all active staff members (Admin only)
 */
function listStaff() {
  const ss = getDatabaseSpreadsheet();
  const staffSheet = ss.getSheetByName(SHEET_STAFF);
  
  if (!staffSheet) {
    return { success: false, error: 'Staff sheet not initialized' };
  }
  
  const data = staffSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Dynamic column lookup
  const colStaffId = headers.indexOf('StaffId');
  const colName = headers.indexOf('Name');
  const colEmail = headers.indexOf('Email');
  const colRole = headers.indexOf('Role');
  const colActive = headers.indexOf('Active');
  const colCreatedAt = headers.indexOf('CreatedAt');
  const colUpdatedAt = headers.indexOf('UpdatedAt');
  
  const staff = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][colActive]) { // Only return active staff
      staff.push({
        staffId: data[i][colStaffId],
        name: data[i][colName],
        email: data[i][colEmail],
        role: data[i][colRole],
        active: data[i][colActive],
        createdAt: data[i][colCreatedAt],
        updatedAt: data[i][colUpdatedAt]
      });
    }
  }
  
  return {
    success: true,
    data: staff,
    count: staff.length
  };
}

/**
 * Add new staff member (Admin only)
 */
function addStaff(name, email, role) {
  if (!name || !email || !role) {
    return { success: false, error: 'Name, email, and role are required' };
  }
  
  // Validate role
  if (!['Admin', 'Recruiter'].includes(role)) {
    return { success: false, error: 'Role must be Admin or Recruiter' };
  }
  
  // Validate email domain
  if (!email.endsWith('@semester.co.uk')) {
    return { success: false, error: 'Email must be a @semester.co.uk address' };
  }
  
  const ss = getDatabaseSpreadsheet();
  const staffSheet = ss.getSheetByName(SHEET_STAFF);
  
  if (!staffSheet) {
    return { success: false, error: 'Staff sheet not initialized' };
  }
  
  // Check if email already exists
  const existing = getStaffByEmail(email);
  if (existing) {
    return { success: false, error: 'Staff member with this email already exists' };
  }
  
  const staffId = Utilities.getUuid();
  const now = new Date();
  
  const newRow = [
    staffId,
    name,
    email,
    role,
    true, // Active
    now,  // CreatedAt
    now   // UpdatedAt
  ];
  
  staffSheet.appendRow(newRow);
  
  return {
    success: true,
    message: 'Staff member added successfully',
    staffId: staffId
  };
}

/**
 * Update staff member details (Admin only)
 */
function updateStaff(staffId, updates) {
  if (!staffId) {
    return { success: false, error: 'StaffId is required' };
  }
  
  const ss = getDatabaseSpreadsheet();
  const staffSheet = ss.getSheetByName(SHEET_STAFF);
  
  if (!staffSheet) {
    return { success: false, error: 'Staff sheet not initialized' };
  }
  
  const data = staffSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Dynamic column lookup
  const colStaffId = headers.indexOf('StaffId');
  const colName = headers.indexOf('Name');
  const colEmail = headers.indexOf('Email');
  const colRole = headers.indexOf('Role');
  const colActive = headers.indexOf('Active');
  const colUpdatedAt = headers.indexOf('UpdatedAt');
  
  // Find staff member
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colStaffId] === staffId) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, error: 'Staff member not found' };
  }
  
  // Apply updates
  if (updates.name !== undefined) {
    staffSheet.getRange(rowIndex + 1, colName + 1).setValue(updates.name);
  }
  
  if (updates.email !== undefined) {
    // Validate email domain
    if (!updates.email.endsWith('@semester.co.uk')) {
      return { success: false, error: 'Email must be a @semester.co.uk address' };
    }
    staffSheet.getRange(rowIndex + 1, colEmail + 1).setValue(updates.email);
  }
  
  if (updates.role !== undefined) {
    // Validate role
    if (!['Admin', 'Recruiter'].includes(updates.role)) {
      return { success: false, error: 'Role must be Admin or Recruiter' };
    }
    staffSheet.getRange(rowIndex + 1, colRole + 1).setValue(updates.role);
  }
  
  if (updates.active !== undefined) {
    staffSheet.getRange(rowIndex + 1, colActive + 1).setValue(updates.active);
  }
  
  // Always update UpdatedAt timestamp
  staffSheet.getRange(rowIndex + 1, colUpdatedAt + 1).setValue(new Date());
  
  return {
    success: true,
    message: 'Staff member updated successfully'
  };
}

/**
 * Deactivate staff member (soft delete) (Admin only)
 */
function deactivateStaff(staffId) {
  return updateStaff(staffId, { active: false });
}

/**
 * Reactivate staff member (Admin only)
 */
function reactivateStaff(staffId) {
  return updateStaff(staffId, { active: true });
}
