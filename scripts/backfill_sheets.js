/**
 * Backfill existing survey responses to Google Sheets
 * Run: node scripts/backfill_sheets.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('../kru-nsru-edc3f4fefd8b.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const googleSheets = require('../utils/googleSheets');

async function backfillAllResponses() {
  console.log('🚀 Starting backfill process...\n');

  // Check if Google Sheets is configured
  if (!googleSheets.isConfigured()) {
    console.error('❌ Google Sheets not configured!');
    console.log('   Please set GOOGLE_SHEETS_SPREADSHEET_ID in .env file');
    process.exit(1);
  }

  // Test connection
  const testResult = await googleSheets.testConnection();
  if (!testResult.success) {
    console.error('❌ Cannot connect to Google Sheets:', testResult.message);
    process.exit(1);
  }

  console.log('✅ Connected to Google Sheets');
  console.log(`   Spreadsheet: ${testResult.spreadsheetTitle}`);
  console.log(`   URL: ${testResult.spreadsheetUrl}\n`);

  // Create sheets if they don't exist
  console.log('📋 Creating sheets for all surveys...');
  await googleSheets.createAllSheets();
  console.log('');

  // Get all responses
  console.log('📥 Fetching survey responses from Firestore...');
  const responsesSnapshot = await db.collection('survey_responses').get();
  console.log(`   Found ${responsesSnapshot.size} responses\n`);

  if (responsesSnapshot.empty) {
    console.log('ℹ️  No responses to backfill');
    return;
  }

  // Get all users
  console.log('👥 Fetching user data...');
  const usersSnapshot = await db.collection('users').get();
  const usersMap = {};
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    usersMap[userData.studentId] = userData;
  });
  console.log(`   Found ${usersSnapshot.size} users\n`);

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
    console.log(`\n📊 Backfilling survey: ${surveyId}`);
    console.log(`   Responses: ${responses.length}`);

    let successCount = 0;
    let failedCount = 0;

    for (const response of responses) {
      const userData = usersMap[response.userId] || {};
      
      try {
        const success = await googleSheets.appendSurveyResponse(
          surveyId,
          response,
          userData
        );

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`   ✅ Success: ${successCount}`);
    if (failedCount > 0) {
      console.log(`   ❌ Failed: ${failedCount}`);
    }

    totalSuccess += successCount;
    totalFailed += failedCount;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Backfill Summary:');
  console.log(`   Total responses: ${responsesSnapshot.size}`);
  console.log(`   Successfully exported: ${totalSuccess}`);
  if (totalFailed > 0) {
    console.log(`   Failed: ${totalFailed}`);
  }
  console.log('='.repeat(50));
  console.log('\n✅ Backfill completed!');
}

// Run backfill
backfillAllResponses()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });
