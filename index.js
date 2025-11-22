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

// Root redirect
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/survey/home');
  } else {
    res.redirect('/login');
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
});
