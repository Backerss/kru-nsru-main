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
 * Append a survey response to Google Sheets
 * @param {string} surveyId - Survey identifier
 * @param {object} responseData - Response data
 * @param {object} userData - User data
 * @returns {Promise<boolean>} Success status
 */
async function appendSurveyResponse(surveyId, responseData, userData) {
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
    
    const timestamp = new Date().toISOString();

    // Build row data
    const rowData = [
      timestamp,
      userData.studentId || '',
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
 * Backfill all existing survey responses from Firestore to Google Sheets
 * @param {object} db - Firestore database instance
 * @returns {Promise<object>} Summary of backfill operation
 */
async function backfillAllResponses(db) {
  console.log('🔄 Backfilling data to Google Sheets...');
  
  if (!isConfigured && !initializeGoogleSheets()) {
    return { success: false, message: 'Not configured' };
  }

  try {
    const testResult = await testConnection();
    if (!testResult.success) {
      return { success: false, message: testResult.message };
    }

    await createAllSheets();

    const responsesSnapshot = await db.collection('survey_responses').get();
    
    if (responsesSnapshot.empty) {
      return { success: true, message: 'No data to backfill' };
    }

    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersMap[userData.studentId] = userData;
    });

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

    for (const [surveyId, responses] of Object.entries(responsesBySurvey)) {
      for (const response of responses) {
        const userData = usersMap[response.userId] || {};
        
        try {
          const success = await appendSurveyResponse(surveyId, response, userData);
          if (success) totalSuccess++; else totalFailed++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          totalFailed++;
        }
      }
    }

    console.log(`✅ Backfill completed: ${totalSuccess}/${responsesSnapshot.size} exported`);

    return {
      success: true,
      total: responsesSnapshot.size,
      exported: totalSuccess,
      failed: totalFailed
    };
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
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
  isConfigured: () => isConfigured
};
