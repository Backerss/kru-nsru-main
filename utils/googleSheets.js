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
  console.log('✅ Service account loaded:', serviceAccount.client_email);
} catch (error) {
  console.error('❌ Google Sheets: Service account file not found or invalid:', error.message);
  console.error('   Expected path:', SERVICE_ACCOUNT_PATH);
}

// Spreadsheet ID will be set by admin (store in env or config)
function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null;
  if (!id) {
    console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID is not set in environment');
    console.error('   Current env keys:', Object.keys(process.env).filter(k => k.includes('GOOGLE')).join(', '));
  }
  return id;
}
// Initialize Google Sheets API client
let sheets = null;
let isConfigured = false;

function initializeGoogleSheets() {
  if (!serviceAccount) {
    console.warn('⚠️  Google Sheets: Service account not loaded');
    return false;
  }

  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    console.warn('⚠️  Google Sheets: SPREADSHEET_ID not set in environment');
    return false;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    sheets = google.sheets({ version: 'v4', auth });
    isConfigured = true;
    console.log('✅ Google Sheets API initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Google Sheets:', error.message);
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
    if (!filename) {
      console.warn(`⚠️  Unknown survey ID: ${surveyId}`);
      return [];
    }

    const surveyPath = path.join(__dirname, '..', 'data', 'surveys', filename);
    const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));
    return surveyData.questions || [];
  } catch (error) {
    console.error(`❌ Error loading survey questions for ${surveyId}:`, error.message);
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
        // Sheet is empty, add headers first
        console.log(`📋 Adding headers to ${sheetName}...`);
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
        
        console.log(`✅ Headers added to ${sheetName}`);
      }
    } catch (headerError) {
      console.warn('⚠️  Could not check/add headers:', headerError.message);
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

    console.log(`✅ Appended response to Google Sheets: ${surveyId} (${userData.studentId})`);
    return true;

  } catch (error) {
    console.error('❌ Error appending to Google Sheets:', error.message);
    
    // Log detailed error for debugging
    if (error.code === 404) {
      console.error(`   Sheet "${SURVEY_SHEET_NAMES[surveyId]}" not found in spreadsheet`);
    } else if (error.code === 403) {
      console.error('   Permission denied - check service account has Editor access');
    }
    
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
      // No headers, add them
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
      console.log(`✅ Added headers to sheet: ${sheetName}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error ensuring sheet headers:', error.message);
    return false;
  }
}

/**
 * Create sheets for all surveys if they don't exist
 * @returns {Promise<boolean>}
 */
async function createAllSheets() {
  if (!isConfigured && !initializeGoogleSheets()) {
    console.log('❌ Cannot create sheets - Google Sheets not configured');
    return false;
  }

  try {
    // Get existing sheets
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

    // Create missing sheets
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
      console.log(`✅ Created ${requests.length} new sheet(s)`);
    } else {
      console.log('ℹ️  All sheets already exist');
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating sheets:', error.message);
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
  console.log('\n🔄 Starting automatic backfill to Google Sheets...');
  
  if (!isConfigured && !initializeGoogleSheets()) {
    console.log('⚠️  Skipping backfill - Google Sheets not configured');
    return { success: false, message: 'Not configured' };
  }

  try {
    // Test connection first
    const testResult = await testConnection();
    if (!testResult.success) {
      console.log('⚠️  Skipping backfill - Cannot connect to Google Sheets');
      return { success: false, message: testResult.message };
    }

    console.log(`✅ Connected to: ${testResult.spreadsheetTitle}`);

    // Create sheets if they don't exist
    await createAllSheets();

    // Get all responses from Firestore
    const responsesSnapshot = await db.collection('survey_responses').get();
    
    if (responsesSnapshot.empty) {
      console.log('ℹ️  No responses to backfill');
      return { success: true, message: 'No data to backfill' };
    }

    console.log(`📥 Found ${responsesSnapshot.size} responses in Firestore`);

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersMap[userData.studentId] = userData;
    });

    // Group by survey
    const responsesBySurvey = {};
    responsesSnapshot.forEach(doc => {
      const response = { id: doc.id, ...doc.data() };
      const surveyId = response.surveyId;
      
      if (!responsesBySurvey[surveyId]) {
        responsesBySurvey[surveyId] = [];
      }
      responsesBySurvey[surveyId].push(response);
    });

    // Backfill each survey
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const [surveyId, responses] of Object.entries(responsesBySurvey)) {
      console.log(`\n📊 Backfilling ${surveyId}: ${responses.length} responses`);

      for (const response of responses) {
        const userData = usersMap[response.userId] || {};
        
        try {
          const success = await appendSurveyResponse(
            surveyId,
            response,
            userData
          );

          if (success) {
            totalSuccess++;
          } else {
            totalFailed++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
          totalFailed++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Backfill Summary:');
    console.log(`   Total responses: ${responsesSnapshot.size}`);
    console.log(`   Successfully exported: ${totalSuccess}`);
    if (totalFailed > 0) {
      console.log(`   Failed: ${totalFailed}`);
    }
    console.log('='.repeat(60));
    console.log('✅ Backfill completed!\n');

    return {
      success: true,
      total: responsesSnapshot.size,
      exported: totalSuccess,
      failed: totalFailed
    };
  } catch (error) {
    console.error('\n❌ Backfill failed:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  appendSurveyResponse,
  ensureSheetHeaders,
  createAllSheets,
  testConnection,
  backfillAllResponses,
  isConfigured: () => isConfigured
};
