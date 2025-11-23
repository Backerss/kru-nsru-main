const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
// Load environment variables from .env (ensure this runs before reading process.env)
require('dotenv').config();

// Load service account from file
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'kru-nsru-edc3f4fefd8b.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch (error) {
  console.error('❌ Google Sheets: Service account file not found');
}

// Spreadsheet ID will be set by admin (store in env or config)
function getSpreadsheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null;
}
// Initialize Google Sheets API client
let sheets = null;
let isConfigured = false;

function initializeGoogleSheets() {
  if (!serviceAccount || !getSpreadsheetId()) {
    return false;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheets = google.sheets({ version: 'v4', auth });
    isConfigured = true;
    return true;
  } catch (error) {
    console.error('❌ Google Sheets initialization failed');
    return false;
  }
}

// Map survey IDs to sheet names
const SURVEY_SHEET_NAMES = {
  'ethical-knowledge': 'Ethical Knowledge',
  'intelligent-tck': 'TCK',
  'intelligent-tk': 'TK',
  'intelligent-tpack': 'TPACK',
  'intelligent-tpk': 'TPK'
};

// Map survey IDs to file names
const SURVEY_FILES = {
  'ethical-knowledge': 'ethical-knowledge.json',
  'intelligent-tck': 'intelligent-tck.json',
  'intelligent-tk': 'intelligent-tk.json',
  'intelligent-tpack': 'intelligent-tpack.json',
  'intelligent-tpk': 'intelligent-tpk.json'
};

/**
 * Load survey questions from definition file
 * @param {string} surveyId - Survey identifier
 * @returns {Array} Array of questions
 */
function loadSurveyQuestions(surveyId) {
  try {
    const filename = SURVEY_FILES[surveyId];
    if (!filename) return [];

    const surveyPath = path.join(__dirname, '..', 'data', 'surveys', filename);
    const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));
    return surveyData.questions || [];
  } catch (error) {
    return [];
  }
}

/**
 * Check if response already exists in sheet
 * @param {string} sheetName - Sheet name
 * @param {string} studentId - Student ID to check
 * @param {string} timestamp - Timestamp to check (optional for fuzzy matching)
 * @returns {Promise<boolean>} True if exists
 */
async function isResponseExists(sheetName, studentId, timestamp = null) {
  try {
    const spreadsheetId = getSpreadsheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A2:B1000` // Get Timestamp and Student ID columns
    });
    
    const rows = response.data.values || [];
    
    // Check if this student ID already exists
    for (const row of rows) {
      const [rowTimestamp, rowStudentId] = row;
      if (rowStudentId === studentId) {
        // If timestamp provided, check if it's within 5 seconds (same response)
        if (timestamp) {
          const rowTime = new Date(rowTimestamp).getTime();
          const checkTime = new Date(timestamp).getTime();
          if (Math.abs(rowTime - checkTime) < 5000) {
            return true; // Same response
          }
        } else {
          return true; // Student already has response
        }
      }
    }
    
    return false;
  } catch (error) {
    return false; // If error, assume not exists
  }
}

/**
 * Append a survey response to Google Sheets
 * @param {string} surveyId - Survey identifier
 * @param {object} responseData - Response data
 * @param {object} userData - User data
 * @param {boolean} checkDuplicate - Whether to check for duplicates (default: true)
 * @returns {Promise<boolean>} Success status
 */
async function appendSurveyResponse(surveyId, responseData, userData, checkDuplicate = true) {
  if (!isConfigured && !initializeGoogleSheets()) {
    console.log('ℹ️  Google Sheets export disabled (not configured)');
    return false;
  }

  try {
    const sheetName = SURVEY_SHEET_NAMES[surveyId] || surveyId;
    const spreadsheetId = getSpreadsheetId();
    
    // Check if sheet is empty and needs headers
    try {
      const checkRange = `${sheetName}!A1:Z1`;
      const checkResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: checkRange
      });
      
      const existingHeaders = checkResponse.data.values?.[0] || [];
      
      if (existingHeaders.length === 0) {
        const questions = loadSurveyQuestions(surveyId);
        const questionHeaders = questions.map((q, idx) => `Q${q.id}: ${q.question.substring(0, 50)}`);
        
        const headers = [
          'Timestamp',
          'Student ID',
          'Name',
          'Email',
          'Faculty',
          'Major',
          'Year',
          'Role',
          ...questionHeaders
        ];
        
        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: checkRange,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });
      }
    } catch (headerError) {
      // Headers check failed, continue anyway
    }
    
    const timestamp = responseData.timestamp || new Date().toISOString();
    const studentId = userData.studentId || '';

    // Check for duplicate if enabled
    if (checkDuplicate && studentId) {
      const exists = await isResponseExists(sheetName, studentId, timestamp);
      if (exists) {
        console.log(`ℹ️  Response already exists in ${sheetName} for student ${studentId} - skipping`);
        return true; // Return true to indicate "handled" (not an error)
      }
    }

    // Build row data
    const rowData = [
      timestamp,
      studentId,
      `${userData.prefix || ''}${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      userData.email || '',
      userData.faculty || '',
      userData.major || '',
      userData.year || '',
      userData.role || 'student'
    ];

    // Add answers (convert object to array of values)
    const answers = responseData.answers || {};
    const answerValues = [];
    
    // Sort by question number and add values
    const questionKeys = Object.keys(answers).sort((a, b) => {
      const numA = parseInt(a.replace('question_', ''));
      const numB = parseInt(b.replace('question_', ''));
      return numA - numB;
    });

    questionKeys.forEach(key => {
      const value = answers[key];
      answerValues.push(value !== null && value !== undefined ? value : '');
    });

    rowData.push(...answerValues);

    // Append to sheet
    const range = `${sheetName}!A:Z`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });

    return true;

  } catch (error) {
    console.error(`❌ Failed to append to ${surveyId}:`, error.message);
    
    return false;
  }
}

/**
 * Create or ensure sheet headers exist
 * @param {string} surveyId - Survey identifier
 * @param {array} questionHeaders - Array of question header labels
 * @returns {Promise<boolean>}
 */
async function ensureSheetHeaders(surveyId, questionHeaders) {
  if (!isConfigured && !initializeGoogleSheets()) {
    return false;
  }

  try {
    const sheetName = SURVEY_SHEET_NAMES[surveyId] || surveyId;
    const headers = [
      'Timestamp',
      'Student ID',
      'Name',
      'Email',
      'Faculty',
      'Major',
      'Year',
      'Role',
      ...questionHeaders
    ];

    // Check if sheet exists and has headers
    const range = `${sheetName}!A1:Z1`;
    const spreadsheetId = getSpreadsheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range
    });

    const existingHeaders = response.data.values?.[0] || [];
    
    if (existingHeaders.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create sheets for all surveys if they don't exist
 * @returns {Promise<boolean>}
 */
async function createAllSheets() {
  if (!isConfigured && !initializeGoogleSheets()) {
    return false;
  }

  try {
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

    const requests = [];
    Object.values(SURVEY_SHEET_NAMES).forEach(sheetName => {
      if (!existingSheets.includes(sheetName)) {
        requests.push({
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        });
      }
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: { requests }
      });
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Test connection and permissions
 * @returns {Promise<object>}
 */
async function testConnection() {
  const spreadsheetId = getSpreadsheetId();
  const hasServiceAccount = !!serviceAccount;
  
  // Return detailed debug info
  const debugInfo = {
    hasServiceAccount: hasServiceAccount,
    serviceAccountEmail: serviceAccount?.client_email || 'N/A',
    hasSpreadsheetId: !!spreadsheetId,
    spreadsheetId: spreadsheetId || 'N/A',
    isConfigured: isConfigured
  };

  if (!hasServiceAccount) {
    return {
      success: false,
      message: 'ไม่พบไฟล์ Service Account (kru-nsru-firebase.json)',
      debug: debugInfo
    };
  }

  if (!spreadsheetId) {
    return {
      success: false,
      message: 'ไม่พบ GOOGLE_SHEETS_SPREADSHEET_ID ใน environment variables',
      debug: debugInfo
    };
  }

  if (!isConfigured && !initializeGoogleSheets()) {
    return {
      success: false,
      message: 'ไม่สามารถเริ่มต้น Google Sheets API',
      debug: debugInfo
    };
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    return {
      success: true,
      message: 'เชื่อมต่อสำเร็จ',
      spreadsheetTitle: spreadsheet.data.properties.title,
      spreadsheetUrl: spreadsheet.data.spreadsheetUrl,
      sheetCount: spreadsheet.data.sheets.length,
      debug: debugInfo
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      code: error.code,
      debug: debugInfo,
      hint: error.code === 404 ? 'Spreadsheet ID ไม่ถูกต้อง หรือไม่มีอยู่จริง' : 
            error.code === 403 ? 'Service account ไม่มีสิทธิ์เข้าถึง - ต้อง Share spreadsheet ให้ ' + serviceAccount?.client_email : 
            'ตรวจสอบ Spreadsheet ID และ Service Account ให้ถูกต้อง'
    };
  }
}

/**
 * Clear all data in a sheet (keep headers)
 * @param {string} sheetName - Sheet name
 * @returns {Promise<boolean>}
 */
async function clearSheetData(sheetName) {
  try {
    const spreadsheetId = getSpreadsheetId();
    
    // Get all data to find last row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:Z`
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return true; // No data to clear (only headers or empty)
    }
    
    // Clear from row 2 onwards (keep headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A2:Z${rows.length}`
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear ${sheetName}:`, error.message);
    return false;
  }
}

/**
 * Sync/Backfill all existing survey responses from Firestore to Google Sheets
 * This will clear existing data and re-import from Firestore (single source of truth)
 * @param {object} db - Firestore database instance
 * @returns {Promise<object>} Summary of sync operation
 */
async function backfillAllResponses(db) {
  console.log('🔄 Syncing data from Firestore to Google Sheets...');
  
  if (!isConfigured && !initializeGoogleSheets()) {
    return { success: false, message: 'Not configured' };
  }

  try {
    const testResult = await testConnection();
    if (!testResult.success) {
      return { success: false, message: testResult.message };
    }

    await createAllSheets();

    // Get all responses from Firestore (source of truth)
    const responsesSnapshot = await db.collection('survey_responses').get();
    
    if (responsesSnapshot.empty) {
      console.log('ℹ️  No data in Firestore to sync');
      return { success: true, message: 'No data to sync' };
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersMap[userData.studentId] = userData;
    });

    // Group responses by survey
    const responsesBySurvey = {};
    responsesSnapshot.forEach(doc => {
      const response = { id: doc.id, ...doc.data() };
      const surveyId = response.surveyId;
      
      if (!responsesBySurvey[surveyId]) {
        responsesBySurvey[surveyId] = [];
      }
      responsesBySurvey[surveyId].push(response);
    });

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    console.log(`📊 Found ${responsesSnapshot.size} responses in Firestore`);

    // Process each survey
    for (const [surveyId, responses] of Object.entries(responsesBySurvey)) {
      const sheetName = SURVEY_SHEET_NAMES[surveyId] || surveyId;
      console.log(`\n📋 Syncing ${sheetName}: ${responses.length} responses`);
      
      // Clear existing data in sheet to avoid duplicates
      await clearSheetData(sheetName);
      console.log(`   ✓ Cleared existing data`);
      
      // Re-import all responses from Firestore
      for (const response of responses) {
        const userData = usersMap[response.userId] || {};
        
        try {
          // Don't check duplicates since we just cleared the sheet
          const success = await appendSurveyResponse(surveyId, response, userData, false);
          if (success) {
            totalSuccess++;
          } else {
            totalFailed++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`   ❌ Error syncing response: ${error.message}`);
          totalFailed++;
        }
      }
      
      console.log(`   ✓ Synced ${responses.length} responses`);
    }

    console.log(`\n✅ Sync completed: ${totalSuccess}/${responsesSnapshot.size} synced successfully`);

    return {
      success: true,
      total: responsesSnapshot.size,
      synced: totalSuccess,
      failed: totalFailed,
      skipped: totalSkipped
    };
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Check if sheets have data
 * @returns {Promise<object>} Status of each sheet
 */
async function checkSheetsData() {
  if (!isConfigured && !initializeGoogleSheets()) {
    return { success: false, message: 'Not configured' };
  }

  try {
    const spreadsheetId = getSpreadsheetId();
    const sheetStatus = {};
    let hasAnyData = false;

    for (const [surveyId, sheetName] of Object.entries(SURVEY_SHEET_NAMES)) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: `${sheetName}!A2:A2` // Check if row 2 exists (data after header)
        });
        
        const hasData = response.data.values && response.data.values.length > 0;
        sheetStatus[surveyId] = {
          name: sheetName,
          hasData: hasData
        };
        if (hasData) hasAnyData = true;
      } catch (error) {
        sheetStatus[surveyId] = {
          name: sheetName,
          hasData: false,
          error: 'Sheet not found'
        };
      }
    }

    return {
      success: true,
      hasAnyData: hasAnyData,
      sheets: sheetStatus
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  appendSurveyResponse,
  ensureSheetHeaders,
  createAllSheets,
  testConnection,
  backfillAllResponses,
  checkSheetsData,
  clearSheetData,
  isConfigured: () => isConfigured
};
