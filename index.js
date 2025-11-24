const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const session = require('express-session');
const passport = require('passport');
const { verifyEmailConfig } = require('./utils/emailService');
require('dotenv').config();

// Initialize Firebase
try {
  const serviceAccount = require('./kru-nsru-firebase.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
}

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 3000;

// Import routes
const authRoutes = require('./routes/auth');
const surveyRoutes = require('./routes/survey');
const forgotPasswordRoutes = require('./routes/forgot-password');
const adminRoutes = require('./routes/admin');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Make db accessible to routes
app.set('db', db);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'kru-nsru-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Root redirect - Show landing page
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/survey/home');
  } else {
    // Load survey data from JSON files
    const fs = require('fs');
    const surveys = [
      'ethical-knowledge',
      'intelligent-tk',
      'intelligent-tck',
      'intelligent-tpk',
      'intelligent-tpack'
    ].map(surveyId => {
      try {
        const surveyPath = path.join(__dirname, 'data', 'surveys', `${surveyId}.json`);
        const surveyData = JSON.parse(fs.readFileSync(surveyPath, 'utf8'));
        return {
          id: surveyData.id,
          title: surveyData.title,
          description: surveyData.description,
          icon: surveyData.icon || 'clipboard-check',
          questionCount: surveyData.questionCount || surveyData.questions?.length || 0,
          duration: surveyData.duration || '10'
        };
      } catch (error) {
        console.error(`Error loading survey ${surveyId}:`, error);
        return null;
      }
    }).filter(s => s !== null);
    
    res.render('index', { surveys });
  }
});

// Use routes
app.use('/', authRoutes);
app.use('/survey', surveyRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use('/admin', adminRoutes);

app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  
  // Verify email configuration
  await verifyEmailConfig();
  
  // Auto-backfill existing data to Google Sheets (run once on startup)
  setTimeout(async () => {
    const googleSheets = require('./utils/googleSheets');
    await googleSheets.backfillAllResponses(db);
  }, 2000); // Wait 2 seconds for server to fully start
});
