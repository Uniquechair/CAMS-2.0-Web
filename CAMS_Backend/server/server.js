const multer = require('multer');
const nodemailer = require('nodemailer'); 
const express = require('express');
const compression = require('compression');
const pdfModule = require('pdf-parse');
const axios = require('axios');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
console.log('pdfModule:', pdfModule);


const pdfParse = typeof pdfModule === 'function'
  ? pdfModule
  : pdfModule.default;

const uploadPdf = multer({
  storage: multer.memoryStorage()
});

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
      fieldSize: 25 * 1024 * 1024, 
      fileSize: 25 * 1024 * 1024  
  }
});

const sql = require('mssql');
const cors = require('cors');
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client("1098095757409-qq8kk80vqijn2ajp56soj7nanc3q5snq.apps.googleusercontent.com");
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const sharp = require('sharp');
require("dotenv").config({ path: path.resolve(__dirname, '.env') });

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const bucket = admin.storage().bucket();
console.log('Firebase bucket:', process.env.FIREBASE_STORAGE_BUCKET);

const uploadBufferToFirebase = async (buffer, folder, originalName, contentType = 'image/jpeg') => {
  const safeName = String(originalName || 'image.jpg')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '');

  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
  const file = bucket.file(fileName);

  await file.save(buffer, {
    metadata: {
      contentType,
    },
    resumable: false,
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};

const isFirebaseOrHttpUrl = (value = '') => {
  const text = String(value || '').trim();
  return text.startsWith('http://') || text.startsWith('https://');
};

const isBase64Image = (value = '') => {
  const text = String(value || '').trim();

  return (
    text.startsWith('data:image/') ||
    text.length > 5000
  ) && !isFirebaseOrHttpUrl(text);
};

const base64ToBuffer = (value = '') => {
  let text = String(value || '').trim();

  // Handles: data:image/jpeg;base64,xxxxx
  if (text.includes(',')) {
    text = text.split(',').pop();
  }

  return Buffer.from(text, 'base64');
};

const getBase64ContentType = (value = '') => {
  const text = String(value || '').trim();

  if (text.startsWith('data:image/png')) return 'image/png';
  if (text.startsWith('data:image/webp')) return 'image/webp';
  if (text.startsWith('data:image/jpeg') || text.startsWith('data:image/jpg')) return 'image/jpeg';

  return 'image/jpeg';
};

const migrateOneBase64ImageToFirebase = async (base64Value, folder, filePrefix) => {
  const contentType = getBase64ContentType(base64Value);
  const rawBuffer = base64ToBuffer(base64Value);

  const resizedImageBuffer = await sharp(rawBuffer)
    .resize({
      width: 800,
      height: 600,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 80,
      progressive: true
    })
    .toBuffer();

  return await uploadBufferToFirebase(
    resizedImageBuffer,
    folder,
    `${filePrefix}.jpg`,
    'image/jpeg'
  );
};

const uploadRoomImagesAndReplaceRefs = async (roomDetailsRaw, roomFiles = [], roomImageMapRaw = []) => {
  let rooms = [];

  try {
    rooms = JSON.parse(roomDetailsRaw || '[]');
  } catch (err) {
    console.error('Invalid room_details JSON:', err.message);
    return roomDetailsRaw || '[]';
  }

  const mapItems = Array.isArray(roomImageMapRaw)
    ? roomImageMapRaw
    : roomImageMapRaw
      ? [roomImageMapRaw]
      : [];

  const parsedMap = mapItems
    .map((item) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const refToUrl = {};

  for (const map of parsedMap) {
    const file = roomFiles[Number(map.index)];

    if (!file || !map.ref) continue;

    const resizedImageBuffer = await sharp(file.buffer)
      .resize({
        width: 800,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    const imageUrl = await uploadBufferToFirebase(
      resizedImageBuffer,
      'room-images',
      file.originalname,
      'image/jpeg'
    );

    refToUrl[map.ref] = imageUrl;
  }

  const replaceRefs = (value) => {
    if (Array.isArray(value)) return value.map(replaceRefs);

    if (value && typeof value === 'object') {
      const updated = {};
      Object.keys(value).forEach((key) => {
        updated[key] = replaceRefs(value[key]);
      });
      return updated;
    }

    if (typeof value === 'string' && refToUrl[value]) {
      return refToUrl[value];
    }

    return value;
  };

  return JSON.stringify(replaceRefs(rooms));
};
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const cron = require('node-cron');

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// In-memory refresh token store: token -> { userid, usergroup, username, expiresAt }
const refreshTokenStore = new Map();

const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

const getCookieOptions = (maxAge) => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    ...(maxAge ? { maxAge } : {})
  };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken', getCookieOptions());
  res.clearCookie('refreshToken', getCookieOptions());
};

// const connectionString = process.env.DATABASE_URL ;
const crypto = require('crypto');
const port =8080;

const calculatePriceWithCommission = async (basePriceInput) => {
    const basePrice = parseFloat(basePriceInput);
    if (isNaN(basePrice) || basePrice <= 0) {
        throw new Error("Invalid property price");
    }

    // Securely fetch the live rate from the database!
    let commissionRate = 0.07; // Default fallback
    const commRes = await pool.query('SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1');
    if (commRes.rows.length > 0) {
        commissionRate = parseFloat(commRes.rows[0].commission_rate);
    }

    const commissionFee = basePrice * commissionRate;
    const finalPrice = basePrice + commissionFee;

    return {
        basePrice,
        commissionFee: Number(commissionFee.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        appliedRate: commissionRate
    };
};

// Add encryption and decryption keys and functions
const encryptionKey = Buffer.from('12345678901234567890123456789012', 'utf8'); // 256-bit key
const iv = Buffer.from('1234567890123456', 'utf8'); // Initialization vector 
// Encryption function
const encrypt = (text) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decryption function
const decrypt = (encryptedText) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 25060,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false   // encrypts but skips strict check
  }
});

// =======================================================
// AUDIT TRAIL TIMEZONE
// Always record actual Malaysia time for new audit records.
// =======================================================

const setupAuditTrailTimestamp = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION
      set_audit_trail_action_time()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.timestamp :=
          clock_timestamp()
          AT TIME ZONE
          'Asia/Kuala_Lumpur';

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS
      trg_set_audit_trail_action_time
      ON audit_trail;
    `);

    await client.query(`
      CREATE TRIGGER
      trg_set_audit_trail_action_time
      BEFORE INSERT
      ON audit_trail
      FOR EACH ROW
      EXECUTE FUNCTION
      set_audit_trail_action_time();
    `);

    console.log(
      'Audit Trail Malaysia timestamp trigger ready.'
    );
  } finally {
    client.release();
  }
};

const app = express();
let productCache = {
  data: null,
  expiresAt: 0,
};
app.use(compression());

const PRODUCT_CACHE_TTL = 30 * 1000; // 30 seconds

const clearProductCache = () => {
  productCache = {
    data: null,
    expiresAt: 0,
  };
};

// WAITLIST EMAILER
// Temporarily disabled because the "enquiry" table does not exist in the database.
// Keep this function name because other parts of the backend still call notifyWaitlistedUsers().
async function notifyWaitlistedUsers(propertyid, freedCheckIn, freedCheckOut) {
    console.log(
        `Waitlist notification skipped. Property: ${propertyid}, Dates: ${freedCheckIn} to ${freedCheckOut}`
    );

    return;
}

/*
async function notifyWaitlistedUsers(propertyid, freedCheckIn, freedCheckOut) {
    let client;
    try {
        console.log(`Checking waitlist for Property: ${propertyid} between ${freedCheckIn} and ${freedCheckOut}`);
        client = await pool.connect();

        const result = await client.query(`
            SELECT email, name, checkindatetime, checkoutdatetime 
            FROM enquiry 
            WHERE propertyid = $1 
            AND status = 'Waitlisted'
            AND (
                (checkindatetime < $3 AND checkoutdatetime > $2)
            )
        `, [propertyid, freedCheckIn, freedCheckOut]);

        const waitlistedUsers = result.rows;

        if (waitlistedUsers.length === 0) {
            console.log('No waitlisted users found for these freed dates.');
            return;
        }

        for (let user of waitlistedUsers) {
            await axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: {
                        name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                        email: process.env.BREVO_SENDER_EMAIL,
                    },
                    to: [
                        {
                            email: user.email,
                            name: user.name || 'User',
                        },
                    ],
                    subject: 'Great News! Your Requested Dates are Available!',
                    textContent: `Hello ${user.name},\n\nThe dates you requested are now available again! Please visit our website to secure your booking before it gets taken.\n\nThank you!`
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log(`Waitlist notification sent to ${user.email}`);
        }
    } catch (error) {
        console.error('Error in notifyWaitlistedUsers:', error.response?.data || error.message);
    } finally {
        if (client) {
            client.release();
        }
    }
}
*/

// --- LEDGER ---
// Prevent duplicate ledger rows for the same reservation + activity + stock + booking status.
const insertLedgerEntry = async (dbClient, data) => {
  const normalizedReservationId = data.reservationid || null;

  if (!normalizedReservationId) {
    throw new Error('reservationid is required for ledger entry');
  }

  const query = `
    INSERT INTO booking_ledger (
      reservationid, propertyid, propertyname, roomtype,
      moderator_userid, moderator_username, customer_userid, customer_name,
      activity_type, stock_status, booking_status,
      gross_amount, commission_rate, commission_amount, moderator_earning,
      credit, debit, expected_amount, remarks
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19
    )
    ON CONFLICT (reservationid) WHERE reservationid IS NOT NULL
    DO UPDATE SET
      propertyid = EXCLUDED.propertyid,
      propertyname = EXCLUDED.propertyname,
      roomtype = EXCLUDED.roomtype,
      moderator_userid = EXCLUDED.moderator_userid,
      moderator_username = EXCLUDED.moderator_username,
      customer_userid = EXCLUDED.customer_userid,
      customer_name = EXCLUDED.customer_name,
      activity_type = EXCLUDED.activity_type,
      stock_status = EXCLUDED.stock_status,
      booking_status = EXCLUDED.booking_status,
      gross_amount = EXCLUDED.gross_amount,
      commission_rate = EXCLUDED.commission_rate,
      commission_amount = EXCLUDED.commission_amount,
      moderator_earning = EXCLUDED.moderator_earning,
      credit = EXCLUDED.credit,
      debit = EXCLUDED.debit,
      expected_amount = EXCLUDED.expected_amount,
      remarks = EXCLUDED.remarks,
      timestamp = NOW()
    RETURNING ledgerid
  `;

  const values = [
    normalizedReservationId,
    data.propertyid || null,
    data.propertyname || null,
    data.roomtype || null,
    data.moderator_userid || null,
    data.moderator_username || null,
    data.customer_userid || null,
    data.customer_name || null,
    data.activity_type || null,
    data.stock_status || null,
    data.booking_status || null,
    data.gross_amount || 0,
    data.commission_rate || 0,
    data.commission_amount || 0,
    data.moderator_earning || 0,
    data.credit || 0,
    data.debit || 0,
    data.expected_amount || 0,
    data.remarks || null
  ];

  const result = await dbClient.query(query, values);
  return result.rows[0];
};

const failedAttempts = {}; 

// REVIEW CONTENT FILTER
// Manual filter

const reviewSensitiveWords = [
  // English offensive words
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'bastard',
  'dick',
  'pussy',
  'cibai',
  'mother fucker',

  // Scam / harmful accusation words
  'scam',
  'fraud',

  // Hate / violence words
  'racist',
  'kill',
  'murder',

  // Malay / local offensive words
  'bodoh',
  'pukimak',
  'babi',
  'sial',
  'bangsat',
  'pantat',

  // Sensitive religious / extremist terms
  'allah',
  'jesus',
  'buddha',
  'islam',
  'muslim',
  'christian',
  'hindu',
  'jew',
  'terrorist'
];

const escapeRegExp = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const filterReviewText = (text = '') => {
  if (typeof text !== 'string') return '';

  let filteredText = text.trim();

  reviewSensitiveWords.forEach((word) => {
    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
  });

  return filteredText;
};
app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://167.99.113.105',
      'https://sarawakadventures.com',
      'https://www.sarawakadventures.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser());

// JWT auth middleware — skips public routes only
const publicPaths = [
  { path: '/login',          method: 'POST' },
  { path: '/register',       method: 'POST' },
  { path: '/google-login',   method: 'POST' },
  { path: '/forgot-password',method: 'POST' },
  { path: '/refresh-token',  method: 'POST' },
  { path: '/support-question', method: 'POST' },
  { path: '/check-register-duplicate', method: 'POST' },
  { path: '/product',        method: 'GET'  },
  { path: '/pricing-settings', method: 'GET' },
  { path: '/blackouts', method: 'GET' },
  { path: '/property-availability', method: 'GET' },
  { path: '/property-sold-out-dates', method: 'GET' },
  { path: '/faqs', method: 'GET' },
  { path: '/manage-holidays', method: 'GET' },
{ path: '/manage-festive', method: 'GET' },
{ path: '/calculate-price', method: 'POST' },
{ path: '/commission', method: 'GET' },
{ path: '/api/commission', method: 'GET' },
  { path: '/admin/migrate-property-images-to-firebase', method: 'POST' },
  { path: '/mfa/send-email-otp', method: 'POST' },
  { path: '/mfa/verify-login',   method: 'POST' }
];

const authenticateToken = (req, res, next) => {
  // Allow internal cron job route without login
  if (req.path === '/send_payment_reminders') {
    return next();
  }

  // Mobile: check Authorization: Bearer header first
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  // Web fallback: cookie
  if (!token) {
    token = req.cookies.accessToken;
  }

 if (!token) {
  return res.status(401).json({
    message: 'Not authenticated.',
    success: false,
    authenticated: false
  });
}
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', success: false });
    }
    return res.status(403).json({ message: 'Invalid token.', success: false });
  }
};

app.use((req, res, next) => {
  const isPublic = publicPaths.some(
    p => p.path === req.path && p.method === req.method
  );

  if (isPublic) return next();
   
  
  if (req.method === 'GET' && /^\/fetch-holidays\/\d{4}$/.test(req.path)) {
    return next();
  }

  // Allow customer property details page to fetch full images before login
  if (req.method === 'GET' && /^\/property\/\d+$/.test(req.path)) {
    return next();
  }

  if (req.method === 'GET' && req.path.startsWith('/reviews/')) {
    return next();
  }

  return authenticateToken(req, res, next);
});

app.post('/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: 'No refresh token provided.',
      success: false
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const newAccessToken = generateAccessToken({
      userid: decoded.userid,
      usergroup: decoded.usergroup,
      username: decoded.username
    });

  res.cookie('accessToken', newAccessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));

    return res.status(200).json({
      message: 'Token refreshed successfully.',
      success: true
    });
  } catch (err) {
    clearTokenCookies(res);

    return res.status(403).json({
      message: 'Invalid or expired refresh token. Please login again.',
      success: false
    });
  }
});

// Close database connection pool on server shutdown
process.on('SIGINT', async () => {
  if (pool) {
    try {
      await pool.end();   
      console.log('Database connection pool closed');
    } catch (err) {
      console.error('Error closing the connection pool:', err);
    }
  }
  process.exit();
});

app.post('/check-register-duplicate', async (req, res) => {
  const { email, phoneNumber } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phoneNumber || '').replace(/\D/g, '');

  if (!normalizedEmail || !normalizedPhone) {
    return res.status(400).json({
      success: false,
      message: 'Email and phone number are required.'
    });
  }

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `
      SELECT userid, username, uemail, uphoneno
      FROM users
      WHERE LOWER(TRIM(COALESCE(uemail, ''))) = $1
         OR COALESCE(uphoneno::text, '') = $2
      LIMIT 1
      `,
      [normalizedEmail, normalizedPhone]
    );

    if (result.rows.length > 0) {
      const existingUser = result.rows[0];

      if (
        existingUser.uemail &&
        String(existingUser.uemail).trim().toLowerCase() === normalizedEmail
      ) {
        return res.status(409).json({
          success: false,
          field: 'email',
          message: 'This email is already registered. Please use another email.'
        });
      }

      return res.status(409).json({
        success: false,
        field: 'phone',
        message: 'This phone number is already registered. Please use another phone number.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email and phone number are available.'
    });

  } catch (err) {
    console.error('Check register duplicate error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking account details.'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// Registration
app.post('/register', async (req, res) => {
  const { firstName, lastName, username, password, email, uphoneno } = req.body;
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  try {
    client = await pool.connect();

  const normalizedEmail = String(email || '').trim().toLowerCase();
const normalizedPhone = String(uphoneno || '').replace(/\D/g, '');
const normalizedUsername = String(username || '').trim();

const checkUserQuery = {
  text: `
    SELECT username, uemail, uphoneno
    FROM users
    WHERE LOWER(TRIM(COALESCE(uemail, ''))) = $1
       OR LOWER(TRIM(COALESCE(username, ''))) = LOWER(TRIM($2))
       OR COALESCE(uphoneno::text, '') = $3
    LIMIT 1
  `,
  values: [normalizedEmail, normalizedUsername, normalizedPhone]
};

const checkResult = await client.query(checkUserQuery);

if (checkResult.rows.length > 0) {
  const existingUser = checkResult.rows[0];

  if (
    existingUser.uemail &&
    String(existingUser.uemail).trim().toLowerCase() === normalizedEmail
  ) {
    return res.status(409).json({
      message: 'Email already exists. Please use another email.',
      success: false
    });
  }

  if (
    existingUser.username &&
    String(existingUser.username).trim() === String(username).trim()
  ) {
    return res.status(409).json({
      message: 'Username already exists. Please use another username.',
      success: false
    });
  }

  return res.status(409).json({
    message: 'Phone number already exists. Please use another phone number.',
    success: false
  });
}
    
    // Encrypt the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
   const defaultAvatar = 'https://firebasestorage.googleapis.com/v0/b/fypcams2026.firebasestorage.app/o/images%2Fuser.jpg?alt=media&token=bf7b4aee-eb15-4fa6-a8f4-39ea2530ff52';

    const insertUserQuery = {
      text: `
        INSERT INTO users (
          username, password, uemail, utitle, usergroup, ustatus, uactivation, uimage,
          ufirstname, ulastname, clusterid, uphoneno
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING userid
      `,
      values: [
  username,
  hashedPassword,
  normalizedEmail,
  "Mr.",
  'Customer',
  'registered',
  'Active',
  defaultAvatar,
  firstName,
  lastName,
  '1',
  normalizedPhone
]
    };
    
    const userQueryResult = await client.query(insertUserQuery);

    const userid = userQueryResult.rows[0].userid;

    const registerAuditTrail = await client.query (
        `INSERT INTO audit_trail (
            entityid, timestamp, entitytype, actiontype, action, userid, username
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userid, timestamp, "Users", "POST", "Register An Account", userid, username
        ]
    );

    res.status(201).json({ message: 'User registered successfully', success: true });
  } catch (err) {
    console.error('Error during registration:', err.message);
    console.error(err.stack);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

//Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  try {
    client = await pool.connect();
    
    // FETCH USER (Added MFA and Login History columns)
   const result = await client.query(`
  SELECT userid, usergroup, uactivation, password, username, uimage,
         mfa_enabled, mfa_secret, last_login_ip, last_login_device
  FROM users 
  WHERE (username = $1 OR uemail = $1)
`, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password', success: false });
    }

    const user = result.rows[0];

    if (user.uactivation === 'Inactive') {
      return res.status(403).json({ message: 'This account has been suspended. Please try to contact the administrator to activate your account.', success: false });
    }

    let passwordMatch = false;
    let needsRehash = false;

    // Try bcrypt first
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (_) {}

    // Fallback: try legacy AES decryption
    if (!passwordMatch) {
      try {
        const decryptedPassword = decrypt(user.password);
        if (password === decryptedPassword) {
          passwordMatch = true;
          needsRehash = true;
        }
      } catch (_) {}
    }

    if (passwordMatch) {
      if (needsRehash) {
        const newHash = await bcrypt.hash(password, saltRounds);
        await client.query('UPDATE users SET password = $1 WHERE userid = $2', [newHash, user.userid]);
      }
      delete failedAttempts[username];

      // --- MFA LOGIC INJECTION ---
      const incomingIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
      const incomingDevice = req.headers['user-agent'] || '';

      const hasLoginHistory = !!user.last_login_ip;
      const ipChanged = hasLoginHistory && (user.last_login_ip !== incomingIP);
      const deviceChanged = hasLoginHistory && (user.last_login_device !== incomingDevice);
      const isSuspicious = ipChanged || deviceChanged;

      const requiresMFA = user.mfa_enabled && (!hasLoginHistory || isSuspicious);

      if (requiresMFA) {
        // Issue Temp Token for MFA phase, do NOT fully log them in yet
        const tempToken = jwt.sign(
          { userid: user.userid, purpose: 'mfa_verification' },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        );
        return res.status(200).json({ success: true, requiresMFA: true, tempToken });
      }
      // --- END MFA LOGIC ---

      // Normal Login Finalization
      await client.query(
        `UPDATE users SET ustatus = 'login', last_login_ip = $1, last_login_device = $2 WHERE username = $3 OR uemail = $3`, 
        [incomingIP, incomingDevice, username]
      );

      const userid = user.userid;
      await client.query(
        `INSERT INTO audit_trail (entityid, timestamp, entitytype, actiontype, action, userid, username) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userid, timestamp, "Users", "POST", "Login", userid, user.username]
      );

      const tokenPayload = { userid: user.userid, usergroup: user.usergroup, username: user.username };
      const accessToken  = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

     refreshTokenStore.set(refreshToken, {
  ...tokenPayload,
  expiresAt: Date.now() + REFRESH_TOKEN_MAX_AGE
});
      const isMobile = req.headers['x-client-type'] === 'mobile';
      setTokenCookies(res, accessToken, refreshToken);

      const responsePayload = {
  message: 'Login Successful',
  success: true,
  userid: user.userid,
  usergroup: user.usergroup,
  uactivation: user.uactivation,
  username: user.username,
  uimage: user.uimage || null,
};

      if (isMobile) {
        responsePayload.accessToken = accessToken;
        responsePayload.refreshToken = refreshToken;
      }
      return res.status(200).json(responsePayload);

    } else {
      // Failed attempts logic remains untouched
      const now = Date.now();
      if (!failedAttempts[username]) {
        failedAttempts[username] = { count: 1, lastAttemptTime: now };
      } else {
        failedAttempts[username].count++;
        failedAttempts[username].lastAttemptTime = now;
      }
      if (failedAttempts[username].count >= 5) {
        await client.query(`UPDATE users SET uactivation = 'Inactive' WHERE username = $1 OR uemail = $1`, [username]);
        delete failedAttempts[username];
        return res.status(403).json({ message: 'Account locked due to too many failed login attempts.', success: false });
      }
      return res.status(401).json({ message: 'Invalid username or password', success: false });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});

//Logout
app.post('/logout', async (req, res) => {
  const { userid } = req.body;
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  try {
    client = await pool.connect();
    
    await client.query(
      `UPDATE users SET ustatus = 'logout' WHERE userid = $1`,
      [userid]
    );

    const usernameQuery = await client.query (
      `SELECT username FROM users WHERE userid = $1`,
      [userid]
    );

    const username = usernameQuery.rows[0].username;

    const logoutAuditTrail = await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userid, timestamp, "Users", "POST", "Logout", userid, username
      ]
    );

    // Remove refresh token from in-memory store
    const isMobile = req.headers['x-client-type'] === 'mobile';
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      refreshTokenStore.delete(refreshToken);
    }

    if (!isMobile) {
      clearTokenCookies(res);
    }

    res.status(200).json({ message: 'Logout Successful', success: true });
  } catch (err) {
    console.error('Error during logout:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Google Login
app.post("/google-login", async (req, res) => {
  console.log("✅ /google-login route hit");

  const { token } = req.body;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let dbClient;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Google token is missing."
    });
  }

  try {
    const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const googlePayload = await googleResponse.json();

    if (!googleResponse.ok || !googlePayload.email) {
      console.error("Google token verification failed:", googlePayload);
      return res.status(401).json({
        success: false,
        message: "Google authentication failed. Please try again."
      });
    }

    const email = String(googlePayload.email || "").trim().toLowerCase();
    const givenName = googlePayload.given_name || "";
    const familyName = googlePayload.family_name || "";
    const picture = googlePayload.picture || "";

    dbClient = await pool.connect();

    const result = await dbClient.query(
      `
      SELECT userid, usergroup, uactivation, username, uimage
      FROM users
      WHERE LOWER(TRIM(uemail)) = $1
      LIMIT 1
      `,
      [email]
    );

    let userId;
    let userGroup;
    let username;
    let uimage;
    let statusCode = 200;
    let message = "Login Successful";

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (user.uactivation === "Inactive") {
        return res.status(403).json({
          success: false,
          message: "Account suspended."
        });
      }

      userId = user.userid;
      userGroup = user.usergroup;
      username = user.username;
      uimage = user.uimage || picture || "";

      await dbClient.query(
        `
        UPDATE users
        SET ustatus = 'login',
            uimage = COALESCE(NULLIF(uimage, ''), $2)
        WHERE userid = $1
        `,
        [userId, picture]
      );

      await dbClient.query(
        `
        INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [userId, timestamp, "Users", "POST", "Google Login", userId, username]
      );
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      username = givenName
        ? `${givenName.replace(/\s+/g, "")}_${randomSuffix}`
        : `user_${randomSuffix}`;

      const dummyPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(dummyPassword, saltRounds);

      const newUser = await dbClient.query(
        `
        INSERT INTO users (
          username, password, uemail, utitle, usergroup, ustatus,
          uactivation, uimage, ufirstname, ulastname, clusterid
        )
        VALUES ($1, $2, $3, 'Mr.', 'Customer', 'login',
                'Active', $4, $5, $6, '1')
        RETURNING userid, usergroup, uactivation, username, uimage
        `,
        [
          username,
          hashedPassword,
          email,
          picture,
          givenName,
          familyName
        ]
      );

      const createdUser = newUser.rows[0];

      userId = createdUser.userid;
      userGroup = createdUser.usergroup;
      username = createdUser.username;
      uimage = createdUser.uimage || picture || "";
      statusCode = 201;
      message = "Registration Successful";

      await dbClient.query(
        `
        INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [userId, timestamp, "Users", "POST", "Google Registration", userId, username]
      );
    }

    const tokenPayload = {
      userid: userId,
      usergroup: userGroup,
      username
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    refreshTokenStore.set(refreshToken, {
      ...tokenPayload,
      expiresAt: Date.now() + REFRESH_TOKEN_MAX_AGE
    });

    const isMobile = req.headers["x-client-type"] === "mobile";

    setTokenCookies(res, accessToken, refreshToken);

    const responsePayload = {
      success: true,
      message,
      userid: userId,
      usergroup: userGroup,
      uactivation: "Active",
      username,
      uimage
    };

    if (isMobile) {
      responsePayload.accessToken = accessToken;
      responsePayload.refreshToken = refreshToken;
    }

    return res.status(statusCode).json(responsePayload);
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Google login failed."
    });
  } finally {
    if (dbClient) dbClient.release();
  }
});

// Fetch list of customers
app.get('/users/customers', async (req, res) => {
  const { userid } = req.query;
  let client;

  if (!userid) {
    return res.status(400).json({ message: 'Missing userid parameter', success: false });
  }

  try {
    client = await pool.connect();

    const userResult = await client.query(
      `
      SELECT clusterid, usergroup
      FROM users
      WHERE userid = $1
      `,
      [userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const clusterid = userResult.rows[0].clusterid;
    const usergroup = userResult.rows[0].usergroup;

    let result;

if (
  usergroup === 'Owner' ||
  usergroup === 'Administrator' ||
  usergroup === 'Moderator'
) {
  result = await client.query(`
    SELECT 
      userid,
      clusterid,
      username,
      uimage,
      ufirstname,
      ulastname,
      uemail,
      uphoneno,
      ucountry,
      uzipcode,
      uactivation,
      ustatus,
      ugender,
      utitle,
      usergroup
    FROM users
    WHERE usergroup = 'Customer'
    ORDER BY userid DESC
  `);
} else {
      result = await client.query(
        `
        SELECT 
          userid,
          clusterid,
          username,
          uimage,
          ufirstname,
          ulastname,
          uemail,
          uphoneno,
          ucountry,
          uzipcode,
          uactivation,
          ustatus,
          ugender,
          utitle,
          usergroup
        FROM users
        WHERE usergroup = 'Customer'
          AND clusterid = $1
        ORDER BY userid DESC
        `,
        [clusterid]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});

// Fetch list of owners
app.get('/users/owners', async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT 
        userid,
        clusterid,
        username,
        uimage,
        ufirstname,
        ulastname,
        uemail,
        uphoneno,
        ucountry,
        uzipcode,
        uactivation,
        ustatus,
        ugender,
        utitle,
        usergroup
      FROM users
      WHERE usergroup = 'Owner'
      ORDER BY userid DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching owners:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch list of moderators
app.get('/users/moderators', async (req, res) => {
  const { userid } = req.query;
  let client;

  if (!userid) {
    return res.status(400).json({ message: 'Missing userid parameter', success: false });
  }

  try {
    client = await pool.connect();

    const clusterResult = await client.query(
      `
      SELECT clusterid, usergroup
      FROM users
      WHERE userid = $1
      `,
      [userid]
    );

    if (clusterResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const clusterid = clusterResult.rows[0].clusterid;
    const usergroup = clusterResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await client.query(`
        SELECT 
          u.userid,
          u.clusterid,
          u.username,
          u.uimage,
          u.ufirstname,
          u.ulastname,
          u.uemail,
          u.uphoneno,
          u.ucountry,
          u.uzipcode,
          u.uactivation,
          u.ustatus,
          u.ugender,
          u.utitle,
          u.usergroup,
          c.clustername
        FROM users u
        LEFT JOIN clusters c ON u.clusterid = c.clusterid
        WHERE u.usergroup = 'Moderator'
        ORDER BY u.userid DESC
      `);
    } else {
      result = await client.query(
        `
        SELECT 
          u.userid,
          u.clusterid,
          u.username,
          u.uimage,
          u.ufirstname,
          u.ulastname,
          u.uemail,
          u.uphoneno,
          u.ucountry,
          u.uzipcode,
          u.uactivation,
          u.ustatus,
          u.ugender,
          u.utitle,
          u.usergroup,
          c.clustername
        FROM users u
        LEFT JOIN clusters c ON u.clusterid = c.clusterid
        WHERE u.usergroup = 'Moderator'
          AND u.clusterid = $1
        ORDER BY u.userid DESC
        `,
        [clusterid]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching moderators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});

// Fetch list of operators (Moderators and Administrators)
app.get('/users/operators', async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT 
        u.userid,
        u.clusterid,
        u.username,
        u.uimage,
        u.ufirstname,
        u.ulastname,
        u.uemail,
        u.uphoneno,
        u.usergroup,
        u.uactivation,
        u.ustatus,
        u.ugender,
        u.ucountry,
        u.uzipcode,
        u.utitle,
        c.clustername
      FROM users u
      LEFT JOIN clusters c ON u.clusterid = c.clusterid
      WHERE u.usergroup IN ('Moderator', 'Administrator')
      ORDER BY u.userid DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching operators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});

// Fetch list of administrators
app.get('/users/administrators', async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT 
        userid,
        clusterid,
        username,
        uimage,
        ufirstname,
        ulastname,
        uemail,
        uphoneno,
        ucountry,
        uzipcode,
        uactivation,
        ustatus,
        ugender,
        utitle,
        usergroup
      FROM users
      WHERE usergroup = 'Administrator'
      ORDER BY userid DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching administrators:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});
// Create moderators
app.post('/users/createModerator', async (req, res) => {
  const { firstName, lastName, username, password, email, phoneNo, country, zipCode, creatorid, creatorUsername } = req.body;
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  try {
    client = await pool.connect();

    // Check if the username or email already exists
    const checkUser = await client.query(
      `SELECT username, uemail FROM users WHERE username = $1 OR uemail = $2`,
      [username, email]
    );

    if (checkUser.rows.length > 0) {
      return res.status(409).json({ message: "Username or email already exists", success: false });
    }

   const defaultAvatar = null;
    // Encrypt the password
    const encryptedPassword = encrypt(password);

    const createModeratorResult = await client.query(
      `INSERT INTO users (ufirstname, ulastname, username, password, uemail, uphoneno, ucountry, uzipcode, utitle, usergroup, ustatus, uactivation, uimage, clusterid, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Mr.', 'Moderator', 'registered', 'Active', $9, '1', $10)
       RETURNING userid`,
      [firstName, lastName, username, encryptedPassword, email, phoneNo, country, zipCode, defaultAvatar, timestamp]
    );

    const entityid = createModeratorResult.rows[0].userid;

    const createModeratorAuditTrail = await client.query (
        `INSERT INTO audit_trail (
            entityid, timestamp, entitytype, actiontype, action, userid, username
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entityid, timestamp, "Users", "POST", "Create New Moderator", creatorid, creatorUsername
        ]
    );
    
    res.status(201).json({ message: "User registered successfully", success: true });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: "Server error", success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Update users by user ID
app.put('/users/updateUser/:userid', async (req, res) => {
  const { userid } = req.params;
  const { firstName, lastName, clusterid, username, email, phoneNo, country, zipCode, creatorid, creatorUsername } = req.body;
  
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  
  try {
    client = await pool.connect();

    const updateQuery = `
      UPDATE users
      SET ufirstname = $1, 
          ulastname = $2, 
          clusterid = $3,
          username = $4, 
          uemail = $5,
          uphoneno = $6,
          ucountry = $7,
          uzipcode = $8
      WHERE userid = $9
    `;

    const updateValues = [firstName, lastName, clusterid, username, email, phoneNo, country, zipCode, userid];

    await client.query(updateQuery, updateValues);

    await client.query(
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, "Users", "PUT", "Update User Info", creatorid, creatorUsername]
    );

    res.status(200).json({ message: 'User updated successfully' });

  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Remove users by user ID
app.delete('/users/removeUser/:userid', async (req, res) => {
  const { userid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  let client;

  try {
    client = await pool.connect();
    
    // Check if the user exists
    const userCheck = await client.query(
      'SELECT userid FROM users WHERE userid = $1',
      [userid]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    // Delete the user
    await client.query(
      'DELETE FROM users WHERE userid = $1',
      [userid]
    );

    await client.query(
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, "Users", "DELETE", "Delete User", creatorid, creatorUsername]
    );

    res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Suspend users by user ID
app.put('/users/suspenduser/:userid', async (req, res) => {
  const { userid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  let client;

  // Validate userid
  if (isNaN(userid)) {
    return res.status(400).json({ message: 'Invalid userid' });
  }

  try {
    client = await pool.connect();

    // Check if the user exists
    const userCheck = await client.query(
      `SELECT userid FROM users WHERE userid = $1`,
      [userid]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Suspend the user and set status to logout
    await client.query(
      `UPDATE users SET uactivation = 'Inactive' WHERE userid = $1`,
      [userid]
    );

    await client.query(
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, "Users", "PUT", "Suspend User", creatorid, creatorUsername]
    );

    res.status(200).json({ message: 'User suspended successfully' });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Activate users by userid
app.put('/users/activateUser/:userid', async (req, res) => {
  const { userid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  let client;

  // Validate userid
  if (isNaN(userid)) {
    return res.status(400).json({ message: 'Invalid userid' });
  }

  try {
    client = await pool.connect();

    // Check if the user exists
    const userCheck = await client.query(
      `SELECT userid FROM users WHERE userid = $1`,
      [userid]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Activate the user
    await client.query(
      `UPDATE users SET uactivation = 'Active' WHERE userid = $1`,
      [userid]
    );

    await client.query(
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, "Users", "PUT", "Activate User", creatorid, creatorUsername]
    );

    res.status(200).json({ message: 'User activated successfully' });
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

//Create property listing
app.post('/propertiesListing', upload.fields([
  { name: 'propertyImage', maxCount: 10 },
  { name: 'roomImages', maxCount: 30 }
]), async (req, res) => {
  const {
      username,
      propertyPrice, // This is the base price from frontend
      propertyAddress,
      clusterName,
      categoryName,
      propertyBedType,
      propertyGuestPaxNo,
      propertyDescription,
      nearbyLocation,
      facilities,
      weekendRate,
      specialEventRate,
      specialEventStartDate,
      specialEventEndDate,
      earlyBirdDiscountRate,
      lastMinuteDiscountRate,
      isSpecialEventEnabled,
      propertyDiscount
  } = req.body;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  const propertyImageFiles = req.files?.propertyImage || [];
const roomImageFiles = req.files?.roomImages || [];
  
  if (!propertyImageFiles || propertyImageFiles.length < 4) {
      return res.status(400).json({ error: 'Please upload at least 4 property images.' });
  }

  // ADD THE COMMISSION LOGIC HERE (Fail fast if invalid)
  let pricingData;
  try {
      // Pass the raw propertyPrice to our helper function
      pricingData = await calculatePriceWithCommission(propertyPrice);
  } catch (error) {
      return res.status(400).json({ error: error.message });
  }
  
  // This is the new value we will save to the database
  const finalPriceToSave = pricingData.finalPrice; 
  
  let client;
  try {
      client = await pool.connect();
      await client.query('BEGIN');
      // Fetch user ID and userGroup for property owner
      const userResult = await client.query(
          'SELECT userid, usergroup FROM users WHERE username = $1',
          [username]
      );
    
      if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }
    
      const { userid, usergroup } = userResult.rows[0];
      // Determine propertyStatus based on userGroup
      const propertyStatus = usergroup === 'Administrator' ? 'Available' : 'Pending';
      
      // RESIZING CODE:
  const imageUrls = await Promise.all(propertyImageFiles.map(async (file) => {
  try {
    const resizedImageBuffer = await sharp(file.buffer)
      .resize({
        width: 800,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    return await uploadBufferToFirebase(
      resizedImageBuffer,
      'property-images',
      file.originalname,
      'image/jpeg'
    );
  } catch (err) {
    console.error('Image processing/upload error:', err);
    throw err;
  }
}));

const concatenatedImages = imageUrls.join(',');
      
      // for instant payment discount rate
      const totalAmountDiscountRate = parseFloat(req.body.totalAmountDiscountRate || 1);
      const instantPaymentRateToSave = totalAmountDiscountRate < 1
        ? parseFloat((1 - totalAmountDiscountRate).toFixed(4))
        : 0;

      const rateResult = await client.query(
          `INSERT INTO rate (
              normalrate, 
              weekendrate,
              specialeventrate,
              earlybirddiscountrate,
              lastminutediscountrate,
              startdate,
              enddate,
              userid,
              timestamp,
              instantpaymentrate
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING rateid`,
          [
              finalPriceToSave,  
              weekendRate,
              specialEventRate,
              earlyBirdDiscountRate,
              lastMinuteDiscountRate,
              isSpecialEventEnabled ? specialEventStartDate : null, 
              isSpecialEventEnabled ? specialEventEndDate : null,   
              userid,
              timestamp,
              instantPaymentRateToSave
          ]
      );
          
      const rateID = rateResult.rows[0].rateid;
      let clusterID;
      const existingCluster = await client.query(
          'SELECT clusterid FROM clusters WHERE clustername = $1',
          [clusterName]
      );
      
      if (existingCluster.rows.length > 0) {
          clusterID = existingCluster.rows[0].clusterid;
      } else {
          const clusterResult = await client.query(
              `INSERT INTO clusters (clustername, clusterstate, clusterprovince)
               VALUES ($1, $2, $3)
               RETURNING clusterid`,
              [clusterName, "DefaultState", "DefaultProvince"]
          );
          clusterID = clusterResult.rows[0].clusterid;
      }
    
      let categoryID;
      const existingCategory = await client.query(
          'SELECT categoryid FROM categories WHERE categoryname = $1',
          [categoryName]
      );
    
      if (existingCategory.rows.length > 0) {
          categoryID = existingCategory.rows[0].categoryid;
      } else {
          const categoryResult = await client.query(
              `INSERT INTO categories (categoryname, availablestates)
               VALUES ($1, $2)
               RETURNING categoryid`,
              [categoryName, "DefaultStates"]
          );
          categoryID = categoryResult.rows[0].categoryid;
      }
    
// Inside app.post('/propertiesListing')
    // Inside app.post('/propertiesListing')
const propertyQuantity = req.body.quantity || 1;

let roomDetailsJSON = req.body.room_details || '[]';

roomDetailsJSON = await uploadRoomImagesAndReplaceRefs(
  roomDetailsJSON,
  roomImageFiles,
  req.body.roomImageMap
);

// Support days, hours, and minutes converted from frontend.
// Important: cannot use req.body.daysBeforePaying || 3,
// because 0 will wrongly become 3.
const daysBeforePayingValue = Number.isFinite(parseFloat(req.body.daysBeforePaying))
  ? parseFloat(req.body.daysBeforePaying)
  : 3;

const propertyListingResult = await client.query(
          `INSERT INTO properties (
              propertyno, userid, clusterid, categoryid, rateid,
              propertydescription, propertyaddress,
              propertybedtype, propertybedimage, propertyguestpaxno, propertyimage,
              propertystatus, nearbylocation, rating, facilities, policies, propertydiscount,
              quantity, room_details, daysbeforepaying, downpaymentrate
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING propertyid`,
          [
              "1", userid, clusterID, categoryID, rateID,
              propertyDescription, propertyAddress,
              propertyBedType, "1", propertyGuestPaxNo, concatenatedImages,
              propertyStatus, nearbyLocation, "0", facilities, "policies",
              propertyDiscount || 0,
              propertyQuantity, // Saves to the 'quantity' INT column
              roomDetailsJSON,   // Saves to the 'room_details' JSONB column
             daysBeforePayingValue, // Default to 3 days before paying
              req.body.downPaymentRate || 0.3    // Default to 0.3 (30%)
          ]
      );
      const propertyid = propertyListingResult.rows[0].propertyid;

      if (usergroup === "Administrator") {
        await client.query(
          `INSERT INTO audit_trail (
              entityid, timestamp, entitytype, actiontype, action, userid, username
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [propertyid, timestamp, "Properties", "POST", "Create New Property", userid, username]
        );
      }

      await client.query('COMMIT');
      clearProductCache();

      res.status(201).json({ message: 'Property created successfully', propertyid });
  } catch (err) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Error inserting property: ', err);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
      if (client) {
        client.release();
      }
  }
});

app.post('/admin/migrate-property-images-to-firebase', async (req, res) => {
  const secret = req.headers['x-migration-secret'];

  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden'
    });
  }

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(`
      SELECT propertyid, propertyimage, room_details
      FROM properties
      WHERE propertyimage IS NOT NULL
         OR room_details IS NOT NULL
      ORDER BY propertyid ASC
    `);

    let scannedProperties = 0;
    let updatedProperties = 0;
    let migratedPropertyImages = 0;
    let migratedRoomImages = 0;
    const errors = [];

    for (const property of result.rows) {
      scannedProperties++;

      let changed = false;

      /*
        1. Migrate main propertyimage
        Your database stores propertyimage as comma-separated values.
        Some old values are base64, new values are Firebase URLs.
      */
      const currentImages = property.propertyimage
        ? String(property.propertyimage)
            .split(',')
            .map((img) => img.trim())
            .filter(Boolean)
        : [];

      const updatedImages = [];

      for (let i = 0; i < currentImages.length; i++) {
        const img = currentImages[i];

        if (isBase64Image(img)) {
          try {
            const url = await migrateOneBase64ImageToFirebase(
              img,
              'property-images',
              `property-${property.propertyid}-${i + 1}`
            );

            updatedImages.push(url);
            migratedPropertyImages++;
            changed = true;
          } catch (err) {
            console.error(`Failed property image migration. Property ${property.propertyid}, image ${i + 1}:`, err.message);
            errors.push({
              propertyid: property.propertyid,
              type: 'propertyimage',
              imageIndex: i,
              error: err.message
            });

            // keep original if failed
            updatedImages.push(img);
          }
        } else {
          updatedImages.push(img);
        }
      }

      /*
        2. Migrate room_details images
        This walks through the JSON and replaces any base64 image string.
      */
      let updatedRoomDetails = property.room_details;

      const migrateRoomValue = async (value, path = 'room_details') => {
        if (Array.isArray(value)) {
          const arr = [];

          for (let i = 0; i < value.length; i++) {
            arr.push(await migrateRoomValue(value[i], `${path}[${i}]`));
          }

          return arr;
        }

        if (value && typeof value === 'object') {
          const obj = {};

          for (const key of Object.keys(value)) {
            obj[key] = await migrateRoomValue(value[key], `${path}.${key}`);
          }

          return obj;
        }

        if (typeof value === 'string' && isBase64Image(value)) {
          try {
            const url = await migrateOneBase64ImageToFirebase(
              value,
              'room-images',
              `property-${property.propertyid}-room-${Date.now()}`
            );

            migratedRoomImages++;
            changed = true;
            return url;
          } catch (err) {
            console.error(`Failed room image migration. Property ${property.propertyid}, ${path}:`, err.message);
            errors.push({
              propertyid: property.propertyid,
              type: 'room_details',
              path,
              error: err.message
            });

            return value;
          }
        }

        return value;
      };

      if (property.room_details) {
        try {
          const parsedRoomDetails =
            typeof property.room_details === 'string'
              ? JSON.parse(property.room_details || '[]')
              : property.room_details;

          updatedRoomDetails = await migrateRoomValue(parsedRoomDetails);
        } catch (err) {
          console.error(`Invalid room_details for property ${property.propertyid}:`, err.message);
          errors.push({
            propertyid: property.propertyid,
            type: 'room_details_parse',
            error: err.message
          });
        }
      }

      if (changed) {
        await client.query(
          `
          UPDATE properties
          SET propertyimage = $1,
              room_details = $2
          WHERE propertyid = $3
          `,
          [
            updatedImages.join(','),
            JSON.stringify(updatedRoomDetails || []),
            property.propertyid
          ]
        );

        updatedProperties++;
      }
    }

    clearProductCache();

    return res.status(200).json({
      success: true,
      message: 'Property image migration completed.',
      scannedProperties,
      updatedProperties,
      migratedPropertyImages,
      migratedRoomImages,
      errors
    });
  } catch (err) {
    console.error('Migration failed:', err);

    return res.status(500).json({
      success: false,
      message: 'Migration failed.',
      details: err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// Fetch list of all property listings (Product)
app.get('/product', async (req, res) => {
  let client;

try {
  const now = Date.now();

  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

  if (productCache.data && productCache.expiresAt > now) {
    res.set('X-Product-Cache', 'HIT');
    return res.status(200).json(productCache.data);
  }

    res.set('X-Product-Cache', 'MISS');

    client = await pool.connect();

    const query = `
      WITH review_stats AS (
        SELECT
          propertyid,
          ROUND(AVG(rating)::numeric, 2) AS live_rating,
          COUNT(*)::int AS live_ratingno
        FROM reviews
        WHERE is_deleted = false OR is_deleted IS NULL
        GROUP BY propertyid
      )
      SELECT
        p.propertyid,
        p.propertyaddress,
        p.nearbylocation,
        p.propertybedtype,
        p.propertyguestpaxno,
        p.propertyimage,
        p.propertystatus,
        p.facilities,
        p.quantity,
        p.propertydiscount,
        p.room_details,
        p.daysbeforepaying,
        p.downpaymentrate,

        r.normalrate,
        r.weekendrate,
        r.specialeventrate,
        r.earlybirddiscountrate,
        r.lastminutediscountrate,
        r.startdate,
        r.enddate,
        r.instantpaymentrate,

        c.categoryname,
        cl.clustername,

        u.username,
        u.uimage,

        COALESCE(rs.live_rating, 0)::float AS live_rating,
        COALESCE(rs.live_ratingno, 0)::int AS live_ratingno

      FROM properties p
      JOIN rate r ON p.rateid = r.rateid
      JOIN categories c ON p.categoryid = c.categoryid
      JOIN clusters cl ON p.clusterid = cl.clusterid
      JOIN users u ON p.userid = u.userid
      LEFT JOIN review_stats rs ON p.propertyid = rs.propertyid
      WHERE p.propertystatus = 'Available'
      ORDER BY p.propertyid DESC
    `;

    const result = await client.query(query);

 const slimRoomDetailsForProduct = (roomDetails) => {
  try {
    const rooms = typeof roomDetails === 'string'
      ? JSON.parse(roomDetails || '[]')
      : roomDetails || [];

    if (!Array.isArray(rooms)) return [];

    return rooms.map((room) => ({
      ...room,

      images: Array.isArray(room.images)
        ? room.images.slice(0, 1)
        : room.images,

      roomImages: Array.isArray(room.roomImages)
        ? room.roomImages.slice(0, 1)
        : room.roomImages,

      imageUrls: Array.isArray(room.imageUrls)
        ? room.imageUrls.slice(0, 1)
        : room.imageUrls,
    }));
  } catch {
    return [];
  }
};

const properties = result.rows.map((property) => ({
  ...property,

  // Product page only needs a few preview images.
  propertyimage: property.propertyimage
    ? property.propertyimage.split(',').filter(Boolean).slice(0, 3)
    : [],

  // Reduce room image payload for product listing.
  room_details: slimRoomDetailsForProduct(property.room_details),

  rating: Number(property.live_rating || 0),
  ratingno: Number(property.live_ratingno || 0),
}));

    const responseData = { properties };

    productCache = {
      data: responseData,
      expiresAt: Date.now() + PRODUCT_CACHE_TTL,
    };

    return res.status(200).json(responseData);

  } catch (err) {
    console.error('Error fetching properties: ', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch single property details with ALL images
app.get('/property/:propertyid', async (req, res) => {
  const { propertyid } = req.params;

  if (!propertyid || isNaN(propertyid)) {
    return res.status(400).json({ error: 'Invalid property ID' });
  }

  let client;

  try {
    client = await pool.connect();

    const query = `
      WITH review_stats AS (
        SELECT
          propertyid,
          ROUND(AVG(rating)::numeric, 2) AS live_rating,
          COUNT(*)::int AS live_ratingno
        FROM reviews
        WHERE is_deleted = false OR is_deleted IS NULL
        GROUP BY propertyid
      )
      SELECT
        p.propertyid,
        p.propertyaddress,
        p.nearbylocation,
        p.propertybedtype,
        p.propertyguestpaxno,
        p.propertydescription,
        p.propertyimage,
        p.propertystatus,
        p.facilities,
        p.quantity,
        p.propertydiscount,
        p.room_details,
       p.daysbeforepaying,
p.downpaymentrate,

        r.normalrate,
        r.weekendrate,
        r.specialeventrate,
        r.earlybirddiscountrate,
        r.lastminutediscountrate,
        r.startdate,
        r.enddate,
        r.instantpaymentrate,

        c.categoryname,
        cl.clustername,

        u.username,
        u.uimage,

        COALESCE(rs.live_rating, 0)::float AS live_rating,
        COALESCE(rs.live_ratingno, 0)::int AS live_ratingno

      FROM properties p
      JOIN rate r ON p.rateid = r.rateid
      JOIN categories c ON p.categoryid = c.categoryid
      JOIN clusters cl ON p.clusterid = cl.clusterid
      JOIN users u ON p.userid = u.userid
      LEFT JOIN review_stats rs ON p.propertyid = rs.propertyid
      WHERE p.propertyid = $1
      LIMIT 1
    `;

    const result = await client.query(query, [propertyid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];

    property.propertyimage = property.propertyimage
      ? property.propertyimage
          .split(',')
          .map((img) => img.trim())
          .filter(Boolean)
      : [];

    if (typeof property.room_details === 'string') {
      try {
        property.room_details = JSON.parse(property.room_details || '[]');
      } catch {
        property.room_details = [];
      }
    }

    property.rating = Number(property.live_rating || 0);
    property.ratingno = Number(property.live_ratingno || 0);

    return res.status(200).json({ property });

  } catch (err) {
    console.error('Error fetching single property details:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch list of all property listings (Dashboard)
app.get('/propertiesListingTable', async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  let client;
  try {
    client = await pool.connect();
    
    const userResult = await client.query(
      'SELECT userid, usergroup, clusterid FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userid = userResult.rows[0].userid;
    const usergroup = userResult.rows[0].usergroup;
    const userClusterid = userResult.rows[0].clusterid;

    let query;
    let params = [];

    if (usergroup === 'Moderator') {
      // Moderator can only see their own properties
      query = `
        SELECT 
          p.propertyid, 
          p.propertyaddress, 
          p.nearbylocation,
          p.propertybedtype, 
          p.propertyguestpaxno, 
          p.propertydescription, 
          p.propertystatus, 
          p.propertyimage,
          p.facilities,
          p.quantity,  
          p.propertydiscount,  
          p.room_details,   
          p.daysbeforepaying,
          p.downpaymentrate,    
          u.ufirstname, 
          u.ulastname,
          u.username,
          u.usergroup,
          r.*,
          cl.clustername,
          c.categoryname
        FROM properties p
        JOIN users u ON p.userid = u.userid
        JOIN rate r ON p.rateid = r.rateid
        JOIN clusters cl ON p.clusterid = cl.clusterid
        JOIN categories c ON p.categoryid = c.categoryid
        WHERE p.userid = $1
      `;
      params = [userid];
  } else if (usergroup === 'Administrator' && userClusterid) {
  // Administrator can only see properties in their own cluster
  query = `
    SELECT 
      p.propertyid, 
      p.propertyaddress, 
      p.nearbylocation,
      p.propertybedtype, 
      p.propertyguestpaxno, 
      p.propertydescription, 
      p.propertystatus, 
      p.propertyimage,
      p.facilities,
      p.quantity,       
      p.propertydiscount, 
      p.room_details, 
      p.daysbeforepaying,
      p.downpaymentrate,
      u.ufirstname, 
      u.ulastname,
      u.username,
      u.usergroup,
      r.*,
      cl.clustername,
      c.categoryname
    FROM properties p
    JOIN users u ON p.userid = u.userid
    JOIN rate r ON p.rateid = r.rateid
    JOIN clusters cl ON p.clusterid = cl.clusterid
    JOIN categories c ON p.categoryid = c.categoryid
    WHERE p.clusterid = $1
  `;
  params = [userClusterid];

} else if (usergroup === 'Owner') {
  // Owner can see all properties
  query = `
    SELECT 
      p.propertyid, 
      p.propertyaddress, 
      p.nearbylocation,
      p.propertybedtype, 
      p.propertyguestpaxno, 
      p.propertydescription, 
      p.propertystatus, 
      p.propertyimage,
      p.facilities,
      p.quantity,    
      p.propertydiscount, 
      p.room_details,
      p.daysbeforepaying,
      p.downpaymentrate,
      u.ufirstname, 
      u.ulastname,
      u.username,
      u.usergroup,
      r.*,
      cl.clustername,
      c.categoryname
    FROM properties p
    JOIN users u ON p.userid = u.userid
    JOIN rate r ON p.rateid = r.rateid
    JOIN clusters cl ON p.clusterid = cl.clusterid
    JOIN categories c ON p.categoryid = c.categoryid
  `;
  params = [];

} else {
      // Other user types or Administrator without cluster can see all properties
      query = `
        SELECT 
          p.propertyid, 
          p.propertyaddress, 
          p.nearbylocation,
          p.propertybedtype, 
          p.propertyguestpaxno, 
          p.propertydescription, 
          p.propertystatus, 
          p.propertyimage,
          p.facilities,
          p.quantity,    
          p.propertydiscount, 
          p.room_details, 
          p.daysbeforepaying,
          p.downpaymentrate,
          u.ufirstname, 
          u.ulastname,
          u.username,
          u.usergroup,
          r.*,
          cl.clustername,
          c.categoryname
        FROM properties p
        JOIN users u ON p.userid = u.userid
        JOIN rate r ON p.rateid = r.rateid
        JOIN clusters cl ON p.clusterid = cl.clusterid
        JOIN categories c ON p.categoryid = c.categoryid
      `; 
    }
    query += ` ORDER BY p.propertyid DESC`;
    const result = await client.query(query, params);

    const properties = result.rows.map(property => ({
      ...property,
      propertyimage: property.propertyimage ? property.propertyimage.split(',') : []
    }));

    res.status(200).json({ properties });
  } catch (err) {
    console.error('Error fetching properties: ', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (client) {
      client.release();
    }
  } 
});


// Update an existing property listing by property ID
app.put('/propertiesListing/:propertyid', upload.fields([
  { name: 'propertyImage', maxCount: 10 },
  { name: 'roomImages', maxCount: 30 }
]), async (req, res) => {
    const { propertyid } = req.params;
    const {
        propertyAddress, propertyPrice, propertyDescription, nearbyLocation,
        propertyBedType, propertyGuestPaxNo, clusterName, categoryName, facilities,
        username, weekendRate, specialEventRate, specialEventStartDate, specialEventEndDate,
        earlyBirdDiscountRate, lastMinuteDiscountRate,propertyDiscount, daysBeforePaying, downPaymentRate
    } = req.body;
    const { creatorid, creatorUsername } = req.query;
    const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
    const propertyImageFiles = req.files?.propertyImage || [];
const roomImageFiles = req.files?.roomImages || [];

    const removedImages = req.body.removedImages ? JSON.parse(req.body.removedImages) : [];

    // COMMISSION (Fail fast if invalid)
    let pricingData;
    try {
        // req.body.propertyPrice comes from the frontend as the pure BASE PRICE
        pricingData = await calculatePriceWithCommission(propertyPrice);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const finalPriceToSave = pricingData.finalPrice; 

    let client;
    try {
        client = await pool.connect();

        // First get the user's group
        const userResult = await client.query(
            'SELECT usergroup FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const usergroup = userResult.rows[0].usergroup;

        // Fetch the current status of the property
        const propertyResult = await client.query(
            'SELECT propertystatus, propertyimage, rateid, clusterid, categoryid, facilities FROM properties WHERE propertyid = $1',
            [propertyid]
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        let existingImages = propertyResult.rows[0].propertyimage
            ? propertyResult.rows[0].propertyimage.split(',')
            : [];

        // Filter out removed images
        existingImages = existingImages.filter(image => !removedImages.includes(image));

        // Add new uploaded images if any
   if (propertyImageFiles && propertyImageFiles.length > 0) {
  const newImageUrls = await Promise.all(propertyImageFiles.map(async (file) => {
    const resizedImageBuffer = await sharp(file.buffer)
      .resize({
        width: 800,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    return await uploadBufferToFirebase(
      resizedImageBuffer,
      'property-images',
      file.originalname,
      'image/jpeg'
    );
  }));

  existingImages = [...existingImages, ...newImageUrls];
}

        const concatenatedImages = existingImages.join(',');

        // Determine the new status
        let newStatus = propertyResult.rows[0].propertystatus;
      
        if (usergroup === "Moderator") {
            newStatus = "Pending";
        }

       const propertyQuantity = req.body.quantity || 1;

let roomDetailsJSON = req.body.room_details || '[]';

roomDetailsJSON = await uploadRoomImagesAndReplaceRefs(
  roomDetailsJSON,
  roomImageFiles,
  req.body.roomImageMap
);

        // Convert to Float to support fractional days (minutes/hours)
        const daysVal = parseFloat(req.body.daysBeforePaying) || 0;
        const downPayVal = parseFloat(req.body.downPaymentRate) || 0;

        await client.query(
            `UPDATE properties 
             SET propertydescription = $1, 
                 propertyaddress = $2, 
                 nearbylocation = $3, 
                 propertybedtype = $4, 
                 propertyguestpaxno = $5, 
                 propertyimage = $6,
                 facilities = $7,
                 propertystatus = $8,
                 propertydiscount = $9,
                 quantity = $10,
                 room_details = $11,
                 daysbeforepaying = $12,
                 downpaymentrate = $13
               WHERE propertyid = $14`,
            [
                propertyDescription,
                propertyAddress,
                nearbyLocation,
                propertyBedType,
                propertyGuestPaxNo,
                concatenatedImages,
                facilities,
                newStatus,
                propertyDiscount || 0,
                propertyQuantity,  // Saves to the 'quantity' INT column
                roomDetailsJSON,   // Saves to the 'room_details' JSONB column
                daysVal,
                downPayVal,
                propertyid
            ]
        );

        // for instant payment discount rate
        const totalAmountDiscountRate = parseFloat(req.body.totalAmountDiscountRate || 1);
        const instantPaymentRateToSave = totalAmountDiscountRate < 1
          ? parseFloat((1 - totalAmountDiscountRate).toFixed(4))
          : 0;

        // Update the rate details
        await client.query(
            `UPDATE rate 
             SET normalrate = $1,
                 weekendrate = $2,
                 specialeventrate = $3,
                 earlybirddiscountrate = $4,
                 lastminutediscountrate = $5,
                 startdate = $6,
                 enddate = $7,
                 instantpaymentrate = $8
             WHERE rateid = $9`,
            [
                finalPriceToSave,   
                weekendRate,
                specialEventRate,
                earlyBirdDiscountRate,
                lastMinuteDiscountRate,
                specialEventStartDate,
                specialEventEndDate,
                instantPaymentRateToSave,
                propertyResult.rows[0].rateid
            ]
        );
        
        await client.query(
            `UPDATE clusters 
             SET clustername = $1 
             WHERE clusterid = $2`,
            [clusterName, propertyResult.rows[0].clusterid]
        );

        await client.query(
            `UPDATE categories 
             SET categoryname = $1 
             WHERE categoryid = $2`,
            [categoryName, propertyResult.rows[0].categoryid]
        );

      await client.query(
        `INSERT INTO audit_trail (
            entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [propertyid, timestamp, "Properties", "PUT", "Update Property Info", creatorid, creatorUsername]
      );
      clearProductCache();

      res.status(200).json({ message: 'Property updated successfully' });
    } catch (err) {
        console.error('Error updating property:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } finally {
        if (client) {
            client.release(); 
        }
    }
});


// Fetch Commission Rate API
const getLatestCommissionRate = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT commission_rate
      FROM commission_settings
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      return res.json({
        commission_rate: parseFloat(result.rows[0].commission_rate)
      });
    }

    return res.json({ commission_rate: 0.07 });
  } catch (err) {
    console.error("Error fetching commission:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

app.get('/commission', getLatestCommissionRate);
app.get('/api/commission', getLatestCommissionRate);

// Update the Commission Rate (Owner Action) and Send Commission Update Emails To Admins and Moderators
const updateCommissionAndNotify = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { newRate, userid } = req.body;

    const rateDecimal = parseFloat(newRate);
    if (isNaN(rateDecimal) || rateDecimal < 0 || rateDecimal > 1) {
      return res.status(400).json({ error: 'Invalid commission rate' });
    }

    const commissionResult = await client.query(
      `INSERT INTO commission_settings (commission_rate, updated_by)
       VALUES ($1, $2)
       RETURNING commission_rate, updated_at`,
      [rateDecimal, userid || null]
    );

    const savedCommission = commissionResult.rows[0];
    const updatedRate = parseFloat(savedCommission.commission_rate);
    const effectiveFrom = savedCommission.updated_at;

    console.log('Commission updated:', savedCommission);

    const usersResult = await client.query(
      `SELECT 
          userid,
          ufirstname,
          ulastname,
          uemail,
          usergroup
       FROM users
       WHERE LOWER(usergroup) IN ('administrator', 'moderator')
         AND uemail IS NOT NULL
         AND TRIM(uemail) <> ''`
    );

    console.log('Users to notify:', usersResult.rows);

    if (usersResult.rows.length === 0) {
      console.log('No admins or moderators found to notify.');
      return res.status(200).json({
        message: 'Commission updated successfully, but no users found to notify.',
        newRate: updatedRate
      });
    }

    const formattedRate = `${(updatedRate * 100).toFixed(2)}%`;
    const malaysiaTime = new Date(new Date(effectiveFrom).getTime() + 8 * 60 * 60 * 1000);

    const formattedDate = malaysiaTime.toLocaleString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const row of usersResult.rows) {
      const fullName =
        [row.ufirstname, row.ulastname].filter(Boolean).join(' ') || 'User';

      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'CAMS System',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [
            {
              email: row.uemail,
              name: fullName,
            },
          ],
          subject: 'Commission Rate Update Notification',
          htmlContent: `
            <h1><b>Dear ${fullName},</b></h1>
            <hr/>
            <p>Please be informed that the platform commission rate has been updated.</p>

            <p><b>New Commission Rate:</b> ${formattedRate}</p>
            <p><b>Effective From:</b> ${formattedDate}</p>

            <p>Please take note of this change for future pricing and booking calculations.</p>
          `,
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Commission update email sent to ${row.uemail}`);
    }

    res.status(200).json({
      message: 'Commission updated successfully and notification emails sent',
      newRate: updatedRate,
    });

  } catch (err) {
    console.error('Commission update error:', err.response?.data || err.message);
    res.status(500).json({
      message: 'Failed to update commission and send emails',
      error: err.response?.data || err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

app.post('/commission', updateCommissionAndNotify);
app.post('/api/commission', updateCommissionAndNotify);

// Update Property Status API
app.patch("/updatePropertyStatus/:propertyid", async (req, res) => {
  const { propertyid } = req.params;
  const { propertyStatus } = req.body;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 

  if (!propertyStatus) {
    return res.status(400).json({ message: "Property status is required" });
  }

  let client;
  
  try {
    client = await pool.connect();

    // Update property status
    const result = await client.query(
      'UPDATE properties SET propertystatus = $1 WHERE propertyid = $2 RETURNING *',
      [propertyStatus, propertyid] 
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Get property owner + creator info
    const ownerResult = await client.query(
      `SELECT 
          p.propertyaddress,
          p.userid AS ownerid,
          u.ulastname,
          u.utitle,
          u.uemail,
          u.usergroup
       FROM properties p
       JOIN users u ON p.userid = u.userid
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    const creatorResult = await client.query(
      `SELECT userid, usergroup
       FROM users
       WHERE userid = $1`,
      [creatorid]
    );

    // Send email only if:
    // - property owner exists
    // - creator exists
    // - creator is Administrator
    // - creator is NOT the owner
    // - status is Available or Unavailable
    if (
      ownerResult.rows.length > 0 &&
      creatorResult.rows.length > 0
    ) {
      const owner = ownerResult.rows[0];
      const creator = creatorResult.rows[0];

      const isAdmin = creator.usergroup === 'Administrator';
      const isNotOwnProperty = String(owner.ownerid) !== String(creatorid);
      const shouldNotify =
        propertyStatus === 'Available' || propertyStatus === 'Unavailable';

      if (isAdmin && isNotOwnProperty && shouldNotify && owner.uemail) {
        const actionText =
          propertyStatus === 'Available' ? 'enabled' : 'disabled';

        const colorText =
          propertyStatus === 'Available' ? 'green' : 'red';

        axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: {
              name: process.env.BREVO_SENDER_NAME || 'CAMS System',
              email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
              {
                email: owner.uemail,
                name: `${owner.utitle || ''} ${owner.ulastname || ''}`.trim() || 'Owner',
              },
            ],
            subject: `Property ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Notification`,
            htmlContent: `
              <h1><b>Dear ${owner.utitle} ${owner.ulastname},</b></h1>
              <hr/>
              <p>Your property named <b>${owner.propertyaddress}</b> has been <span style="color: ${colorText}; font-weight: bold;">${actionText}</span> by the Administrator.</p>
              <p>Please kindly click the button below to check the property details.</p>
              <div style="margin: 10px 0;">
                <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
              </div>
            `,
          },
          {
            headers: {
              'api-key': process.env.BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        ).catch(err => {
          console.error("Background Email Error:", err.response?.data || err.message);
        });
      }
    }

    // Audit trail
    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
       [propertyid, timestamp, "Properties", "PATCH", "Update Property Status", creatorid, creatorUsername]
    );
clearProductCache();
    res.status(200).json({ message: "Property status updated successfully", property: result.rows[0] });
  } catch (error) {
    console.error("Error updating property status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (client) {
      client.release(); 
    }
  }
});

// Remove Properties Listing
// Remove Properties Listing - Soft Delete
app.delete('/removePropertiesListing/:propertyid', async (req, res) => {
  const { propertyid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const propertyCheck = await client.query(
      'SELECT propertyid, timestamp FROM properties WHERE propertyid = $1',
      [propertyid]
    );

    if (propertyCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Property not found',
        success: false
      });
    }

    // Optional: keep your 3-day lock
    const propertyCreatedAt = new Date(propertyCheck.rows[0].timestamp);
    const timeDifferenceMs = timestamp - propertyCreatedAt;
    const daysSinceCreation = timeDifferenceMs / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 3) {
      await client.query('ROLLBACK');

      const daysLeft = Math.ceil(3 - daysSinceCreation);
      return res.status(403).json({
        message: `New properties must remain listed for at least 3 days. Please try again in ${daysLeft} day(s).`,
        success: false
      });
    }

    // Soft delete instead of DELETE
    await client.query(
      `
      UPDATE properties
      SET propertystatus = 'Deleted'
      WHERE propertyid = $1
      `,
      [propertyid]
    );

    await client.query(
      `
      INSERT INTO audit_trail (
        entityid, timestamp, entitytype, actiontype, action, userid, username
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [propertyid, timestamp, 'Properties', 'DELETE', 'Delete Property', creatorid, creatorUsername]
    );

    await client.query('COMMIT');

    clearProductCache();

    res.status(200).json({
      message: 'Property deleted successfully',
      success: true
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');

    console.error('Error deleting property:', err);

    res.status(500).json({
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) client.release();
  }
});

// Check user status by userID
app.get('/checkStatus', async(req, res) => {
  const { userid } = req.query;
  let client;

  try {
    client = await pool.connect();
    
    const query = {
      text: 'SELECT userid, username, ustatus, uemail, ufirstname, ulastname FROM "users" WHERE "userid" = $1',
      values: [userid]
    };
    
    const result = await client.query(query);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      res.status(200).json({ 
        ustatus: user.ustatus,
        userInfo: user  
      });
    } else {
      console.log('User not found for ID:', userid);
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching user status:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send contact us email
app.post("/contact_us", async (req, res) => {
    const { name, email, message } = req.body;
    let client;
  
    try {
      client = await pool.connect(); 
  
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: process.env.BREVO_SENDER_NAME || 'CAMS System',
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [
            {
              email: process.env.BREVO_SENDER_EMAIL,
              name: 'Operator',
            },
          ],
          subject: `Message from ${name}`,
          htmlContent: `
            <h1>New Message from ${name}</h1>
            <hr/>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
            <br/>
            <p><strong>Email:</strong> ${email}</p>
          `,
          replyTo: {
            email: email,
            name: name,
          }
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      res.status(200).json({ message: "Email sent successfully" });

  } catch (error) {
    console.error("Error sending email:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to send email", error: error.response?.data || error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Booking Request Message To Administrator Or Moderator
app.post('/requestBooking/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000); 
  let client;

  try {
    client = await pool.connect();
    
    const result = await client.query(
      `SELECT 
        rc.rclastname, 
        rc.rctitle, 
        r.checkindatetime, 
        r.checkoutdatetime, 
        r.request, 
        r.totalprice, 
        p.propertyaddress,
        p.nearbylocation,
        u.uemail
      FROM reservation_customer_details rc 
      JOIN reservation r ON rc.rcid = r.rcid 
      JOIN properties p ON r.propertyid = p.propertyid 
      JOIN users u ON u.userid = p.userid 
      WHERE r.reservationid = $1`,
      [reservationid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation or user not found for this property' });
    }

    const { 
      rclastname: customerLastName, 
      rctitle: customerTitle, 
      checkindatetime: reservationcheckindatetime, 
      checkoutdatetime: reservationcheckoutdatetime, 
      request: reservationRequest = '-', 
      totalprice: reservationtotalprice, 
      propertyaddress: reservationProperty, 
      nearbylocation: reservationAddress,
      uemail: userEmail 
    } = result.rows[0];

    axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: userEmail,
            name: 'Property Owner',
          },
        ],
        subject: 'Booking Request',
        htmlContent: `
        <h1><b>Do You Accept This Booking By ${customerTitle} ${customerLastName}?</b></h1><hr/>
        <p><b>Check In Date:</b> ${reservationcheckindatetime}</p>
        <p><b>Check Out Date:</b> ${reservationcheckoutdatetime}</p>
        <p><b>Request:</b> ${reservationRequest}</p>
        <p><b>Property Name:</b> ${reservationProperty}</p>
        <p><b>Property Address:</b> ${reservationAddress}</p>
        <p><b>Total Price: <i>RM${reservationtotalprice}</i></b></p><br/>
        <p><b>Please kindly click the button below to make the decision in <b>12 hours</b> time frame.</b></p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error('Background Email Error:', err.response?.data || err.message);
    });

    await client.query(
      `INSERT INTO book_and_pay_log 
       (logtime, log, userid)
       VALUES ($1, $2, $3)`,
      [
        timestamp,
        `${creatorUsername} Send Booking Request (${reservationProperty})`,
        creatorid
      ]
    );

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Request Booking", creatorid, creatorUsername]
    );
    
    res.status(200).json({ message: 'Request Processed Successfully' })
  } catch (err) {
    console.error('Error processing request: ', err);
    res.status(500).json({ message: 'Failed to process request', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Booking Request Accepted Message To Customer
app.post('/accept_booking/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT 
        rc.rclastname, 
        rc.rcemail, 
        rc.rctitle, 
        r.checkindatetime, 
        r.checkoutdatetime, 
        r.reservationblocktime,
        r.totalprice,
        r.request,
        p.propertyid,
        p.propertyaddress,
        p.userid AS owner_userid
      FROM reservation_customer_details rc 
      JOIN reservation r ON rc.rcid = r.rcid 
      JOIN properties p ON r.propertyid = p.propertyid 
      WHERE r.reservationid = $1`,
      [reservationid]
    );

    if (result.rows.length === 0) {
      console.log('No matching reservation found.');
      return res.status(404).json({ message: 'Reservation customer or property not found' });
    }

    const data = result.rows[0];

    const {
      rclastname: customerLastName,
      rcemail: customerEmail,
      rctitle: customerTitle,
      checkindatetime: reservationCheckInDate,
      checkoutdatetime: reservationCheckOutDate,
      reservationblocktime: paymentDueDate,
      propertyaddress: reservationProperty,
      totalprice,
      propertyid,
      owner_userid,
      request
    } = data;

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: customerEmail,
            name: `${customerTitle || ''} ${customerLastName || ''}`.trim() || 'Customer',
          },
        ],
        subject: 'Booking Accepted',
        htmlContent: `
          <h1><b>Dear ${customerTitle} ${customerLastName},</b></h1><hr/>
          <p>Your booking for <b>${reservationProperty}</b> from <b>${reservationCheckInDate}</b> to <b>${reservationCheckOutDate}</b> has been <span style="color: green">accepted</span>.</p> 
          <p>Please kindly click the button below to make payment before <b>${paymentDueDate}</b> to secure your booking.</p>
          <div style="margin: 10px 0;">
            <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
          </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error("Background Email Failed:", err.response?.data || err.message);
    });

    await client.query(
      `INSERT INTO book_and_pay_log 
       (logtime, log, userid)
       VALUES ($1, $2, $3)`,
      [
        timestamp,
        `${creatorUsername} Accepted Booking Request (${reservationProperty})`,
        creatorid
      ]
    );

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Accept Booking", creatorid, creatorUsername]
    );

   
    const commRes = await client.query('SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1');
    const commRate = commRes.rows.length > 0 ? parseFloat(commRes.rows[0].commission_rate) : 0.07;
    
    const gross = parseFloat(totalprice || 0);
    const downpayment = parseFloat(data.downpaymentamount || 0);
const expectedBalance = Math.max(0, gross - downpayment);
    const commAmount = gross * commRate;
    const modEarning = gross - commAmount;

    let extractedRoomType = 'Standard';
    if (request) {
        const match = request.match(/Room Selected:\s*(.+)/i) || request.match(/Package:\s*(.+)/i);
        if (match) extractedRoomType = match[1].trim();
    }

    await insertLedgerEntry(client, {
        reservationid: reservationid,
        propertyid: propertyid, 
        propertyname: reservationProperty,
        roomtype: extractedRoomType, 
        moderator_userid: owner_userid, 
        moderator_username: creatorUsername, 
        customer_userid: null, 
        customer_name: `${customerTitle} ${customerLastName}`.trim(),
        activity_type: "Booking Accepted",
        stock_status: "Reserved",
        booking_status: "Partially Paid", // Or "Accepted", depending on your workflow
        gross_amount: gross,
        commission_rate: commRate,
        commission_amount: commAmount,
        moderator_earning: modEarning,
          credit: 0,
          debit: downpayment,
          expected_amount: expectedBalance,
        remarks: "Booking accepted, awaiting full payment"
    });
    // ========================================================
    
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Payment Reminder Emails To Customers
app.post('/send_payment_reminders', async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `
      SELECT 
        r.reservationid,
        rc.rclastname,
        rc.rcemail,
        rc.rctitle,
        r.checkindatetime,
        r.reservationblocktime,
        r.request,
        p.propertyaddress,

        (
          (r.reservationblocktime AT TIME ZONE 'Asia/Kuching')::date
          - (NOW() AT TIME ZONE 'Asia/Kuching')::date
        ) AS days_left

      FROM reservation r
      JOIN reservation_customer_details rc ON r.rcid = rc.rcid
      JOIN properties p ON r.propertyid = p.propertyid

      WHERE LOWER(TRIM(r.reservationstatus)) = 'partially paid'
        AND rc.rcemail IS NOT NULL
        AND TRIM(rc.rcemail) <> ''
        AND (r.reservationblocktime AT TIME ZONE 'Asia/Kuching')::date
            BETWEEN (NOW() AT TIME ZONE 'Asia/Kuching')::date + INTERVAL '1 day'
            AND (NOW() AT TIME ZONE 'Asia/Kuching')::date + INTERVAL '3 days'

      ORDER BY r.reservationblocktime ASC
      `
    );

    console.log('Payment reminder query rows:', result.rows);

    if (result.rows.length === 0) {
      console.log('No matching payment reminders found.');
      return res.status(200).json({
        message: 'No pending payment reminders found',
        sent: 0,
        failed: 0,
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const failedEmails = [];

    for (const row of result.rows) {
      const daysLeft = Number(row.days_left);

      // Only send reminders 3, 2, or 1 days before payment deadline
      if (![1, 2, 3].includes(daysLeft)) {
        console.log(
          `Skipping reservation ${row.reservationid}: days_left=${daysLeft}`
        );
        continue;
      }

      // Extract room type / package from reservation request
      let roomType = 'N/A';

      if (row.request) {
        const requestText = String(row.request);

        const roomMatch =
          requestText.match(/Room Selected:\s*([^\n\r]+)/i) ||
          requestText.match(/Package:\s*([^\n\r]+)/i);

        if (roomMatch && roomMatch[1]) {
          roomType = roomMatch[1].trim();
        }
      }

      try {
        await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: {
              name: process.env.BREVO_SENDER_NAME || 'CAMS System',
              email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
              {
                email: row.rcemail,
                name:
                  `${row.rctitle || ''} ${row.rclastname || ''}`.trim() ||
                  'Customer',
              },
            ],
            subject: `Payment Reminder – ${daysLeft} Day(s) Before Due Date`,
            htmlContent: `
              <h2 style="margin: 0 0 16px; color: #111827;">Payment Reminder</h2>

              <p style="font-size: 15px; color: #374151;">
                Dear ${row.rctitle || ''} ${row.rclastname || 'Customer'},
              </p>

              <p style="font-size: 15px; color: #374151;">
                This is a friendly reminder that your remaining payment for 
                <b>${row.propertyaddress || 'your booking'}</b> is due in 
                <b style="color: #9A6200;">${daysLeft} day(s)</b>.
              </p>

              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px 18px; border-radius: 8px; margin: 18px 0;">
                <p style="margin: 0 0 8px;"><b>Property Name:</b> ${row.propertyaddress || 'N/A'}</p>
                <p style="margin: 0 0 8px;"><b>Room Type:</b> ${roomType}</p>
                <p style="margin: 0 0 8px;"><b>Check-in:</b> ${
                  row.checkindatetime
                    ? new Date(row.checkindatetime).toLocaleDateString('en-MY')
                    : 'N/A'
                }</p>
                <p style="margin: 0;"><b>Payment Deadline:</b> ${
                  row.reservationblocktime
                    ? new Date(row.reservationblocktime).toLocaleString('en-MY')
                    : 'N/A'
                }</p>
              </div>

              <p style="font-size: 15px; color: #374151;">
                Please complete your payment before the deadline to secure your booking.
              </p>

              <p style="font-size: 15px; color: #374151;">
                If payment is not completed before the deadline, your booking may expire automatically.
              </p>

              <div style="margin: 18px 0;">
                <a href="https://sarawakadventures.com/login" 
                  style="background-color: black; color: white; padding: 10px 22px; font-weight: bold; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Login to Pay
                </a>
              </div>
            `,
          },
          {
            headers: {
              'api-key': process.env.BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        sentCount++;

        console.log(
          `Payment reminder sent: reservation ${row.reservationid}, ${daysLeft} day(s), ${row.rcemail}`
        );
      } catch (emailError) {
        failedCount++;

        const errorDetails = emailError.response?.data || emailError.message;

        console.error(
          `Payment reminder failed for reservation ${row.reservationid}:`,
          errorDetails
        );

        failedEmails.push({
          reservationid: row.reservationid,
          email: row.rcemail,
          error: errorDetails,
        });
      }
    }

    return res.status(200).json({
      message: 'Payment reminder job completed',
      sent: sentCount,
      failed: failedCount,
      failedEmails,
    });

  } catch (err) {
    console.error('Payment reminder error:', err.response?.data || err.message);

    return res.status(500).json({
      message: 'Failed to send payment reminders',
      error: err.response?.data || err.message,
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send New Room Suggestion To Customer
app.post('/suggestNewRoom/:propertyid/:reservationid', async (req, res) => {
  const { propertyid, reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query; 
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();
    
    const propertyResult = await client.query(
      `SELECT p.propertyaddress AS "suggestPropertyAddress",
              r.normalrate AS "suggestPropertyPrice",
              p.nearbylocation AS "suggestPropertyLocation",
              p.propertybedtype AS "suggestPropertyBedType",
              p.propertyguestpaxno AS "suggestPropertyGuestPaxNo"
       FROM properties p 
       JOIN rate r ON p.rateid = r.rateid
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Property not found for suggestion' });
    }

    const property = propertyResult.rows[0];

    const customerReservationResult = await client.query(
      `SELECT rc.rclastname AS "customerLastName",
              rc.rcemail AS "customerEmail",
              rc.rctitle AS "customerTitle",
              p.propertyaddress AS "reservationProperty",
              r.checkindatetime AS "reservationCheckInDate",
              r.checkoutdatetime AS "reservationCheckOutDate",
              r.userid AS "customerID"
       FROM reservation r
       JOIN properties p ON p.propertyid = r.propertyid
       JOIN reservation_customer_details rc ON rc.rcid = r.rcid
       WHERE r.reservationid = $1`,
      [reservationid]
    );

    if (customerReservationResult.rows.length === 0) {
      return res.status(404).json({ message: 'User email not found for suggestion' });
    }

    const {
      customerLastName,
      customerEmail,
      customerTitle,
      reservationProperty,
      reservationCheckInDate,
      reservationCheckOutDate,
      customerID
    } = customerReservationResult.rows[0];

    const customerEmailResult = await client.query(
      `SELECT u.uemail FROM users u JOIN reservation r ON u.userid = r.userid WHERE u.userid = $1`,
      [customerID]
    );

    const actualCustomerEmail = customerEmailResult.rows[0].uemail;

    // Ensure reservationstatus is correctly updated to 'Suggested'
    const updateSuggestedEmailResult = await client.query(
      `UPDATE reservation
       SET propertyid = $1, suggestedemail = $2, reservationstatus = 'Suggested'
       WHERE reservationid = $3
      `,
      [propertyid, actualCustomerEmail, reservationid]
    );

    axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: actualCustomerEmail,
            name: `${customerTitle || ''} ${customerLastName || ''}`.trim() || 'Customer',
          },
        ],
        subject: 'Booking Request Rejected & New Room Suggestion',
        htmlContent: `
        <h1><b>Dear ${customerTitle} ${customerLastName},</b></h1><hr/>
        <p>Your booking for <b>${reservationProperty}</b> from <b>${reservationCheckInDate}</b> to <b>${reservationCheckOutDate}</b> has been <span style="color: red">rejected</span> due to room unavailability during the selected time.</p> 
        <p>A similar room with the details below is suggested for your consideration:</p> 
        <h3>Property Name: ${property.suggestPropertyAddress}</h3>
        <p><b>Property Location:</b> ${property.suggestPropertyLocation}</p>
        <p><b>Bed Number:</b> ${property.suggestPropertyBedType}</p>
        <p><b>Pax Number:</b> ${property.suggestPropertyGuestPaxNo}</p>
        <p><b>Price: <i>RM${property.suggestPropertyPrice}</i></b></p><br/>
        <p>Please kindly make your decision by clicking the buttons below to login</p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error("Background Email Failed:", err.response?.data || err.message);
    });

    await client.query(
      `INSERT INTO book_and_pay_log (logtime, log, userid) VALUES ($1, $2, $3)`,
      [timestamp, `Suggested new room (${property.suggestPropertyAddress})`, creatorid]
    );

    await client.query('COMMIT');

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Suggest Alternative Room", creatorid, creatorUsername]
    );
    
    res.status(200).json({ message: 'Email Sent Successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Properties Listing Request Notification From Moderator
app.post('/propertyListingRequest/:propertyid', async (req, res) => {
  const { propertyid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(); // Use standard JS Date
  let client;

  try {
    client = await pool.connect();
    
    // Get Property & Moderator Info
    const moderatorResult = await client.query(
      `SELECT p.propertyaddress, u.ulastname, u.utitle, u.usergroup 
       FROM properties p 
       JOIN users u ON u.userid = p.userid 
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (moderatorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Property or moderator not found' });
    } 

    // If user is NOT a moderator, they don't need approval. Return success immediately.
    if (moderatorResult.rows[0].usergroup !== 'Moderator') {
      return res.status(200).json({ message: 'Property Created Successfully' });
    }

    const { propertyaddress: property, ulastname: moderatorLastName, utitle: moderatorTitle } = moderatorResult.rows[0];

    // Get All Administrator Emails
    const administratorResult = await client.query(
      `SELECT uemail FROM users WHERE usergroup = 'Administrator'`
    );

    // If no admins exist, we can't send email, but we still return success
    if (administratorResult.rows.length === 0) {
      return res.status(200).json({ message: 'Property created (No admins found to notify)' });
    }

    const adminEmails = administratorResult.rows.map(record => record.uemail);

    axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: adminEmails.map(email => ({ email })),
        subject: 'Property Listing Request',
        htmlContent: `
        <h1><b>Dear Administrators,</b></h1><hr/>
        <p>Moderator ${moderatorTitle} ${moderatorLastName} would like to request listing a new property with the name of <b>${property}</b> into the "Hello Sarawak" app.</p>
        <p>Please kindly click the button below to view more details and make the decision in <b>12 hours</b> time frame.</p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error("Background Email Error:", err.response?.data || err.message); 
    });

    // Log Audit Trail
    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [propertyid, timestamp, "Properties", "POST", "Request Property Listing", creatorid, creatorUsername]
    );
    
    // Respond Immediately (User sees this instantly)
    res.status(200).json({ message: 'Request Sent Successfully' });

  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Property Listing Request Accepted Notification
app.post("/propertyListingAccept/:propertyid", async (req, res) => {
  const { propertyid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(); // Just use the server's standard current time
  let client;

  try {
    client = await pool.connect();
    
    // Get the details first
    const result = await client.query(
      `SELECT p.propertyaddress, u.ulastname, u.uemail, u.utitle 
       FROM properties p  
       JOIN users u ON u.userid = p.userid 
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property or user not found" });
    }

    const { propertyaddress: property, ulastname: moderatorLastName, uemail: moderatorEmail, utitle: moderatorTitle } = result.rows[0];

    // UPDATE DATABASE IMMEDIATELY (This makes the change "real")
    await client.query(
      `UPDATE properties SET propertystatus = 'Available' WHERE propertyid = $1`,
      [propertyid]
    );

    // SEND EMAIL IN BACKGROUND (Brevo)
    axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: moderatorEmail,
            name: `${moderatorTitle || ''} ${moderatorLastName || ''}`.trim() || 'Moderator',
          },
        ],
        subject: "Property Listing Request Accepted",
        htmlContent: `
        <h1><b>Dear ${moderatorTitle} ${moderatorLastName},</b></h1><hr/>
        <p>Your request for property listing of property named <b>${property}</b> has been <span style="color: green">accepted</span> by the Administrator.</p>
        <p>Please kindly click the button below to check the details of the listed property.</p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error("Background Email Failed:", err.response?.data || err.message);
    });

    // LOG AUDIT TRAIL
    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [propertyid, timestamp, "Properties", "POST", "Accept Property Listing", creatorid, creatorUsername]
    );
    clearProductCache();

    // SEND SUCCESS RESPONSE IMMEDIATELY
    res.status(200).json({ message: "Property Accepted Successfully" });

  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ message: "Failed to process request", error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Property Listing Request Rejected Notification
app.post("/propertyListingReject/:propertyid", async (req, res) => {
  const { propertyid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

 try {
    client = await pool.connect();
    
    // Get details
    const result = await client.query(
      `SELECT p.propertyaddress, u.ulastname, u.uemail, u.utitle 
       FROM properties p  
       JOIN users u ON u.userid = p.userid 
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property or user not found" });
    }

    const { propertyaddress: property, ulastname: moderatorLastName, uemail: moderatorEmail, utitle: moderatorTitle } = result.rows[0];

    // UPDATE DATABASE IMMEDIATELY
    await client.query(
      `UPDATE properties SET propertystatus = 'Rejected' WHERE propertyid = $1`,
      [propertyid]
    );
    
    // SEND EMAIL IN BACKGROUND (Brevo)
    axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: moderatorEmail,
            name: `${moderatorTitle || ''} ${moderatorLastName || ''}`.trim() || 'Moderator',
          },
        ],
        subject: "Property Listing Request Rejected",
        htmlContent: `
        <h1><b>Dear ${moderatorTitle} ${moderatorLastName},</b></h1><hr/>
        <p>Your request for property listing of property named <b>${property}</b> has been <span style="color: red">rejected</span> by the Administrator due to violation of policy.</p>
        <p>Please kindly click the button below to list the property again with appropriate information in <b>12 hours</b> time frame.</p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      console.error("Background Email Failed:", err.response?.data || err.message);
    });

    // LOG AUDIT TRAIL
    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [propertyid, timestamp, "Properties", "POST", "Reject Property Listing", creatorid, creatorUsername]
    );
    clearProductCache();

    // SEND SUCCESS RESPONSE IMMEDIATELY
    res.status(200).json({ message: "Property Rejected Successfully" });

  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ message: "Failed to process request", error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send "Suggest" Notification To Operators
app.post('/sendSuggestNotification/:reservationid', async (req, res) => {
  const { userids } = req.body;
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  if (!userids || userids.length === 0) {
    return res.status(400).json({ message: 'User IDs are required' });
  }

  try {
    client = await pool.connect();
    
    // Fetch user emails
    const userResult = await client.query(
      `SELECT uemail FROM users WHERE userid = ANY($1::int[])`,
      [userids]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    const selectedEmails = userResult.rows.map(record => record.uemail);
    const emailString = selectedEmails.join(',');

    const insertSuggestedEmails = await client.query(
      `UPDATE reservation
       SET suggestedemail = $1
       WHERE reservationid = $2
       `,
       [emailString, reservationid]
    );

    // Fetch reservation and customer details
    const reservationResult = await client.query(
      `SELECT 
        p.propertyaddress AS "reservationProperty", 
        r.checkindatetime AS "reservationCheckInDate", 
        r.checkoutdatetime AS "reservationCheckOutDate", 
        rc.rclastname AS "customerLastName", 
        rc.rctitle AS "customerTitle"
      FROM properties p
      JOIN reservation r ON p.propertyid = r.propertyid
      JOIN reservation_customer_details rc ON rc.rcid = r.rcid
      WHERE r.reservationid = $1`,
      [reservationid]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ message: 'No reservation or customer found' });
    }

    const { 
      reservationProperty, 
      reservationCheckInDate, 
      reservationCheckOutDate, 
      customerLastName, 
      customerTitle 
    } = reservationResult.rows[0];

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: selectedEmails.map(email => ({ email })),
        subject: 'Suggestion Available',
        htmlContent: `
        <h1><b>Dear Operators,</b></h1><hr/>
        <p>Reservation of customer <b>${customerTitle} ${customerLastName}</b> is now open for suggestion with the following details:</p>
        <p><b>Property Name:</b> ${reservationProperty}</p>
        <p><b>Check In Date:</b> ${reservationCheckInDate}</p>
        <p><b>Check Out Date:</b> ${reservationCheckOutDate}</p>
        <br/>
        <p>Please kindly click the button below to pick up the "Suggest" opportunity on a first-come, first-served basis.</p>
        <p>You may <b>ignore</b> this message if <b>not interested</b>.</p>
        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login" style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; margin-right: 10px;">Login</a>
        </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    await client.query(
      `INSERT INTO book_and_pay_log 
       (logtime, log, userid)
       VALUES ($1, $2, $3)`,
      [
        timestamp,
        `${creatorUsername} Send Suggest Notification`,
        creatorid
      ]
    );

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Send Suggest Notification", creatorid, creatorUsername]
    );
    
    res.status(200).json({ message: 'Email Sent Successfully' });

  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Send Reservation Picked Up Notification To Original Reservation Owner
app.post('/sendPickedUpNotification/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const { userids } = req.body; 
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  if (!userids || userids.length === 0) {
    return res.status(400).json({ message: 'User IDs are required' });
  }

  try {
    client = await pool.connect();
    
    // Fetch user emails
    const reservationOwnerResult = await client.query(
      `SELECT u.username AS "reservationOwnerUsername", 
              u.uemail AS "reservationOwnerEmail", 
              u.utitle AS "reservationOwnerTitle"
       FROM users u 
       JOIN properties p ON u.userid = p.userid
       JOIN reservation r ON p.propertyid = r.propertyid
       WHERE r.reservationid = $1
       `,
      [reservationid]
    );

    if (reservationOwnerResult.rows.length === 0) {
      return res.status(404).json({ message: 'No uEmail found' });
    }

    const { reservationOwnerUsername, reservationOwnerEmail, reservationOwnerTitle } = reservationOwnerResult.rows[0];

    // Fetch reservation and customer details
    const reservationResult = await client.query(
      `SELECT 
        p.propertyaddress AS "reservationProperty", 
        r.checkindatetime AS "reservationCheckInDate", 
        r.checkoutdatetime AS "reservationCheckOutDate", 
        rc.rclastname AS "customerLastName", 
        rc.rctitle AS "customerTitle"
      FROM properties p
      JOIN reservation r ON p.propertyid = r.propertyid
      JOIN reservation_customer_details rc ON rc.rcid = r.rcid
      WHERE r.reservationid = $1`,
      [reservationid]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ message: 'No reservation or customer found' });
    }

    const { 
      reservationProperty, 
      reservationCheckInDate, 
      reservationCheckOutDate, 
      customerLastName, 
      customerTitle 
    } = reservationResult.rows[0];

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: reservationOwnerEmail,
            name: `${reservationOwnerTitle || ''} ${reservationOwnerUsername || ''}`.trim() || 'Owner',
          },
        ],
        subject: `Reservation Picked Up`,
        htmlContent: `
        <h1><b>Dear ${reservationOwnerTitle} ${reservationOwnerUsername},</b></h1><hr/>
        <p>Reservation of customer <b>${customerTitle} ${customerLastName}</b> with the following details is picked up by <b>${creatorUsername}</b>:</p>
        <p><b>Property Name:</b> ${reservationProperty}</p>
        <p><b>Check In Date:</b> ${reservationCheckInDate}</p>
        <p><b>Check Out Date:</b> ${reservationCheckOutDate}</p>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    await client.query(
      `INSERT INTO book_and_pay_log 
       (logtime, log, userid)
       VALUES ($1, $2, $3)`,
      [
        timestamp,
        `${reservationProperty} Reservation Picked Up By ${creatorUsername}`,
        creatorid
      ]
    );

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Reservation Picked Up", creatorid, creatorUsername]
    );
    
    res.status(200).json({ message: 'Email Sent Successfully' });

  } catch (err) {
    console.error('Error sending email: ', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Send Suggested Room Rejected Message To Operators
app.post('/reject_suggested_room/:propertyid/', async (req, res) => {
  const { propertyid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    // Fetch property details for suggestion
    client = await pool.connect();
    
    const propertyResult = await client.query(
      `SELECT p.propertyaddress AS "suggestPropertyAddress",
              r.normalrate AS "suggestPropertyPrice",
              p.nearbylocation AS "suggestPropertyLocation",
              p.propertybedtype AS "suggestPropertyBedType",
              p.propertyguestpaxno AS "suggestPropertyGuestPaxNo",
              u.uemail AS "operatorEmail",
              u.username AS "operatorUsername",
              u.utitle AS "operatorTitle"
       FROM properties p 
       JOIN rate r ON p.rateid = r.rateid
       JOIN users u ON p.userid = u.userid
       WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: property.operatorEmail,
            name: `${property.operatorTitle || ''} ${property.operatorUsername || ''}`.trim() || 'Operator',
          },
        ],
        subject: 'Suggested Room Rejected',
        htmlContent: `
        <h1><b>Dear ${property.operatorTitle} ${property.operatorUsername},</b></h1><hr/>
        <p>Your suggested room <b>${property.suggestPropertyAddress}</b> has been <span style="color: red">Rejected</span>.</p> 
        <p>All Actions For This Reservation Will Be <b>Terminated</b>.</p>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    await client.query(
      `INSERT INTO book_and_pay_log 
       (logtime, log, userid)
       VALUES ($1, $2, $3)`,
      [
        timestamp,
        `Rejected Suggested Room (${property.suggestPropertyAddress})`,
        creatorid
      ]
    );

    await client.query('COMMIT');

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [propertyid, timestamp, "Properties", "POST", "Rejected Suggested Room", creatorid, creatorUsername]
    );
    
    res.status(200).json({ message: 'Email Sent Successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Create reservation for property
app.post('/reservation/:userid', async (req, res) => {
const { 
    propertyid, checkindatetime, checkoutdatetime, reservationstatus, 
    request, totalprice, rcfirstname, rclastname, rcemail, rcphoneno, 
    rctitle, reservationblocktime, downpaymentamount,
    paymenttype
} = req.body;
  
  const userid = req.params.userid;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  if (!userid) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    client = await pool.connect();
    await client.query('BEGIN'); // EXPLICITLY START TRANSACTION

// --- STRICT ROOM-LEVEL BLACKOUT CHECK ---
const extractSelectedRoomName = (requestText = '') => {
  const text = String(requestText || '');

  const roomMatch = text.match(/Room Selected:\s*([^\n\r(]+)/i);
  if (roomMatch && roomMatch[1]) {
    return roomMatch[1].trim();
  }

  const packageMatch = text.match(/Package:\s*([^\n\r]+)/i);
  if (packageMatch && packageMatch[1]) {
    return packageMatch[1].trim();
  }

  return '';
};

const normalizeRoomName = (value = '') => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

const selectedRoomName = extractSelectedRoomName(request);
const normalizedSelectedRoomName = normalizeRoomName(selectedRoomName);

const blackoutCheck = await client.query(
  `
  SELECT id, room_name, start_date, end_date
  FROM blackout_dates
  WHERE propertyid = $1
    AND is_active = TRUE
AND NOT (end_date < $2::date OR start_date >= $3::date)
    AND (
      room_name IS NULL
OR TRIM(room_name) = ''
OR regexp_replace(LOWER(TRIM(room_name)), '\\s+', ' ', 'g') IN ('all rooms', 'all room')
OR regexp_replace(LOWER(TRIM(room_name)), '\\s+', ' ', 'g') = $4
    )
  LIMIT 1
  `,
  [
    propertyid,
    checkindatetime,
    checkoutdatetime,
    normalizedSelectedRoomName
  ]
);

if (blackoutCheck.rows.length > 0) {
  await client.query('ROLLBACK');

  return res.status(409).json({
    error: selectedRoomName
      ? `${selectedRoomName} is unavailable for the selected dates. Please choose another room or date range.`
      : 'These dates are currently unavailable due to a blackout period.'
  });
}

    // Calculate reservationblocktime from property's daysbeforepaying
 const propDaysRes = await client.query(
  'SELECT daysbeforepaying FROM properties WHERE propertyid = $1',
  [propertyid]
);

const rawDaysBeforePaying = propDaysRes.rows[0]?.daysbeforepaying;

// Use parseFloat so decimal values like 0.5 or 0.02 can work.
let daysBeforePaying = parseFloat(rawDaysBeforePaying);

if (!Number.isFinite(daysBeforePaying) || daysBeforePaying < 0) {
  daysBeforePaying = 3;
}

const buildMalaysiaCheckInDate = (value) => {
  const raw = String(value || '').trim();

  if (!raw) return new Date('invalid');

  // If frontend sends only date: 2026-05-06
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00+08:00`);
  }

  // If frontend already sends date + time
  return new Date(raw);
};

const selectedCheckInDate = buildMalaysiaCheckInDate(checkindatetime);

if (Number.isNaN(selectedCheckInDate.getTime())) {
  await client.query('ROLLBACK');

  return res.status(400).json({
    message: 'Invalid check-in date.',
    success: false
  });
}

const calculatedBlockTimeDate = new Date(
  selectedCheckInDate.getTime() - daysBeforePaying * 24 * 60 * 60 * 1000
);

// Malaysia current time
const malaysiaNow = new Date();

// If the deadline is already passed, do not create the reservation.
// This prevents creating a booking that immediately becomes Expired.
const isInstantPayReservation =
  String(paymenttype || '').toLowerCase() === 'instant';

if (!isInstantPayReservation && malaysiaNow > calculatedBlockTimeDate) {
  await client.query('ROLLBACK');

  return res.status(409).json({
    message: `Booking cannot proceed because the selected check-in date is too close. Please choose a later check-in date.`,
    success: false,
    bookingDeadline: calculatedBlockTimeDate.toISOString()
  });
}
// Save full datetime, not only YYYY-MM-DD
const pad = (n) => String(n).padStart(2, '0');

const formatTimestampForPostgres = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

// Save Malaysia/local datetime without UTC timezone shift
const calculatedBlockTime = formatTimestampForPostgres(calculatedBlockTimeDate);
    const customerResult = await client.query(
      `INSERT INTO reservation_customer_details 
       (rcfirstname, rclastname, rcemail, rcphoneno, rctitle)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING rcid`,
      [rcfirstname, rclastname, rcemail, rcphoneno, rctitle]
    );

    const rcid = customerResult.rows[0].rcid;
    const reservationDateTime = new Date(Date.now() + 8 * 60 * 60 * 1000); 

    // SAFE PARSING PREVENTS NaN DATABASE CRASHES
    const safeTotalPrice = parseFloat(totalprice) || 0;
    const safeDownPayment = parseFloat(downpaymentamount) || 0;

    const reservationResult = await client.query(
      `INSERT INTO reservation 
       (propertyid, checkindatetime, checkoutdatetime, 
        reservationblocktime, request, totalprice, downpaymentamount, rcid, 
        reservationstatus, userid, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING reservationid`,
      [
        propertyid,
        checkindatetime,
        checkoutdatetime,
        calculatedBlockTime,
        request,
        Number(safeTotalPrice.toFixed(2)),
        Number(safeDownPayment.toFixed(2)), 
        rcid,
        reservationstatus,
        userid
      ]
    );

    const reservationid = reservationResult.rows[0].reservationid;

    const userResult = await client.query('SELECT username FROM users WHERE userid = $1', [userid]);
    const username = userResult.rows.length > 0 ? userResult.rows[0].username : userid;


    // Prevents Postgres "NOT NULL" constraint crashes on the audit_trail table
    const activeUserId = creatorid || userid;
    const activeUserName = creatorUsername || username;

    await client.query (
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reservationid, timestamp, "Reservation", "POST", "Create Reservation", activeUserId, activeUserName]
    );

    await client.query('COMMIT'); // COMMIT SUCCESSFUL TRANSACTION

    res.status(201).json({ 
       message: 'Reservation created successfully', 
      reservationid 
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK'); // UNDO EVERYTHING ON CRASH
    }
    console.error('Error inserting reservation data:', err);
    res.status(500).json({ 
      message: 'Internal Server Error', 
      details: err.message 
    }); 
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch Book and Pay Log
app.get('/users/booklog', async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

    res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );

  res.set(
    'Pragma',
    'no-cache'
  );

  res.set(
    'Expires',
    '0'
  );

  let client;

  try {
    client = await pool.connect();

    const ownerResult = await client.query(
      `SELECT usergroup, username
       FROM users
       WHERE userid = $1`,
      [userid]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(200).json([]);
    }

    const usergroup = ownerResult.rows[0].usergroup;

    let result;
    let formattedRows;

    // Allow Administrator to see ALL logs
    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await client.query(`
SELECT 
    b.userid, 
    u.username, 
    b.logtime AS timestamp, 
    b.log AS action
FROM book_and_pay_log b
JOIN users u ON b.userid = u.userid
ORDER BY b.logtime DESC;
      `);

      // Format timestamps to remove T and milliseconds with Z
      formattedRows = result.rows.map(row => {
        if (row.timestamp) {
          const date = new Date(row.timestamp);
          row.timestamp = date.toLocaleString('en-GB', { 
            timeZone: 'Asia/Kuching',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          }).replace(',', ''); 
        }
        return row;
      });
    } else {
      const userClusterResult = await client.query(
        `SELECT clusterid FROM users WHERE userid = $1`,
        [userid]
      );

      if (userClusterResult.rows.length === 0) {
        return res.status(200).json([]); 
      }

      const userClusterid = userClusterResult.rows[0].clusterid;

result = await client.query(`
  SELECT DISTINCT
      b.userid, 
      u.username, 
      b.logtime AS timestamp, 
      b.log AS action
  FROM book_and_pay_log b
  JOIN users u ON b.userid = u.userid
  JOIN reservation r 
    ON r.reservationid = NULLIF(
      substring(b.log FROM 'reservation #([0-9]+)'),
      ''
    )::int
  JOIN properties p 
    ON p.propertyid = r.propertyid
  WHERE p.userid = $1
  ORDER BY b.logtime DESC;
`, [userid]);

      formattedRows = result.rows.map(row => {
        if (row.timestamp) {
          const date = new Date(row.timestamp);
          row.timestamp = date.toISOString().replace('T', ' ').split('.')[0];
        }
        return row;
      });
    }

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Error fetching Book Log:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.get("/users/finance", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(checkindatetime, 'YYYY-MM') AS month,
          SUM(totalprice) AS monthlyrevenue,
          COUNT(reservationid) AS monthlyreservations
        FROM reservation
        WHERE reservationstatus = 'Paid'
        GROUP BY TO_CHAR(checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
      );
    } else if (usergroup === 'Moderator') { 
        const clusterResult = await pool.query(
          `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
          [userid]
        );
    
        if (clusterResult.rows.length === 0) {
          return res.status(200).json({ monthlyData: [] }); // Return empty instead of 404
        }
    
        const clusterids = clusterResult.rows.map(row => row.clusterid);
    
        result = await pool.query(
          `
          SELECT 
            TO_CHAR(checkindatetime, 'YYYY-MM') AS month,
            SUM(totalprice) AS monthlyrevenue,
            COUNT(reservationid) AS monthlyreservations
          FROM reservation
          WHERE reservationstatus = 'Paid'
            AND propertyid IN (
              SELECT propertyid FROM properties 
              WHERE clusterid = ANY($1)
              AND userid = $2
            )
          GROUP BY TO_CHAR(checkindatetime, 'YYYY-MM')
          ORDER BY month;
          `,
          [clusterids, userid]
        ); 
    } else {
       const clusterResult = await pool.query(
          `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
          [userid]
        );
    
        if (clusterResult.rows.length === 0) {
          return res.status(200).json({ monthlyData: [] }); // Return empty instead of 404
        }
    
        const clusterids = clusterResult.rows.map(row => row.clusterid);
    
        result = await pool.query(
          `
          SELECT 
            TO_CHAR(checkindatetime, 'YYYY-MM') AS month,
            SUM(totalprice) AS monthlyrevenue,
            COUNT(reservationid) AS monthlyreservations
          FROM reservation
          WHERE reservationstatus = 'Paid'
            AND propertyid IN (
              SELECT propertyid FROM properties WHERE clusterid = ANY($1)
            )
          GROUP BY TO_CHAR(checkindatetime, 'YYYY-MM')
          ORDER BY month;
          `,
          [clusterids]
        ); 
    }

    // Safely return empty array if no data
    res.status(200).json({ monthlyData: result.rows || [] });
  } catch (err) {
    console.error("Error fetching finance data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/occupancy_rate", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await pool.query(`
        WITH monthly_data AS (
            SELECT 
                TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
                SUM(EXTRACT(DAY FROM (r.checkoutdatetime - r.checkindatetime))) AS total_reserved_nights,
                SUM(r.totalprice) AS monthly_revenue,
                COUNT(r.reservationid) AS monthly_reservations
            FROM reservation r
            JOIN properties p ON r.propertyid = p.propertyid
            WHERE r.reservationstatus = 'Paid'
            GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ),
        total_available_nights AS (
            SELECT 
                TO_CHAR(gs.month, 'YYYY-MM') AS month,
                COUNT(p.propertyid) * DATE_PART('day', gs.month + INTERVAL '1 month' - INTERVAL '1 day') AS total_available_nights
            FROM (
                SELECT generate_series(
                    (SELECT DATE_TRUNC('month', MIN(checkindatetime)) FROM reservation),
                    (SELECT DATE_TRUNC('month', MAX(checkoutdatetime)) FROM reservation),
                    INTERVAL '1 month'
                ) AS month
            ) gs
            CROSS JOIN properties p
            WHERE p.propertystatus = 'Available'
            GROUP BY gs.month
        )
        SELECT 
            md.month,
            md.monthly_revenue,
            md.monthly_reservations,
            md.total_reserved_nights,
            tan.total_available_nights,
            (md.total_reserved_nights::DECIMAL / NULLIF(tan.total_available_nights, 0) * 100) AS occupancy_rate
        FROM monthly_data md
        JOIN total_available_nights tan ON md.month = tan.month
        ORDER BY md.month;
      `,);
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(`
        WITH monthly_data AS (
            SELECT 
                TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
                SUM(EXTRACT(DAY FROM (r.checkoutdatetime - r.checkindatetime))) AS total_reserved_nights,
                SUM(r.totalprice) AS monthly_revenue,
                COUNT(r.reservationid) AS monthly_reservations
            FROM reservation r
            JOIN properties p ON r.propertyid = p.propertyid
            WHERE r.reservationstatus = 'Paid'
            AND p.clusterid = ANY($1)
            AND p.userid = $2
            GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ),
        total_available_nights AS (
            SELECT 
                TO_CHAR(gs.month, 'YYYY-MM') AS month,
                COUNT(p.propertyid) * DATE_PART('day', gs.month + INTERVAL '1 month' - INTERVAL '1 day') AS total_available_nights
            FROM (
                SELECT generate_series(
                    (SELECT DATE_TRUNC('month', MIN(checkindatetime)) FROM reservation),
                    (SELECT DATE_TRUNC('month', MAX(checkoutdatetime)) FROM reservation),
                    INTERVAL '1 month'
                ) AS month
            ) gs
            CROSS JOIN properties p
            WHERE p.propertystatus = 'Available'
            AND p.clusterid = ANY($1)
            AND p.userid = $2
            GROUP BY gs.month
        )
        SELECT 
            md.month,
            md.monthly_revenue,
            md.monthly_reservations,
            md.total_reserved_nights,
            tan.total_available_nights,
            (md.total_reserved_nights::DECIMAL / NULLIF(tan.total_available_nights, 0) * 100) AS occupancy_rate
        FROM monthly_data md
        JOIN total_available_nights tan ON md.month = tan.month
        ORDER BY md.month;
      `, [clusterids, userid]);
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(`
        WITH monthly_data AS (
            SELECT 
                TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
                SUM(EXTRACT(DAY FROM (r.checkoutdatetime - r.checkindatetime))) AS total_reserved_nights,
                SUM(r.totalprice) AS monthly_revenue,
                COUNT(r.reservationid) AS monthly_reservations
            FROM reservation r
            JOIN properties p ON r.propertyid = p.propertyid
            WHERE r.reservationstatus = 'Paid'
            AND p.clusterid = ANY($1)
            GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ),
        total_available_nights AS (
            SELECT 
                TO_CHAR(gs.month, 'YYYY-MM') AS month,
                COUNT(p.propertyid) * DATE_PART('day', gs.month + INTERVAL '1 month' - INTERVAL '1 day') AS total_available_nights
            FROM (
                SELECT generate_series(
                    (SELECT DATE_TRUNC('month', MIN(checkindatetime)) FROM reservation),
                    (SELECT DATE_TRUNC('month', MAX(checkoutdatetime)) FROM reservation),
                    INTERVAL '1 month'
                ) AS month
            ) gs
            CROSS JOIN properties p
            WHERE p.propertystatus = 'Available'
            AND p.clusterid = ANY($1)
            GROUP BY gs.month
        )
        SELECT 
            md.month,
            md.monthly_revenue,
            md.monthly_reservations,
            md.total_reserved_nights,
            tan.total_available_nights,
            (md.total_reserved_nights::DECIMAL / NULLIF(tan.total_available_nights, 0) * 100) AS occupancy_rate
        FROM monthly_data md
        JOIN total_available_nights tan ON md.month = tan.month
        ORDER BY md.month;
      `, [clusterids]);
    }
    
    res.status(200).json({ monthlyData: result.rows || [] });
  } catch (err) {
    console.error("Error fetching occupancy rate data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/RevPAR", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let propertyCountResult;
    let revparResult;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      propertyCountResult = await pool.query(
        `SELECT COUNT(*) AS available_properties 
         FROM properties 
         WHERE propertystatus = 'Available';`,
      );

      const availableProperties = parseInt(propertyCountResult.rows[0].available_properties);

      if (availableProperties === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      revparResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(r.totalprice), 0) / $1 AS revpar
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        WHERE 
          p.propertystatus = 'Available'
          AND r.reservationstatus = 'Paid'
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
        [availableProperties]
      );
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      propertyCountResult = await pool.query(
        `SELECT COUNT(*) AS available_properties 
         FROM properties 
         WHERE propertystatus = 'Available' 
           AND clusterid = ANY($1)
           AND userid = $2;`,
        [clusterids, userid]
      );
  
      const availableProperties = parseInt(propertyCountResult.rows[0].available_properties);
  
      if (availableProperties === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      revparResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(r.totalprice), 0) / $2 AS revpar
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        WHERE 
          p.propertystatus = 'Available'
          AND p.clusterid = ANY($1)
          AND r.reservationstatus = 'Paid'
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
        [clusterids, availableProperties]
      );
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      propertyCountResult = await pool.query(
        `SELECT COUNT(*) AS available_properties 
         FROM properties 
         WHERE propertystatus = 'Available' 
           AND clusterid = ANY($1);`,
        [clusterids]
      );
  
      const availableProperties = parseInt(propertyCountResult.rows[0].available_properties);
  
      if (availableProperties === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      revparResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(r.totalprice), 0) / $2 AS revpar
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        WHERE 
          p.propertystatus = 'Available'
          AND p.clusterid = ANY($1)
          AND r.reservationstatus = 'Paid'
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
        [clusterids, availableProperties]
      );
    }
    
    res.status(200).json({ monthlyData: revparResult.rows || [] });
  } catch (err) {
    console.error("Error fetching monthly RevPAR data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/cancellation_rate", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let cancellationRateResult;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      cancellationRateResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          (COUNT(CASE WHEN r.reservationstatus = 'Canceled' THEN 1 END) * 100.0) / NULLIF(COUNT(r.reservationid), 0) AS cancellation_rate
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
      );
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      cancellationRateResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          (COUNT(CASE WHEN r.reservationstatus = 'Canceled' THEN 1 END) * 100.0) / NULLIF(COUNT(r.reservationid), 0) AS cancellation_rate
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        WHERE 
          p.clusterid = ANY($1)
        AND 
          p.userid = $2
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
        [clusterids, userid]
      );
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] }); 
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      cancellationRateResult = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          (COUNT(CASE WHEN r.reservationstatus = 'Canceled' THEN 1 END) * 100.0) / NULLIF(COUNT(r.reservationid), 0) AS cancellation_rate
        FROM 
          reservation r
        INNER JOIN 
          properties p ON r.propertyid = p.propertyid
        WHERE 
          p.clusterid = ANY($1)
        GROUP BY 
          TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY 
          month;
        `,
        [clusterids]
      );
    }

    res.status(200).json({ monthlyData: cancellationRateResult.rows || [] });
  } catch (err) {
    console.error("Error fetching cancellation rate data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/customer_retention_rate", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await pool.query(
        `
        WITH monthly_users AS (
          SELECT 
            TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
            r.userid
          FROM reservation r
          INNER JOIN properties p ON r.propertyid = p.propertyid
        ),
        all_users AS (
          SELECT DISTINCT userid FROM users
        )
        SELECT 
          mu.month,
          (COUNT(DISTINCT mu.userid) * 100.0) / NULLIF((SELECT COUNT(*) FROM all_users), 0) AS customer_retention_rate
        FROM monthly_users mu
        GROUP BY mu.month
        ORDER BY mu.month;
        `,
      );
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(
        `
        WITH monthly_users AS (
          SELECT 
            TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
            r.userid
          FROM reservation r
          INNER JOIN properties p ON r.propertyid = p.propertyid
          WHERE p.clusterid = ANY($1)
          AND p.userid = $2
        ),
        all_users AS (
          SELECT DISTINCT userid FROM users
        )
        SELECT 
          mu.month,
          (COUNT(DISTINCT mu.userid) * 100.0) / NULLIF((SELECT COUNT(*) FROM all_users), 0) AS customer_retention_rate
        FROM monthly_users mu
        GROUP BY mu.month
        ORDER BY mu.month;
        `,
        [clusterids, userid]
      );
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(
        `
        WITH monthly_users AS (
          SELECT 
            TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
            r.userid
          FROM reservation r
          INNER JOIN properties p ON r.propertyid = p.propertyid
          WHERE p.clusterid = ANY($1)
        ),
        all_users AS (
          SELECT DISTINCT userid FROM users
        )
        SELECT 
          mu.month,
          (COUNT(DISTINCT mu.userid) * 100.0) / NULLIF((SELECT COUNT(*) FROM all_users), 0) AS customer_retention_rate
        FROM monthly_users mu
        GROUP BY mu.month
        ORDER BY mu.month;
        `,
        [clusterids]
      );
    }
    
    res.status(200).json({ monthlyData: result.rows || [] });
  } catch (err) {
    console.error("Error fetching customer retention rate data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/guest_satisfaction_score", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          AVG(p.rating) AS guest_satisfaction_score
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        WHERE p.rating IS NOT NULL
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
      );
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          AVG(p.rating) AS guest_satisfaction_score
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        WHERE p.clusterid = ANY($1) 
        AND p.rating IS NOT NULL
        AND p.userid = $2
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
        [clusterids, userid]
      );
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map(row => row.clusterid);
  
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          AVG(p.rating) AS guest_satisfaction_score
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        WHERE p.clusterid = ANY($1) AND p.rating IS NOT NULL
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
        [clusterids]
      );
    }

    res.status(200).json({ monthlyData: result.rows || [] });
  } catch (err) {
    console.error("Error fetching guest satisfaction score data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

app.get("/users/alos", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  try {
    const ownerResult = await pool.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(EXTRACT(DAY FROM r.checkoutdatetime - r.checkindatetime)) / NULLIF(COUNT(r.reservationid), 0), 0) AS average_length_of_stay
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
      );
    } else if (usergroup === 'Moderator') {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map((row) => row.clusterid);
  
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(EXTRACT(DAY FROM r.checkoutdatetime - r.checkindatetime)) / NULLIF(COUNT(r.reservationid), 0), 0) AS average_length_of_stay
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        WHERE p.clusterid = ANY($1)
        AND p.userid = $2
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
        [clusterids, userid]
      );
    } else {
      const clusterResult = await pool.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ monthlyData: [] });
      }
  
      const clusterids = clusterResult.rows.map((row) => row.clusterid);
  
      result = await pool.query(
        `
        SELECT 
          TO_CHAR(r.checkindatetime, 'YYYY-MM') AS month,
          COALESCE(SUM(EXTRACT(DAY FROM r.checkoutdatetime - r.checkindatetime)) / NULLIF(COUNT(r.reservationid), 0), 0) AS average_length_of_stay
        FROM reservation r
        INNER JOIN properties p ON r.propertyid = p.propertyid
        WHERE p.clusterid = ANY($1)
        GROUP BY TO_CHAR(r.checkindatetime, 'YYYY-MM')
        ORDER BY month;
        `,
        [clusterids]
      );
    }
    
    res.status(200).json({ monthlyData: result.rows || [] });
  } catch (err) {
    console.error("Error fetching ALOS data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

// Fetch reservations for the logged-in user
app.get('/cart', async (req, res) => {
  const userid = req.query.userid;

  if (!userid || isNaN(userid)) {
    return res.status(400).json({ error: 'Invalid or missing userid' });
  }

  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(
      `SELECT 
        r.reservationid, r.checkindatetime, r.checkoutdatetime, r.reservationblocktime, 
        r.request, r.totalprice, r.downpaymentamount, r.reservationstatus, r.rcid, r.userid AS res_userid,
        p.*,
        rt.normalrate, rt.weekendrate, rt.specialeventrate, rt.earlybirddiscountrate, rt.lastminutediscountrate,
        c.categoryname,
        cl.clustername,
        u.userid AS owner_id,
        u.username AS owner_username,
        u.uimage,
        u.uemail AS owner_email,
        u.uphoneno AS owner_phone
      FROM reservation r
      JOIN properties p ON r.propertyid = p.propertyid
      LEFT JOIN rate rt ON p.rateid = rt.rateid
      LEFT JOIN categories c ON p.categoryid = c.categoryid
      LEFT JOIN clusters cl ON p.clusterid = cl.clusterid
      LEFT JOIN users u ON p.userid = u.userid
      WHERE r.userid = $1`,
      [userid]
    );

    const reservations = result.rows.map(reservation => ({
      ...reservation,
      propertyimage: reservation.propertyimage ? reservation.propertyimage.split(',') : []
    }));

    res.status(200).json({ userid, reservations });
  } catch (err) {
    console.error('Error fetching reservations by userid:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});
// Get Owner PayPal ID for all property payments
app.get('/property/owner-paypal/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;

  if (!propertyId || isNaN(propertyId)) {
    return res.status(400).json({ error: 'Invalid property ID' });
  }

  let client;

  try {
    client = await pool.connect();

    const propertyResult = await client.query(
      `
      SELECT propertyid, propertyaddress
      FROM properties
      WHERE propertyid = $1
      LIMIT 1
      `,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const ownerResult = await client.query(
      `
      SELECT 
        userid,
        paypalid,
        ufirstname,
        ulastname,
        username,
        uemail,
        uphoneno,
        usergroup
      FROM users
      WHERE LOWER(TRIM(usergroup)) = 'owner'
        AND paypalid IS NOT NULL
        AND TRIM(paypalid) <> ''
      ORDER BY userid ASC
      LIMIT 1
      `
    );

    if (ownerResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Owner PayPal ID is not configured'
      });
    }

    const ownerData = ownerResult.rows[0];

    return res.status(200).json({
      payPalId: ownerData.paypalid || '',
      ownerName:
        `${ownerData.ufirstname || ''} ${ownerData.ulastname || ''}`.trim() ||
        ownerData.username ||
        'Owner',
      ownerEmail: ownerData.uemail || '',
      ownerPhone: ownerData.uphoneno || '',
      ownerGroup: ownerData.usergroup,
      ownerUserId: ownerData.userid
    });

  } catch (err) {
    console.error('Error fetching Owner PayPal ID:', err);

    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

app.post('/paypal/capture-order/:orderID', async (req, res) => {
  const { orderID } = req.params;

  try {
    const clientId =
      process.env.VITE_PAYPAL_CLIENT_ID ||
      'AZwIftz_uEFyQ-OCopoy7MXW8pk-JKgH4IeLTKkpDXF3GjnpeSQ4am5NZxFeT4spij_sgxIv8DETjzux';

    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientSecret) {
      return res.status(500).json({
        error: 'PAYPAL_CLIENT_SECRET is missing in backend .env'
      });
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('PayPal token error:', tokenData);

      return res.status(tokenRes.status).json({
        error: tokenData?.error_description || tokenData?.error || 'Failed to get PayPal access token',
        details: tokenData
      });
    }

    const captureRes = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      console.error('PayPal capture failed:', captureData);

      return res.status(captureRes.status).json({
        error: captureData?.message || 'PayPal capture failed',
        details: captureData
      });
    }

    return res.status(200).json(captureData);
  } catch (err) {
    console.error('PayPal capture error:', err);

    return res.status(500).json({
      error: err.message || 'PayPal capture server error'
    });
  }
});

// Fetch all reservations (Dashboard) 
app.get('/reservationTable', async (req, res) => {
    const username = req.query.username;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    let client;
  
    try {
        client = await pool.connect();

        const userResult = await client.query(
            'SELECT userid, usergroup FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userid = userResult.rows[0].userid;
        const usergroup = userResult.rows[0].usergroup;

        let query = `
            WITH latest_commission AS (
                SELECT commission_rate
                FROM commission_settings
                ORDER BY updated_at DESC
                LIMIT 1
            )
            SELECT 
                r.reservationid,
                r.propertyid,
                p.propertyaddress, 
               p.propertyimage,
                p.userid,
                u.username AS property_owner_username,
                r.checkindatetime,
                r.checkoutdatetime,
                r.reservationblocktime,
                r.request,
                r.totalprice,
                r.downpaymentamount,
                r.reservationstatus,
                r.rcid,
                rc.rcfirstname,
                rc.rclastname,
                rc.rcemail,
                rc.rcphoneno,
                rc.rctitle,

                COALESCE(bl.commission_rate, lc.commission_rate, 0) AS commission_rate,

                COALESCE(
                    bl.commission_amount,
                    ROUND((COALESCE(r.totalprice, 0) * COALESCE(lc.commission_rate, 0))::numeric, 2),
                    0
                ) AS commissionamount,

                COALESCE(
    bl.moderator_earning,
    ROUND(
        (
            COALESCE(r.totalprice, 0)
            -
            (
                COALESCE(r.totalprice, 0)
                *
                COALESCE(lc.commission_rate, 0)
            )
        )::numeric,
        2
    ),
    0
) AS moderator_earning,

bl.remarks AS payment_remarks,

COALESCE(
    bl.debit,
    0
) AS refund_amount,

COALESCE(
    bl.activity_type,
    ''
) AS ledger_activity_type

            FROM reservation r
            JOIN properties p ON r.propertyid = p.propertyid
            JOIN users u ON p.userid = u.userid
            JOIN reservation_customer_details rc ON r.rcid = rc.rcid
            CROSS JOIN latest_commission lc

            LEFT JOIN LATERAL (
    SELECT 
        booking_ledger.commission_rate,
        booking_ledger.commission_amount,
        booking_ledger.moderator_earning,
        booking_ledger.remarks,
        booking_ledger.debit,
        booking_ledger.activity_type
                FROM booking_ledger
                WHERE booking_ledger.reservationid = r.reservationid
                ORDER BY booking_ledger.ledgerid DESC
                LIMIT 1
            ) bl ON true
        `;

        const params = [];

        // Moderator can only see reservations for their own created/managed properties
        if (usergroup === 'Moderator') {
            query += ' WHERE p.userid = $1';
            params.push(userid);
        }

        query += `
            ORDER BY r.checkindatetime DESC, r.reservationid DESC
        `;

        const result = await client.query(query, params);

        const reservations = result.rows.map(reservation => ({
            ...reservation,
            propertyimage: reservation.propertyimage ? reservation.propertyimage.split(',') : []
        }));

        res.status(200).json({ reservations });
    } catch (err) {
        console.error('Error fetching reservation data for reservation table:', err);
        res.status(500).json({ message: 'Internal Server Error', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
});

function formatRoomPackageForLog(request) {
  if (!request) return 'N/A';

  const text = String(request);

  const roomMatch = text.match(/Room Selected:\s*([^\n\r]+)/i);

  if (roomMatch && roomMatch[1]) {
    return roomMatch[1].trim();
  }

  const packageMatch = text.match(/Package:\s*([^\n\r]+)/i);

  if (packageMatch && packageMatch[1]) {
    return packageMatch[1].trim();
  }

  return 'N/A';
}

// Create booking alert notification for property owner only
async function createBookingAlertNotification(client, reservationid, reservationStatus) {
  const statusLower = String(reservationStatus || '').trim().toLowerCase();

  if (!['paid', 'partially paid', 'cancelled', 'canceled'].includes(statusLower)) {
    return;
  }

  // Helper: format date as Malaysia date
  const formatMalaysiaDate = (dateValue) => {
    if (!dateValue) return 'N/A';

    return new Date(dateValue).toLocaleDateString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper: format money safely
  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return amount.toFixed(2);
  };

  // Helper: extract room type / package from reservation request
  const extractRoomType = (requestText) => {
    if (!requestText) return 'N/A';

    const roomMatch = requestText.match(/Room Selected:\s*([^,\n]+)/i);
    if (roomMatch) return roomMatch[1].trim();

    const packageMatch = requestText.match(/Package:\s*([^,\n]+)/i);
    if (packageMatch) return packageMatch[1].trim();

    return 'N/A';
  };

  const notifDataResult = await client.query(
    `
    SELECT
      r.reservationid,
      r.propertyid,
      r.checkindatetime,
      r.checkoutdatetime,
      r.totalprice,
      r.downpaymentamount,
      r.request,
      p.propertyaddress,
      p.userid AS owner_userid,
      rc.rcfirstname,
      rc.rclastname
    FROM reservation r
    JOIN properties p ON p.propertyid = r.propertyid
    LEFT JOIN reservation_customer_details rc ON rc.rcid = r.rcid
    WHERE r.reservationid = $1
    `,
    [reservationid]
  );

  if (notifDataResult.rows.length === 0) {
    return;
  }

  const notifData = notifDataResult.rows[0];

  const customerName =
    `${notifData.rcfirstname || ''} ${notifData.rclastname || ''}`.trim() || 'N/A';

  const propertyName = notifData.propertyaddress || 'N/A';
  const roomType = extractRoomType(notifData.request);
  const checkInDate = formatMalaysiaDate(notifData.checkindatetime);
  const checkOutDate = formatMalaysiaDate(notifData.checkoutdatetime);

  let notificationTitle = '';
  let notificationType = '';
  let ownerMessage = '';

  if (statusLower === 'partially paid') {
    notificationTitle = 'Booking Partially Paid';
    notificationType = 'Booking Partially Paid';

    ownerMessage =
      `Customer ${customerName} has partially paid for ${propertyName}. ` +
      `Reservation ID: #${notifData.reservationid}. ` +
      `Room Type: ${roomType}. ` +
      `Check-in Date: ${checkInDate}. ` +
      `Check-out Date: ${checkOutDate}. ` +
      `Deposit paid: RM ${formatMoney(notifData.downpaymentamount)}. ` +
      `Total booking amount: RM ${formatMoney(notifData.totalprice)}.`;
  }

  if (statusLower === 'paid') {
    notificationTitle = 'Booking Paid';
    notificationType = 'Booking Paid';

    ownerMessage =
      `Customer ${customerName} has fully paid for ${propertyName}. ` +
      `Reservation ID: #${notifData.reservationid}. ` +
      `Room Type: ${roomType}. ` +
      `Check-in Date: ${checkInDate}. ` +
      `Check-out Date: ${checkOutDate}. ` +
      `Total paid amount: RM ${formatMoney(notifData.totalprice)}.`;
  }

  if (statusLower === 'cancelled' || statusLower === 'canceled') {
    notificationTitle = 'Booking Cancellation';
    notificationType = 'Booking Cancellation';

    ownerMessage =
      `A booking for ${propertyName} has been canceled. ` +
      `Reservation ID: #${notifData.reservationid}. ` +
      `Room Type: ${roomType}. ` +
      `Check-in Date: ${checkInDate}. ` +
      `Check-out Date: ${checkOutDate}. ` +
      `Customer: ${customerName}.`;
  }

  if (!notifData.owner_userid || !notificationTitle || !ownerMessage) {
    return;
  }

  await client.query(
    `
    INSERT INTO notifications (
      userid,
      reservationid,
      propertyid,
      notificationtitle,
      notificationmessage,
      notificationtype,
      notificationstatus,
      isread,
      timestamp
    )
    SELECT
      $1::int,
      $2::int,
      $3::int,
      $4::varchar,
      $5::text,
      $6::varchar,
      'Unread',
      false,
      NOW() AT TIME ZONE 'Asia/Kuala_Lumpur'
    WHERE NOT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.userid = $1::int
      AND n.reservationid = $2::int
      AND n.notificationtype = $6::varchar
    )
    `,
    [
      Number(notifData.owner_userid),
      Number(notifData.reservationid),
      Number(notifData.propertyid),
      notificationTitle,
      ownerMessage,
      notificationType
    ]
  );
}

// Update reservation status
app.patch('/updateReservationStatus/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const reservationStatus = req.body.reservationStatus || req.body.status;
  const { userid, creatorid, creatorUsername } = req.query;
  let client;

  if (!reservationStatus) {
    return res.status(400).json({ message: 'Status is missing from request' });
  }

  try {
    client = await pool.connect();

    const updateQuery = `
      UPDATE reservation 
      SET reservationstatus = $1 
      WHERE reservationid = $2 
      RETURNING *
    `;

    const result = await client.query(updateQuery, [reservationStatus, reservationid]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const updatedReservation = result.rows[0];
    const statusLower = String(reservationStatus || '').trim().toLowerCase();

    try {
      await createBookingAlertNotification(client, reservationid, reservationStatus);
    } catch (notificationError) {
      console.error('Booking alert notification skipped:', notificationError.message);
    }

    if (['paid', 'partially paid'].includes(statusLower)) {
      try {
        await sendSoldOutRoomEmail(client, reservationid);
      } catch (soldOutEmailError) {
        console.error('Sold out email skipped:', soldOutEmailError.message);
      }
    }

    // Ensure balance payment also updates
// the existing Ledger row to Paid.
if (statusLower === 'paid') {
  try {
    const ledgerPaidResult =
      await client.query(
        `
        UPDATE booking_ledger
        SET
          activity_type = 'Payment Successful',
          booking_status = 'Paid',
          stock_status = 'Deducted',

          credit = COALESCE(
            moderator_earning,
            credit,
            0
          ),

          debit = 0,

          expected_amount = COALESCE(
            gross_amount,
            expected_amount,
            0
          ),

          timestamp =
            NOW() AT TIME ZONE
            'Asia/Kuala_Lumpur'

        WHERE reservationid = $1
        `,
        [reservationid]
      );

    console.log(
      `Paid ledger sync reservation #${reservationid}:`,
      ledgerPaidResult.rowCount
    );
  } catch (ledgerPaidError) {
    console.error(
      'Paid ledger sync failed:',
      ledgerPaidError.message
    );
  }
}

// This prevents the old deposit ledger from being changed into Paid after balance payment.
if (['expired', 'cancelled', 'canceled'].includes(statusLower)) {
  const ledgerSyncData = await client.query(
    `
    SELECT 
      r.reservationid,
      r.reservationstatus,
      r.totalprice,
      r.downpaymentamount,
      bl.moderator_earning
    FROM reservation r
    LEFT JOIN booking_ledger bl ON bl.reservationid = r.reservationid
    WHERE r.reservationid = $1
    ORDER BY bl.ledgerid DESC
    LIMIT 1
    `,
    [reservationid]
  );

  if (ledgerSyncData.rows.length > 0) {
    const row = ledgerSyncData.rows[0];
    const latestStatus = String(row.reservationstatus || '').trim();

    const gross = parseFloat(row.totalprice || 0);
    const moderatorEarning = parseFloat(row.moderator_earning || 0);

    await client.query(
      `
      UPDATE booking_ledger
      SET
        booking_status = $1,
        credit = 0,
        debit = COALESCE($2::numeric, 0),
        expected_amount = COALESCE(gross_amount, $3::numeric, 0),
        stock_status = 'Restocked'
      WHERE reservationid = $4::int
        AND LOWER(TRIM(booking_status)) NOT IN ('paid')
      `,
      [
        latestStatus,
        moderatorEarning,
        gross,
        reservationid
      ]
    );
  }
}

    if (['cancelled', 'canceled', 'expired'].includes(statusLower)) {
      // Fetch property details to properly log the cancellation
      const propDetails = await client.query(
        `
        SELECT 
          p.propertyaddress, 
          p.userid AS owner_userid, 
          rc.rcfirstname, 
          rc.rclastname 
        FROM properties p 
        JOIN reservation_customer_details rc ON rc.rcid = $1
        WHERE p.propertyid = $2
        `,
        [updatedReservation.rcid, updatedReservation.propertyid]
      );

      const cancelLogResult = await client.query(
        `
        SELECT 
          r.reservationid,
          r.totalprice,
          r.downpaymentamount,
          r.request,
          p.propertyid,
          p.propertyaddress,
          p.userid AS property_owner_userid,
          rc.rcfirstname,
          rc.rclastname
        FROM reservation r
        JOIN properties p ON p.propertyid = r.propertyid
        LEFT JOIN reservation_customer_details rc ON rc.rcid = r.rcid
        WHERE r.reservationid = $1
        `,
        [reservationid]
      );

      if (cancelLogResult.rows.length > 0) {
        const cancelData = cancelLogResult.rows[0];

        const totalAmount = parseFloat(cancelData.totalprice || 0);
        const depositAmount = parseFloat(cancelData.downpaymentamount || 0);
        const balanceAmount = Math.max(0, totalAmount - depositAmount);

     const isExpiredStatus = statusLower === 'expired';

const statusActionText = isExpiredStatus ? 'expired' : 'canceled';
const statusDisplayText = isExpiredStatus ? 'Expired' : 'Canceled';

const actionBy = isExpiredStatus
  ? 'System'
  : (
      creatorUsername &&
      creatorUsername !== 'undefined' &&
      creatorUsername !== 'null'
        ? creatorUsername
        : 'Unknown User'
    );

const actionUserId = isExpiredStatus
  ? (creatorid || userid || cancelData.property_owner_userid)
  : (creatorid || userid || cancelData.property_owner_userid);

const roomPackageText = formatRoomPackageForLog(cancelData.request);

await client.query(
  `
  INSERT INTO book_and_pay_log (logtime, log, userid)
  VALUES ($1, $2, $3)
  `,
  [
    new Date(Date.now() + 8 * 60 * 60 * 1000),
    `${actionBy} ${statusActionText} reservation #${reservationid} (${cancelData.propertyaddress}). Room/Package: ${roomPackageText}. Stock Restocked. Total: RM ${totalAmount.toFixed(2)} | Deposit Paid: RM ${depositAmount.toFixed(2)} | Balance Removed: RM ${balanceAmount.toFixed(2)}. Booking status changed to ${statusDisplayText}.`,
    actionUserId
  ]
);

      if (propDetails.rows.length > 0) {
        const propData = propDetails.rows[0];
        const gross = parseFloat(updatedReservation.totalprice || 0);

        // Fetch live commission to calculate what was lost
        const commRes = await client.query(
          'SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1'
        );

        const commRate = commRes.rows.length > 0
          ? parseFloat(commRes.rows[0].commission_rate)
          : 0.07;

        const commAmount = gross * commRate;
        const modEarning = gross - commAmount;

        let extractedRoomType = 'Standard';

        if (updatedReservation.request) {
          const match =
            updatedReservation.request.match(/Room Selected:\s*(.+)/i) ||
            updatedReservation.request.match(/Package:\s*(.+)/i);

          if (match) extractedRoomType = match[1].trim();
        }

        const isExpiredStatus = statusLower === 'expired';

        const ledgerActivityType = isExpiredStatus
          ? 'Reservation Expired'
          : 'Reservation Cancelled';

        const ledgerBookingStatus = isExpiredStatus
          ? 'Expired'
          : 'Canceled';

        const ledgerRemarks = isExpiredStatus
          ? 'Booking expired because the payment deadline passed.'
          : 'Booking was canceled by the customer. Deposit is non-refundable.';

        await insertLedgerEntry(client, {
          reservationid: reservationid,
          propertyid: updatedReservation.propertyid,
          propertyname: propData.propertyaddress,
          roomtype: extractedRoomType,
          moderator_userid: propData.owner_userid,
          moderator_username: isExpiredStatus
            ? 'System'
            : (
                creatorUsername &&
                creatorUsername !== 'undefined' &&
                creatorUsername !== 'null'
                  ? creatorUsername
                  : 'Unknown User'
              ),
          customer_userid: updatedReservation.userid || null,
          customer_name: `${propData.rcfirstname || ''} ${propData.rclastname || ''}`.trim(),
          activity_type: ledgerActivityType,
          stock_status: 'Restocked',
          booking_status: ledgerBookingStatus,
          gross_amount: gross,
          commission_rate: commRate,
          commission_amount: commAmount,
          moderator_earning: modEarning,
          credit: 0,
          debit: modEarning,
          expected_amount: 0,
          remarks: ledgerRemarks
        });
      }
    }
  }

    if (['cancelled', 'canceled'].includes(statusLower)) {
      try {
        const emailResult = await client.query(
          `
                SELECT 
            r.reservationid,
            r.checkindatetime,
            r.checkoutdatetime,
            r.totalprice,
            r.downpaymentamount,
            r.request,
            p.propertyaddress,
            owner.uemail AS owner_email,
            owner.username AS owner_username,
            rc.rcfirstname,
            rc.rclastname,
            customer.uemail AS customer_email,
            customer.username AS customer_username
          FROM reservation r
          JOIN properties p ON p.propertyid = r.propertyid
          JOIN users owner ON owner.userid = p.userid
          LEFT JOIN reservation_customer_details rc ON rc.rcid = r.rcid
          LEFT JOIN users customer ON customer.userid = r.userid
          WHERE r.reservationid = $1
          `,
          [reservationid]
        );

        if (emailResult.rows.length > 0) {
          const data = emailResult.rows[0];

const cancelledRoomPackage = formatRoomPackageForLog(data.request);

const cancelledRoomPackageLine =
  cancelledRoomPackage && cancelledRoomPackage !== 'N/A'
    ? `<p style="margin: 0 0 8px;"><b>Room / Package Cancelled:</b> ${cancelledRoomPackage}</p>`
    : `<p style="margin: 0 0 8px;"><b>Room / Package Cancelled:</b> Whole Property / Homestay</p>`;

// Cancellation email to property owner
          await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
              sender: {
                name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                email: process.env.BREVO_SENDER_EMAIL,
              },
              to: [
                {
                  email: data.owner_email,
                  name: data.owner_username || 'Property Owner'
                }
              ],
              subject: `Booking Cancelled - Reservation #${data.reservationid}`,
              htmlContent: `
                <h2 style="margin: 0 0 16px; color: #111827;">Booking Canceled</h2>

                <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">
                  A customer has canceled their reservation for 
                  <b>${data.propertyaddress || 'N/A'}</b>.
                </p>

                <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px 18px; border-radius: 8px; margin: 18px 0;">
                  <p style="margin: 0 0 8px;"><b>Reservation ID:</b> ${data.reservationid}</p>
                  <p style="margin: 0 0 8px;"><b>Property Name:</b> ${data.propertyaddress || 'N/A'}</p>
                  ${cancelledRoomPackageLine}
                  <p style="margin: 0 0 8px;"><b>Customer:</b> ${data.rcfirstname || ''} ${data.rclastname || ''}</p>
                  <p style="margin: 0 0 8px;"><b>Customer Email:</b> ${data.customer_email || 'N/A'}</p>
                  <p style="margin: 0 0 8px;"><b>Check-in:</b> ${new Date(data.checkindatetime).toLocaleDateString('en-MY')}</p>
                  <p style="margin: 0 0 8px;"><b>Check-out:</b> ${new Date(data.checkoutdatetime).toLocaleDateString('en-MY')}</p>
                  <p style="margin: 0 0 8px;"><b>Total Price:</b> RM ${data.totalprice || '0.00'}</p>
                  <p style="margin: 0;"><b>Deposit Paid:</b> RM ${data.downpaymentamount || '0.00'}</p>
                </div>

                <p style="font-size: 15px; color: #374151; margin-top: 16px;">
                  You may log in to view the reservation cancellation details.
                </p>

                <div style="margin: 18px 0;">
                  <a href="https://sarawakadventures.com/login" 
                    style="background-color: black; color: white; padding: 10px 22px; font-weight: bold; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Login
                  </a>
                </div>
              `
            },
            {
              headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );

          // Cancellation confirmation email to customer
          if (data.customer_email) {
            await axios.post(
              'https://api.brevo.com/v3/smtp/email',
              {
                sender: {
                  name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                  email: process.env.BREVO_SENDER_EMAIL,
                },
                to: [
                  {
                    email: data.customer_email,
                    name: `${data.rcfirstname || ''} ${data.rclastname || ''}`.trim() || 'Customer'
                  }
                ],
                subject: `Your Booking Has Been Successfully Cancelled`,
                htmlContent: `
                  <h2 style="margin: 0 0 16px; color: #111827;">Booking Cancellation Confirmed</h2>

                  <p style="font-size: 15px; color: #374151;">
                    Dear ${data.rcfirstname || 'Customer'},
                  </p>

                  <p style="font-size: 15px; color: #374151;">
                    Your reservation has been <b style="color: #991b1b;">successfully canceled</b>.
                  </p>

                  <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px 18px; border-radius: 8px; margin: 18px 0;">
                    <p style="margin: 0 0 8px;"><b>Property Name:</b> ${data.propertyaddress || 'N/A'}</p>
                    ${cancelledRoomPackageLine}
                    <p style="margin: 0 0 8px;"><b>Check-in:</b> ${new Date(data.checkindatetime).toLocaleDateString('en-MY')}</p>
                    <p style="margin: 0 0 8px;"><b>Check-out:</b> ${new Date(data.checkoutdatetime).toLocaleDateString('en-MY')}</p>
                    <p style="margin: 0 0 8px;"><b>Total Price:</b> RM ${data.totalprice || '0.00'}</p>
                    <p style="margin: 0;"><b>Deposit Paid:</b> RM ${data.downpaymentamount || '0.00'}</p>
                  </div>

                  <p style="font-size: 15px; color: #374151;">
                    Please note that the deposit paid is non-refundable if applicable.
                  </p>

                  <p style="font-size: 15px; color: #374151;">
                    You may log in to your account to view more details.
                  </p>

                  <div style="margin: 18px 0;">
                    <a href="https://sarawakadventures.com/login" 
                      style="background-color: black; color: white; padding: 10px 22px; font-weight: bold; text-decoration: none; border-radius: 5px; display: inline-block;">
                      Login
                    </a>
                  </div>
                `
              },
              {
                headers: {
                  'api-key': process.env.BREVO_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError.message);
      }
    }

   let safeUserId = parseInt(creatorid) || parseInt(userid) || parseInt(updatedReservation.userid);

    if (isNaN(safeUserId)) safeUserId = 0;

    let safeUsername = 'System';

    if (creatorUsername && creatorUsername !== 'undefined' && creatorUsername !== 'null') {
      safeUsername = creatorUsername;
    }

    try {
  const auditAction =
  statusLower === 'expired'
    ? 'Expired Reservation'
    : ['cancelled', 'canceled'].includes(statusLower)
      ? 'Cancel Reservation'
      : statusLower === 'paid'
        ? 'Payment Successful'
        : statusLower === 'partially paid'
          ? 'Payment Deposit'
          : 'Update Reservation Status';

await client.query(
  `
  INSERT INTO audit_trail (
    entityid,
    timestamp,
    entitytype,
    actiontype,
    action,
    userid,
    username
  )
  VALUES (
    $1,
    NOW() AT TIME ZONE 'Asia/Kuala_Lumpur',
    $2,
    $3,
    $4,
    $5,
    $6
  )
  `,
  [
    reservationid,
    'Reservation',
    'PATCH',
    auditAction,
    safeUserId,
    safeUsername
  ]
);
    } catch (e) {
      console.error('Audit skipped:', e.message);
    }

    // WAITLIST TRIGGER
    if (['cancelled', 'canceled', 'expired'].includes(statusLower)) {
      if (typeof notifyWaitlistedUsers === 'function') {
        notifyWaitlistedUsers(
          updatedReservation.propertyid,
          updatedReservation.checkindatetime,
          updatedReservation.checkoutdatetime
        ).catch(e => console.error('Waitlist error:', e.message));
      }
    }

    res.status(200).json({
      message: 'success',
      reservation: updatedReservation
    });

  } catch (error) {
    console.error('CRITICAL ERROR in updateReservationStatus:', error);
    res.status(500).json({
      message: 'server error',
      details: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// MANUAL RESTOCK FOR PAID RESERVATIONS
// Administrator: any eligible property
// Property creator: own property only

app.patch(
  '/restockReservation/:reservationid',
  async (req, res) => {
    const { reservationid } = req.params;
    const timestamp =
  new Date(Date.now() + 8 * 60 * 60 * 1000);

    const refundAmount =
      Number(req.body?.refundAmount ?? 0);

    const requesterId =
      Number(req.user?.userid);

    const requesterUsername =
      String(
        req.user?.username ||
        'Unknown User'
      ).trim();

    const requesterGroup =
      String(
        req.user?.usergroup || ''
      )
        .trim()
        .toLowerCase();

    let client;

  

    if (
      !reservationid ||
      !Number.isInteger(
        Number(reservationid)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid reservation ID.'
      });
    }

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Refund amount must be RM 0.00 or greater.'
      });
    }

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message:
          'User authentication is required.'
      });
    }

    try {
      client = await pool.connect();

      await client.query('BEGIN');

   

      const reservationResult =
        await client.query(
          `
          SELECT
            r.reservationid,
            r.propertyid,
            r.userid AS customer_userid,
            r.checkindatetime,
            r.checkoutdatetime,
            r.totalprice,
            r.downpaymentamount,
            r.request,
            r.reservationstatus,

            p.propertyaddress,
            p.userid AS property_owner_userid,

            rc.rcfirstname,
            rc.rclastname,
            rc.rcemail,

            bl.ledgerid,
            bl.remarks AS ledger_remarks,
            bl.commission_rate,
            bl.commission_amount,
            bl.moderator_earning,
            bl.credit AS ledger_credit,

            (
              r.checkindatetime::date
              <
              (
                NOW()
                AT TIME ZONE
                'Asia/Kuching'
              )::date
            ) AS checkin_passed

          FROM reservation r

          JOIN properties p
            ON p.propertyid =
               r.propertyid

          LEFT JOIN
            reservation_customer_details rc
            ON rc.rcid = r.rcid

          LEFT JOIN LATERAL (
            SELECT
            ledgerid,
            remarks,
            commission_rate,
            commission_amount,
            moderator_earning,
            credit

            FROM booking_ledger

            WHERE reservationid =
                  r.reservationid

            ORDER BY ledgerid DESC

            LIMIT 1
          ) bl ON true

          WHERE r.reservationid = $1

          FOR UPDATE OF r
          `,
          [reservationid]
        );

      if (
        reservationResult.rows.length === 0
      ) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message:
            'Reservation not found.'
        });
      }

      const reservation =
        reservationResult.rows[0];

      
      // Must still be Paid.
     

      const currentStatus =
        String(
          reservation.reservationstatus ||
          ''
        )
          .trim()
          .toLowerCase();

      if (currentStatus !== 'paid') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Only Paid reservations can be manually restocked.'
        });
      }


      
      // Past check-in cannot restock.
      // Same-day is allowed.
    

      if (reservation.checkin_passed) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'This booking can no longer be restocked because the check-in date has already passed.'
        });
      }

      
      // Permission.
      // Administrator = all.
      // Property creator = own property.
     

      const isAdministrator =
        requesterGroup ===
          'administrator' ||
        requesterGroup === 'admin';

      const isPropertyCreator =
        Number(
          reservation.property_owner_userid
        ) === requesterId;

      if (
        !isAdministrator &&
        !isPropertyCreator
      ) {
        await client.query('ROLLBACK');

        return res.status(403).json({
          success: false,
          message:
            'You are not allowed to restock this property booking.'
        });
      }

      
      // Refund validation.
      // Instant Pay = totalprice paid.
      

      const originalAmount =
        Number(
          reservation.totalprice || 0
        );

      if (
        refundAmount >
        originalAmount
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          message:
            `Refund cannot exceed RM ${originalAmount.toFixed(
              2
            )}.`
        });
      }

      const retainedAmount =
        Math.max(
          0,
          originalAmount -
          refundAmount
        );

        const originalOperatorEarning =
  reservation.moderator_earning != null
    ? Number(reservation.moderator_earning)
    : Number(reservation.ledger_credit || 0);

const adjustedOperatorEarning =
  Math.max(
    0,
    originalOperatorEarning -
    refundAmount
  );

      // 1. Cancel reservation.
      // Stock automatically becomes available because Cancelled does not hold stock.
     

      const updatedResult =
        await client.query(
          `
          UPDATE reservation

          SET reservationstatus =
              'Cancelled'

          WHERE reservationid = $1

          RETURNING *
          `,
          [reservationid]
        );

      const updatedReservation =
        updatedResult.rows[0];

      
      // Get room / package name.
    

      const roomPackage =
        formatRoomPackageForLog(
          reservation.request
        );

      // 2. Update CURRENT ledger row.
   

      if (!reservation.ledgerid) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Payment ledger record was not found for this reservation.'
        });
      }

      await client.query(
        `
        UPDATE booking_ledger

        SET
  activity_type = 'Manual Restock',

  stock_status = 'Restocked',

  booking_status = 'Cancelled',

  moderator_earning = $1,

  credit = $1,

  debit = $2,

  expected_amount = $3,

  remarks = $4,

  timestamp = $5

WHERE reservationid = $6
        `,
      [
  adjustedOperatorEarning,

  refundAmount,

  retainedAmount,

  `Manual restock. Original payment: RM ${originalAmount.toFixed(
    2
  )}. Refund: RM ${refundAmount.toFixed(
    2
  )}. Amount retained: RM ${retainedAmount.toFixed(
    2
  )}.`,

  timestamp,

  reservationid
]
      );

    
      // 3. Book & Pay Log
    

      await client.query(
  `
  INSERT INTO
    book_and_pay_log (
      logtime,
      log,
      userid
    )

  VALUES (
    $1,
    $2,
    $3
  )
  `,
  [
    timestamp,

    `${requesterUsername} restocked reservation #${reservationid} (${reservation.propertyaddress}). Room/Package: ${roomPackage}. Stock Restocked. Original Payment: RM ${originalAmount.toFixed(
      2
    )} | Refund: RM ${refundAmount.toFixed(
      2
    )} | Amount Retained: RM ${retainedAmount.toFixed(
      2
    )}. Booking status changed to Cancelled.`,

    requesterId
  ]
);

    
      // 4. Simple Audit Trail.
     

     await client.query(
  `
  INSERT INTO audit_trail (
    entityid,
    timestamp,
    entitytype,
    actiontype,
    action,
    userid,
    username
  )

  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
  )
  `,
  [
    reservationid,
    timestamp,
    'Reservation',
    'PATCH',
    'Restock Reservation',
    requesterId,
    requesterUsername
  ]
);

      
     // 5. Existing booking alert.
try {
  await createBookingAlertNotification(
    client,
    reservationid,
    'Cancelled'
  );
} catch (notificationError) {
  console.error(
    'Restock notification skipped:',
    notificationError.message
  );
}


// Commit the Manual Restock first.
await client.query('COMMIT');


// =======================================================
// MANUAL RESTOCK REFUND EMAIL TO CUSTOMER
// =======================================================

if (
  reservation.rcemail &&
  refundAmount > 0
) {
  try {
    const customerName =
      `${reservation.rcfirstname || ''} ${reservation.rclastname || ''}`
        .trim() ||
      'Customer';

    const emailRoomPackage =
      roomPackage &&
      roomPackage !== 'N/A'
        ? roomPackage
        : 'Whole Property / Homestay';

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name:
            process.env.BREVO_SENDER_NAME ||
            'CAMS System',

          email:
            process.env.BREVO_SENDER_EMAIL,
        },

        to: [
          {
            email: reservation.rcemail,
            name: customerName,
          },
        ],

        subject:
          'Booking Cancelled and Refund Update',

        htmlContent: `
          <h2 style="margin: 0 0 16px; color: #111827;">
            Booking Cancelled and Refund Update
          </h2>

          <p style="font-size: 15px; color: #374151;">
            Dear ${customerName},
          </p>

          <p style="font-size: 15px; color: #374151;">
            Your booking has been cancelled and the refund has been recorded.
          </p>

          <div
            style="
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 16px 18px;
              border-radius: 8px;
              margin: 18px 0;
            "
          >
            <p style="margin: 0 0 8px;">
              <b>Property:</b>
              ${reservation.propertyaddress || 'N/A'}
            </p>

            <p style="margin: 0 0 8px;">
              <b>Room / Package:</b>
              ${emailRoomPackage}
            </p>

            <p style="margin: 0 0 8px;">
              <b>Refund Amount:</b>
              RM ${refundAmount.toFixed(2)}
            </p>

            <p style="margin: 0;">
              <b>Booking Status:</b>
              Cancelled
            </p>
          </div>

          <p style="font-size: 15px; color: #374151;">
  The refund amount above has been recorded for this booking.
  Please contact the property owner if you need further information
  regarding the refund arrangement.
</p>

          <p style="font-size: 15px; color: #374151;">
            Thank you,<br/>
            <b>SarawakAdventures</b>
          </p>
        `,
      },
      {
        headers: {
          'api-key':
            process.env.BREVO_API_KEY,

          'Content-Type':
            'application/json',
        },
      }
    );

    console.log(
      `Manual Restock refund email sent to ${reservation.rcemail}`
    );

  } catch (emailError) {
    console.error(
      'Manual Restock refund email failed:',
      emailError.response?.data ||
      emailError.message
    );
  }
}


// Clear any cached availability.
clearProductCache();



      // Existing waitlist function.
      if (
        typeof notifyWaitlistedUsers ===
        'function'
      ) {
        notifyWaitlistedUsers(
          reservation.propertyid,
          reservation.checkindatetime,
          reservation.checkoutdatetime
        ).catch((error) => {
          console.error(
            'Restock waitlist notification skipped:',
            error.message
          );
        });
      }

      return res.status(200).json({
        success: true,
        message:
          'Reservation restocked successfully.',

        reservation:
          updatedReservation,

        refundAmount:
          Number(
            refundAmount.toFixed(2)
          ),

        originalAmount:
          Number(
            originalAmount.toFixed(2)
          ),

        retainedAmount:
          Number(
            retainedAmount.toFixed(2)
          )
      });

    } catch (error) {
      if (client) {
        await client.query(
          'ROLLBACK'
        );
      }

      console.error(
        'Manual Restock error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Failed to restock reservation.',
        details:
          error.message
      });

    } finally {
      if (client) {
        client.release();
      }
    }
  }
);


// Remove reservation
app.delete('/removeReservation/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN'); // Start transaction for safe deletion

    // Check if the reservation actually exists first
    const checkResult = await client.query(
      `SELECT * FROM reservation WHERE reservationid = $1`,
      [reservationid]
    );

    if (checkResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reservation not found' });
    }

    const deletedReservation = checkResult.rows[0]; 
    const propertyid = deletedReservation.propertyid; 

    // SAFELY DELETE DEPENDENT RECORDS FIRST 
    await client.query(`DELETE FROM notifications WHERE reservationid = $1`, [reservationid]);

    // delete the reservation
    await client.query(
      `DELETE FROM reservation WHERE reservationid = $1`, 
      [reservationid]
    );

    // Safely Log the Action
    const safeUserId = creatorid || deletedReservation.userid;
    const safeUsername = creatorUsername || 'System';

    try {
        await client.query(
          `INSERT INTO book_and_pay_log 
           (logtime, log, userid)
           VALUES ($1, $2, $3)`,
          [
            new Date(),
            `Removed reservation #${reservationid} for property #${propertyid}`,
            safeUserId
          ]
        );
    } catch (logErr) {
        console.error('Non-fatal error inserting into log:', logErr.message);
    }

    try {
        await client.query (
          `INSERT INTO audit_trail (
             entityid, timestamp, entitytype, actiontype, action, userid, username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [reservationid, timestamp, "Reservation", "DELETE", "Remove Reservation", safeUserId, safeUsername]
        );
    } catch (auditErr) {
        console.error('Non-fatal error inserting into audit:', auditErr.message);
    }

    await client.query('COMMIT'); // Lock in all deletions




    // RESTOCK TRIGGER (Waitlist Notification)
    if (typeof notifyWaitlistedUsers === 'function') {
        notifyWaitlistedUsers(
            deletedReservation.propertyid, 
            deletedReservation.checkindatetime, 
            deletedReservation.checkoutdatetime
        ).catch(e => console.error("Waitlist notify error:", e.message));
    }

    res.status(200).json({ message: 'Reservation removed successfully' });
  } catch (err) {
    if (client) {
        await client.query('ROLLBACK');
    }
    console.error('Error deleting reservation:', err);
    res.status(500).json({ message: 'Internal Server Error', details: err.message });
  } finally {
    if (client) {
        client.release();
    }
  }
});
// Get Properties Of Particular Administrator For "Suggest"
app.get('/operatorProperties/:userid/:reservationid', async (req, res) => {
  const { userid, reservationid } = req.params;
  let client;

  if (!userid) {
    return res.status(400).json({ message: 'User ID of Operator is not found' });
  }

  try {
    client = await pool.connect();

    // Get the user's role and cluster to know which properties to show
    const userResult = await client.query('SELECT usergroup, clusterid FROM users WHERE userid = $1', [userid]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }
    const { usergroup, clusterid } = userResult.rows[0];

    // Get the Check-In and Check-Out dates to accurately check for overlaps
    const reservationResults = await client.query(
      `SELECT checkindatetime, checkoutdatetime
       FROM reservation 
       WHERE reservationid = $1
      `,
      [reservationid]
    );

    if (reservationResults.rows.length === 0) {
        return res.status(404).json({ message: 'Original reservation not found' });
    }

    const checkInDate = reservationResults.rows[0].checkindatetime;
    const checkOutDate = reservationResults.rows[0].checkoutdatetime;
    
    // Dynamic Query: Only block properties if they have ACTIVE overlapping bookings
    let queryText = `
       SELECT p.*, r.normalrate, r.weekendrate, r.specialeventrate, r.earlybirddiscountrate, r.lastminutediscountrate
       FROM properties p
       JOIN rate r ON p.rateid = r.rateid
       WHERE p.propertystatus = 'Available'
         AND NOT EXISTS (
           SELECT 1
           FROM reservation res
           WHERE res.propertyid = p.propertyid
             AND res.reservationstatus IN ('Pending', 'Accepted', 'Paid', 'Published')
             AND res.checkindatetime < $2 
             AND res.checkoutdatetime > $1
         )
    `;
    
    let queryParams = [checkInDate, checkOutDate];

    // If Administrator, show all available properties in their cluster. Otherwise, show their own.
    if (usergroup === 'Administrator' && clusterid) {
        queryText += ` AND p.clusterid = $3`;
        queryParams.push(clusterid);
    } else {
        queryText += ` AND p.userid = $3`;
        queryParams.push(userid);
    }

    const result = await client.query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No properties found for this Operator' });
    }

    const propertiesWithSeparatedImages = result.rows.map(property => ({
      ...property,
      images: property.propertyimage ? property.propertyimage.split(',') : [],
    }));

    res.status(200).json({
      status: 'success',
      message: 'Properties Retrieved Successfully',
      data: propertiesWithSeparatedImages,
    });
  } catch (err) {
    console.error('Error retrieving properties: ', err);
    res.status(500).json({
      message: 'An error occurred while retrieving properties',
      error: err.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});
// Get user information
app.get('/getUserInfo/:userid', async (req, res) => {
  const { userid } = req.params;
  let client;
  console.log(userid);

  try {
    client = await pool.connect();
    
    const result = await client.query(
  `SELECT 
    "userid",
    "username",
    "utitle",
    "ufirstname",
    "ulastname",
    "uemail",
    "uphoneno",
    "ucountry",
    "uzipcode",
    "ugender",
    "udob",
    "uimage"
  FROM "users"
  WHERE "userid" = $1`,
  [userid] 
);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User information not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting user information:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forget Password
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  let client;
  try {
    client = await pool.connect();

    // Check if the email exists in the database
    const userResult = await client.query(
      'SELECT userid, username FROM users WHERE uemail = $1', 
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const { userid, username } = userResult.rows[0];

    // Generate a new random password
    const newPassword = Math.random().toString(36).slice(-8);

    // Encrypt the new password
    const encryptedPassword = await bcrypt.hash(newPassword, saltRounds);

    await client.query(
      'UPDATE users SET password = $1 WHERE userid = $2',
      [encryptedPassword, userid]
    );

    // Email configuration (Brevo)
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: email,
            name: username,
          },
        ],
        subject: 'Hello Sarawak Password Reset',
        htmlContent: `
          <h1>Dear ${username}</h1>
          <p>You have requested a new temporary password. You may use this temporary password for your next login.</p>
          <h2 style="color: #4CAF50; font-size: 24px;">${newPassword}</h2>
          <p>Please use this password to log in and immediately change your password.</p>
          <p>If you did not request a password reset, please contact the administrator immediately.</p>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({ message: 'New password has been sent to your email' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  } finally {
    if (client) {
      client.release(); 
    }
  }
});

// Get User Details
app.get('/users/:userid', async (req, res) => {
  const { userid } = req.params;

  if (isNaN(userid)) {
    return res.status(400).json({ message: "Invalid userid" });
  }

  let client;
  try {
    client = await pool.connect();
    
    const query = {
      text: "SELECT * FROM users WHERE userid = $1",
      values: [userid]
    };
    
    const result = await client.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user data:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
});


// Get lightweight customer profile summary
app.get('/profile-summary/:userid', async (req, res) => {
  const { userid } = req.params;

  if (!userid || isNaN(userid)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid userid'
    });
  }

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM reservation r
          WHERE r.userid = $1
            AND LOWER(TRIM(COALESCE(r.reservationstatus, ''))) NOT IN ('rejected', 'deleted', 'removed')
        ) AS booking_count,

        (
          SELECT COUNT(*)::int
          FROM reviews rev
          WHERE rev.userid = $1
            AND (rev.is_deleted = false OR rev.is_deleted IS NULL)
        ) AS review_count
      `,
      [userid]
    );

    return res.status(200).json({
      success: true,
      bookingCount: result.rows[0]?.booking_count || 0,
      reviewCount: result.rows[0]?.review_count || 0
    });

  } catch (err) {
    console.error('Error fetching profile summary:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Update user profile
app.put('/users/updateProfile/:userid', async (req, res) => {
  const { userid } = req.params;
  const { username, password, ufirstname, ulastname, udob, utitle, ugender, uemail, uphoneno, ucountry, uzipcode, paypalid } = req.body;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();

    let query;
    let values;

    // Only update password if frontend sends a real password value
    if (password && String(password).trim() !== '') {
      const hashedPassword = await bcrypt.hash(String(password), saltRounds);

      query = `
        UPDATE users 
        SET 
          username = $1, 
          password = $2, 
          ufirstname = $3, 
          ulastname = $4, 
          udob = $5,
          utitle = $6,
          ugender = $7,
          uemail = $8, 
          uphoneno = $9, 
          ucountry = $10, 
          uzipcode = $11,
          paypalid = $12
        WHERE userid = $13
        RETURNING userid;
      `;

      values = [
        username,
        hashedPassword,
        ufirstname,
        ulastname,
        udob,
        utitle,
        ugender,
        uemail,
        uphoneno,
        ucountry,
        uzipcode,
        paypalid,
        userid
      ];
    } else {
      query = `
        UPDATE users 
        SET 
          username = $1, 
          ufirstname = $2, 
          ulastname = $3, 
          udob = $4,
          utitle = $5,
          ugender = $6,
          uemail = $7, 
          uphoneno = $8, 
          ucountry = $9, 
          uzipcode = $10,
          paypalid = $11
        WHERE userid = $12
        RETURNING userid;
      `;

      values = [
        username,
        ufirstname,
        ulastname,
        udob,
        utitle,
        ugender,
        uemail,
        uphoneno,
        ucountry,
        uzipcode,
        paypalid,
        userid
      ];
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or no changes made.', success: false });
    }

const safeCreatorId = parseInt(creatorid) || parseInt(userid);

let safeCreatorUsername = creatorUsername;

if (!safeCreatorUsername || safeCreatorUsername === 'null' || safeCreatorUsername === 'undefined') {
  safeCreatorUsername = username || 'System';
}

await client.query(
  `INSERT INTO audit_trail (
      entityid, timestamp, entitytype, actiontype, action, userid, username
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    userid,
    timestamp,
    "Users",
    "PUT",
    "Update Profile",
    safeCreatorId,
    safeCreatorUsername
  ]
);
    res.status(200).json({ message: 'Profile updated successfully.', success: true });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ message: 'An error occurred while updating the profile.', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Upload user avatar to Firebase Storage
app.post('/users/uploadAvatar/:userid', upload.single('avatar'), async (req, res) => {
  const { userid } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  if (!userid || isNaN(userid)) {
    return res.status(400).json({ message: 'Invalid userid' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  let client;

  try {
    client = await pool.connect();

    const userCheck = await client.query(
      'SELECT userid FROM users WHERE userid = $1',
      [userid]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resizedImageBuffer = await sharp(req.file.buffer)
      .resize({
        width: 400,
        height: 400,
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    const imageUrl = await uploadBufferToFirebase(
      resizedImageBuffer,
      'user-avatars',
      req.file.originalname,
      'image/jpeg'
    );

    const result = await client.query(
      `UPDATE users SET uimage = $1 WHERE userid = $2 RETURNING userid, uimage`,
      [imageUrl, userid]
    );

    await client.query(
      `INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, "Users", "POST", "Upload Avatar", creatorid, creatorUsername]
    );

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      imageUrl,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error uploading avatar:', err.message);
    return res.status(500).json({ message: `Error uploading avatar: ${err.message}` });
  } finally {
    if (client) {
      client.release();
    }
  }
});


app.post('/reviews', async (req, res) => {
    // Catch the new category scores from the frontend 
    const {
        userid,
        propertyid,
        review,
        rating,
        location_score,
        cleanliness_score,
        value_score,
        facilities_score,
        service_score
    } = req.body;

    const { creatorUsername } = req.query;
    const reviewdate = new Date();

    const filteredReview = filterReviewText(review);

    if (!userid || !propertyid || !filteredReview || !rating) {
        return res.status(400).json({
            message: 'Missing required fields: userid, propertyid, review, or rating'
        });
    }

    let client;
    try {
        client = await pool.connect();
        
        // First check if the user is a Customer
        const userCheckQuery = {
            text: 'SELECT usergroup FROM users WHERE userid = $1',
            values: [userid]
        };
        
        const userResult = await client.query(userCheckQuery);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Please login first' });
        }
        
        if (userResult.rows[0].usergroup !== 'Customer') {
            return res.status(403).json({ message: 'Please login first' });
        }

        // Check if user has already submitted a review for this property
        const existingReviewQuery = {
            text: 'SELECT reviewid FROM reviews WHERE userid = $1 AND propertyid = $2',
            values: [userid, propertyid]
        };
        
        const existingReviewResult = await client.query(existingReviewQuery);
        
        if (existingReviewResult.rows.length > 0) {
            return res.status(409).json({ message: 'You have already submitted a review for this property' });
        }

        // Begin transaction
        await client.query('BEGIN');

        // Insert the review WITH the new rating and sub-scores. is_deleted will default to false.
const insertReviewQuery = {
    text: `INSERT INTO reviews (userid, propertyid, review, reviewdate, rating, location_score, cleanliness_score, value_score, facilities_score, service_score) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING reviewid;`,
    values: [
        userid,
        propertyid,
        filteredReview,
        reviewdate,
        rating,
        location_score || 0,
        cleanliness_score || 0,
        value_score || 0,
        facilities_score || 0,
        service_score || 0
    ]
};;
        
        const reviewResult = await client.query(insertReviewQuery);
        
        // Update the property rating
        const propertyQuery = {
            text: 'SELECT rating, ratingno FROM properties WHERE propertyid = $1',
            values: [propertyid]
        };
        
        const propertyResult = await client.query(propertyQuery);
        
        if (propertyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Property not found' });
        }
        
        const currentProperty = propertyResult.rows[0];
        let newRatingNo = currentProperty.ratingno ? currentProperty.ratingno + 1 : 1;
        let currentTotalRating = currentProperty.rating ? currentProperty.rating * currentProperty.ratingno : 0;
        let newTotalRating = currentTotalRating + parseFloat(rating);
        let newAverageRating = newTotalRating / newRatingNo;
        
        // Update the property with the new average rating
        const updatePropertyQuery = {
            text: 'UPDATE properties SET rating = $1, ratingno = $2 WHERE propertyid = $3',
            values: [newAverageRating, newRatingNo, propertyid]
        };
        
        await client.query(updatePropertyQuery);
        
        // Commit transaction
        await client.query('COMMIT');

        // Send email notification to property owner after review is submitted
        const ownerResult = await client.query(
          `SELECT 
              p.propertyaddress,
              u.uemail,
              u.utitle,
              u.ulastname
          FROM properties p
          JOIN users u ON p.userid = u.userid
          WHERE p.propertyid = $1`,
          [propertyid]
        );

        if (ownerResult.rows.length > 0) {
          const owner = ownerResult.rows[0];

          axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
              sender: {
                name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                email: process.env.BREVO_SENDER_EMAIL,
              },
              to: [
                {
                  email: owner.uemail,
                  name: `${owner.utitle || ''} ${owner.ulastname || ''}`.trim() || 'Property Owner',
                },
              ],
              subject: 'New Review Received',
              htmlContent: `
                <h1><b>Dear ${owner.utitle || ''} ${owner.ulastname || ''},</b></h1>
                <hr/>

                <p>A customer has submitted a new review for your property:</p>

                <p><b>Property:</b> ${owner.propertyaddress}</p>
                <p><b>Overall Rating:</b> ${rating} / 5</p>
                <p><b>Location:</b> ${location_score}</p>
                <p><b>Cleanliness:</b> ${cleanliness_score}</p>
                <p><b>Value:</b> ${value_score}</p>
                <p><b>Facilities:</b> ${facilities_score}</p>
                <p><b>Service:</b> ${service_score}</p>
<p><b>Review:</b> ${filteredReview}</p>

                <p>You may log in to view the review and decide whether to write a reply.</p>

                <div style="margin: 10px 0;">
                  <a href="https://sarawakadventures.com/login" 
                    style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px;">
                    Login
                  </a>
                </div>
              `,
            },
            {
              headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
              },
            }
          ).catch(err => {
            console.error("Review notification email failed:", err.response?.data || err.message);
          });
        }

        await client.query (
          `INSERT INTO audit_trail (
              entityid, timestamp, entitytype, actiontype, action, userid, username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [propertyid, reviewdate, "Properties", "POST", "Review Property", userid, creatorUsername]
        );
        
        res.status(201).json({ 
            message: 'Review added successfully', 
            reviewid: reviewResult.rows[0].reviewid,
            newRating: newAverageRating
        });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (client) {
            client.release(); 
        }
    }
});

//  GET REVIEWS FOR A PROPERTY (Customer View - Property Details)
app.get('/reviews/:propertyid', async (req, res) => {
    const propertyid = req.params.propertyid;
    
    if (!propertyid) {
        return res.status(400).json({ message: 'Property ID is required' });
    }

    let client;
    try {
        client = await pool.connect();
        
        const reviewsQuery = {
            text: `
                SELECT r.reviewid, r.review, r.reviewdate, r.rating, r.location_score, r.cleanliness_score, r.value_score, r.facilities_score, r.service_score,
                       r.owner_reply, r.reply_date, 
                       u.userid, u.username, u.uimage as avatar, p.propertyid, p.rating as property_rating, p.ratingno,
                       EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.timestamp)) as years_on_platform
                FROM reviews r
                JOIN users u ON r.userid = u.userid
                JOIN properties p ON r.propertyid = p.propertyid
                WHERE r.propertyid = $1 AND (r.is_deleted = false OR r.is_deleted IS NULL)
                ORDER BY r.reviewdate DESC
            `,
            values: [propertyid]
        };
        
        const reviewsResult = await client.query(reviewsQuery);
        
        // If no reviews, get property data directly
        let propertyData;
        if (reviewsResult.rows.length === 0) {
            const propertyQuery = {
                text: 'SELECT propertyid, rating, ratingno FROM properties WHERE propertyid = $1',
                values: [propertyid]
            };
            const propertyResult = await client.query(propertyQuery);
            
            if (propertyResult.rows.length === 0) {
                return res.status(404).json({ message: 'Property not found' });
            }
            
            propertyData = {
                 propertyid: propertyResult.rows[0].propertyid,
                    rating: 0,
                    ratingno: 0
            };
       } else {
    const activeRatings = reviewsResult.rows
        .map(row => parseFloat(row.rating))
        .filter(rating => Number.isFinite(rating));

    const ratingno = activeRatings.length;
    const averageRating = ratingno > 0
        ? activeRatings.reduce((sum, rating) => sum + rating, 0) / ratingno
        : 0;

    propertyData = {
        propertyid: reviewsResult.rows[0].propertyid,
        rating: Number(averageRating.toFixed(2)),
        ratingno
    };
}
        
        // Format reviews for frontend
        const reviews = reviewsResult.rows.map(row => {
            const reviewDate = new Date(row.reviewdate);
            const now = new Date();
            
            // Calculate relative time for datePosted
            let datePosted;
            const diffTime = Math.abs(now - reviewDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 7) {
                datePosted = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                datePosted = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
            } else if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                datePosted = `${months} ${months === 1 ? 'month' : 'months'} ago`;
            } else {
                const years = Math.floor(diffDays / 365);
                datePosted = `${years} ${years === 1 ? 'year' : 'years'} ago`;
            }
            
            return {
                id: row.reviewid,
                name: row.username,
                avatar: row.avatar || null, 
                yearsOnPlatform: Math.floor(row.years_on_platform) || 0,
                isNew: row.years_on_platform < 1,
                datePosted: datePosted,
                comment: row.review,
                rating: row.rating,
                location_score: row.location_score,
                cleanliness_score: row.cleanliness_score,
                value_score: row.value_score,
                facilities_score: row.facilities_score,
                service_score: row.service_score,
                owner_reply: row.owner_reply, 
                reply_date: row.reply_date 
            };
        });
        
        res.status(200).json({
            reviews: reviews,
            property: propertyData
        });
        
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

//  GET USER REVIEWS (Customer Profile)
app.get('/user-reviews/:userid', async (req, res) => {
    const userid = req.params.userid;
    
    if (!userid) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    let client;
    try {
        client = await pool.connect();
        
        // ADDED rev.owner_reply and rev.reply_date
        const userReviewsQuery = {
            text: `
                SELECT rev.reviewid, rev.review, rev.reviewdate, rev.rating AS review_rating, 
                       rev.location_score, rev.cleanliness_score, rev.value_score, rev.facilities_score, rev.service_score,
                       rev.owner_reply, rev.reply_date, 
                       p.*,
                       rt.normalrate, rt.weekendrate, rt.specialeventrate, rt.earlybirddiscountrate, rt.lastminutediscountrate,
                       c.categoryname,
                       cl.clustername,
                       u.username, u.uimage
                FROM reviews rev
                JOIN properties p ON rev.propertyid = p.propertyid
                LEFT JOIN rate rt ON p.rateid = rt.rateid
                LEFT JOIN categories c ON p.categoryid = c.categoryid
                LEFT JOIN clusters cl ON p.clusterid = cl.clusterid
                LEFT JOIN users u ON p.userid = u.userid
                WHERE rev.userid = $1 AND (rev.is_deleted = false OR rev.is_deleted IS NULL)
                ORDER BY rev.reviewdate DESC
            `,
            values: [userid]
        };
        
        const result = await client.query(userReviewsQuery);
        
        const formattedReviews = result.rows.map(row => {
            const propertyImageArray = row.propertyimage ? row.propertyimage.split(',') : [];

            const fullPropertyData = {
                ...row,
                propertyimage: propertyImageArray
            };

            return {
                id: row.reviewid,
                propertyId: row.propertyid,
                propertyName: row.propertyaddress, 
                propertyImage: propertyImageArray, 
                fullPropertyDetails: fullPropertyData, 
                datePosted: new Date(row.reviewdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                rawDate: row.reviewdate,
                comment: row.review,
                rating: row.review_rating,
                location_score: row.location_score || row.review_rating,
                cleanliness_score: row.cleanliness_score || row.review_rating,
                value_score: row.value_score || row.review_rating,
                facilities_score: row.facilities_score || row.review_rating,
                service_score: row.service_score || row.review_rating,
                owner_reply: row.owner_reply, 
                reply_date: row.reply_date 
            };
        });
        
        res.status(200).json(formattedReviews);
        
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// DELETE 
app.delete('/reviews/:reviewid', async (req, res) => {
  const reviewid = req.params.reviewid;

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const updateQuery = {
      text: `
        UPDATE reviews
        SET is_deleted = true
        WHERE reviewid = $1
        RETURNING propertyid
      `,
      values: [reviewid]
    };

    const result = await client.query(updateQuery);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Review not found' });
    }

    const propertyid = result.rows[0].propertyid;

    const ratingResult = await client.query(
      `
      SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
        COUNT(*)::int AS rating_count
      FROM reviews
      WHERE propertyid = $1
        AND (is_deleted = false OR is_deleted IS NULL)
      `,
      [propertyid]
    );

    const averageRating = Number(ratingResult.rows[0].average_rating || 0);
    const ratingCount = Number(ratingResult.rows[0].rating_count || 0);

    await client.query(
      `
      UPDATE properties
      SET rating = $1,
          ratingno = $2
      WHERE propertyid = $3
      `,
      [averageRating, ratingCount, propertyid]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Review deleted successfully',
      propertyid,
      rating: averageRating,
      ratingno: ratingCount
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal Server Error' });

  } finally {
    if (client) {
      client.release();
    }
  }
});


// ADMIN: GET ALL CUSTOMER REVIEWS
app.get('/admin/customer-reviews', async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const currentUserId = req.user?.userid;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.'
      });
    }

    const userResult = await client.query(
      `
      SELECT userid, username, usergroup
      FROM users
      WHERE userid = $1
      `,
      [currentUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const currentUser = userResult.rows[0];
    const usergroup = String(currentUser.usergroup || '').toLowerCase();

    if (!['administrator', 'admin', 'owner', 'moderator'].includes(usergroup)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view customer reviews.'
      });
    }

    let whereClause = `
      WHERE (r.is_deleted = false OR r.is_deleted IS NULL)
    `;

    const values = [];

    // Administrator can see all reviews.
    // Moderator/Owner only see reviews for their own properties.
    if (usergroup === 'moderator' || usergroup === 'owner') {
      values.push(currentUserId);
      whereClause += ` AND p.userid = $1`;
    }

    const reviewsQuery = `
      SELECT
        r.reviewid,
        r.userid AS reviewer_userid,
        r.propertyid,
        r.review,
        r.reviewdate,
        r.rating,
        r.location_score,
        r.cleanliness_score,
        r.value_score,
        r.facilities_score,
        r.service_score,
        r.owner_reply,
        r.reply_date,

        reviewer.username AS reviewer_name,
        reviewer.uemail AS reviewer_email,
        reviewer.uimage AS reviewer_image,

        p.propertyaddress,
        p.propertyimage,
        p.propertystatus,

        owner.userid AS owner_userid,
        owner.username AS owner_username,
        owner.uemail AS owner_email,

        c.categoryname,
        cl.clustername

      FROM reviews r
      JOIN users reviewer ON r.userid = reviewer.userid
      JOIN properties p ON r.propertyid = p.propertyid
      JOIN users owner ON p.userid = owner.userid
      LEFT JOIN categories c ON p.categoryid = c.categoryid
      LEFT JOIN clusters cl ON p.clusterid = cl.clusterid
      ${whereClause}
      ORDER BY r.reviewdate DESC, r.reviewid DESC
    `;

    const result = await client.query(reviewsQuery, values);

    const reviews = result.rows.map(row => ({
      ...row,
      propertyimage: row.propertyimage ? row.propertyimage.split(',') : []
    }));

    const summary = {
      totalReviews: reviews.length,
      repliedReviews: reviews.filter(r => r.owner_reply && String(r.owner_reply).trim() !== '').length,
      pendingReplies: reviews.filter(r => !r.owner_reply || String(r.owner_reply).trim() === '').length,
      averageRating: reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
              reviews.length
            ).toFixed(2)
          )
        : 0
    };

    return res.status(200).json({
      success: true,
      reviews,
      summary
    });

  } catch (err) {
    console.error('Error fetching admin customer reviews:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

//  OWNER REPLY ROUTE
app.put('/reviews/:reviewid/reply', async (req, res) => {
    const reviewid = req.params.reviewid;
    const { owner_reply } = req.body;
    
    try {
        const updateQuery = {
            text: 'UPDATE reviews SET owner_reply = $1, reply_date = NOW() WHERE reviewid = $2 RETURNING *',
            values: [owner_reply, reviewid]
        };
        const result = await pool.query(updateQuery);
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Review not found' });

        if (owner_reply) {
            const emailResult = await pool.query(
                `SELECT 
                    r.review,
                    r.owner_reply,
                    p.propertyaddress,
                    u.uemail,
                    u.username
                 FROM reviews r
                 JOIN properties p ON r.propertyid = p.propertyid
                 JOIN users u ON r.userid = u.userid
                 WHERE r.reviewid = $1`,
                [reviewid]
            );

            if (emailResult.rows.length > 0) {
                const data = emailResult.rows[0];

                axios.post(
                    'https://api.brevo.com/v3/smtp/email',
                    {
                        sender: {
                            name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                            email: process.env.BREVO_SENDER_EMAIL,
                        },
                        to: [
                            {
                                email: data.uemail,
                                name: data.username || 'Customer',
                            },
                        ],
                        subject: 'Your Review Has Received a Reply',
                        htmlContent: `
                            <h1><b>Dear ${data.username || 'Customer'},</b></h1>
                            <hr/>

                            <p>The property owner has replied to your review:</p>

                            <p><b>Property:</b> ${data.propertyaddress}</p>

                            <p><b>Your Review:</b></p>
                            <p>${data.review}</p>

                            <p><b>Owner Reply:</b></p>
                            <p>${data.owner_reply}</p>

                            <p>You may log in to view the reply.</p>

                            <div style="margin: 10px 0;">
                                <a href="https://sarawakadventures.com/login"
                                   style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px;">
                                   Login
                                </a>
                            </div>
                        `,
                    },
                    {
                        headers: {
                            'api-key': process.env.BREVO_API_KEY,
                            'Content-Type': 'application/json',
                        },
                    }
                ).catch(err => {
                    console.error("Reply email failed:", err.response?.data || err.message);
                });
            }
        }        

        res.status(200).json({ message: 'Reply posted successfully', review: result.rows[0] });
    } catch (error) {
        console.error('Error posting reply:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//  GET OWNER REVIEWS (Fetch all reviews for properties owned by this user)
app.get('/owner-reviews/:ownerid', async (req, res) => {
    const ownerid = req.params.ownerid;
    try {
        const query = {
            text: `
                SELECT r.reviewid, r.review, r.reviewdate, r.rating, 
                       r.location_score, r.cleanliness_score, r.value_score, r.facilities_score, r.service_score,
                       r.owner_reply, r.reply_date, r.is_deleted,
                       u.username as reviewer_name, u.uimage as reviewer_image,
                       p.propertyaddress
                FROM reviews r
                JOIN properties p ON r.propertyid = p.propertyid
                JOIN users u ON r.userid = u.userid
                WHERE p.userid = $1 AND (r.is_deleted = false OR r.is_deleted IS NULL)
                ORDER BY r.reviewdate DESC
            `,
            values: [ownerid]
        };
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching owner reviews:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Assign role to user
app.post('/users/assignRole/:userid/:role', async (req, res) => {
  const { userid, role } = req.params;
  const { creatorid, creatorUsername } = req.query;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();
    
    const validRoles = ['Customer', 'Moderator', 'Administrator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role', success: false });
    }

    await client.query(
      `UPDATE users SET usergroup = $1 WHERE userid = $2`,
      [role, userid]
    );

    await client.query(
      `INSERT INTO audit_trail (
         entityid, timestamp, entitytype, actiontype, action, userid, username
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userid, timestamp, 'Users', 'POST', 'Assign User Role', creatorid, creatorUsername]
    );

    res.status(200).json({ message: 'Role assigned successfully', success: true });
  } catch (err) {
    console.error('Error assigning role:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) client.release();
  }
});

// Audit Trails
app.get("/auditTrails", async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({ message: "Missing userid parameter" });
  }

  let client;

  try {
    client = await pool.connect();

    const ownerResult = await client.query(
      `SELECT usergroup
       FROM users
       WHERE userid = $1
       `,
      [userid]
    );

    if (ownerResult.rows.length === 0) {
       return res.status(200).json({ auditTrails: [] }); // FIXED: Safe Return
    }

    const usergroup = ownerResult.rows[0].usergroup;

    let result;

 // Allow Owner, Administrator and Moderator to see ALL audit trails
if (
  usergroup === 'Owner' ||
  usergroup === 'Administrator' ||
  usergroup === 'Moderator'
) {
  result = await client.query(
    `
    SELECT 
  audittrailid,
  entityid,

  TO_CHAR(
    timestamp,
    'YYYY-MM-DD HH24:MI:SS'
  ) AS timestamp,

  entitytype,
  actiontype,
  action,
  userid,
  username
FROM audit_trail
ORDER BY audit_trail.timestamp DESC
    `
  );
} else {
      const clusterResult = await client.query(
        `SELECT DISTINCT clusterid FROM users WHERE userid = $1`,
        [userid]
      );
  
      if (clusterResult.rows.length === 0) {
        return res.status(200).json({ auditTrails: [] });
      }
  
      const clusterids = clusterResult.rows.map((row) => row.clusterid);
  
      result = await client.query(
        `
        SELECT 
          a.audittrailid, a.entityid, TO_CHAR(
  a.timestamp,
  'YYYY-MM-DD HH24:MI:SS'
) AS timestamp, a.entitytype, a.actiontype, a.action, a.userid, a.username
        FROM audit_trail a 
        JOIN users u
        ON a.userid = u.userid
        WHERE u.clusterid = ANY($1)
        ORDER BY a.timestamp DESC;
        `,
        [clusterids]
      );
    }

  

    // Never throw a 404 error if table is empty. Return empty array instead.
   res.status(200).json({
  auditTrails: result.rows || [],
});
  } catch (err) {
    console.error("Error fetching audit trail data:", err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch Suggested Reservation
app.get('/suggestedReservations/:userid', async (req, res) => {
  const { userid } = req.params;
  
  let client;
  
  try {
      client = await pool.connect();
  
      const userEmail = await pool.query(
        `
          SELECT 
            uemail
          FROM users
          WHERE userid = $1;
        `,
        [userid]
      );
  
      const uemail = userEmail.rows[0].uemail;
  
      const result = await client.query(
        `
          SELECT r.*, p.*
          FROM reservation r
          JOIN properties p ON r.propertyid = p.propertyid
          WHERE $1 = ANY (string_to_array(suggestedemail, ','))
          AND reservationstatus = 'Suggested'
        `,
        [uemail]
      );

      // Process the properties to handle images like in /product endpoint
      const processedReservations = result.rows.map(reservation => {
        console.log(`Reservation ID ${reservation.reservationid} - Original image data:`, 
                    reservation.propertyimage ? reservation.propertyimage.substring(0, 50) + '...' : 'No image');
        
        const processedReservation = {
          ...reservation,
          propertyimage: reservation.propertyimage ? reservation.propertyimage.split(',') : []
        };
        
        console.log(`Reservation ID ${reservation.reservationid} - Processed image array length:`, 
                    processedReservation.propertyimage.length);
        
        return processedReservation;
      });
      
      if (processedReservations.length > 0) {
        console.log('Sample processed reservation object:');
        const sampleReservation = {...processedReservations[0]};
        if (sampleReservation.propertyimage && sampleReservation.propertyimage.length > 0) {
          sampleReservation.propertyimage = [`${sampleReservation.propertyimage[0].substring(0, 50)}... (truncated)`, 
                                           `and ${sampleReservation.propertyimage.length - 1} more images`];
        }
        console.log(JSON.stringify(sampleReservation, null, 2));
      }
      
      res.json(processedReservations);
  } catch (err) {
    console.error('Error fetching suggested reservations:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Fetch Published Reservation
app.get('/publishedReservations/:userid', async (req, res) => {
  const { userid } = req.params;
  
  let client;
  
  try {
      client = await pool.connect();
  
      const userEmail = await pool.query(
        `
          SELECT 
            uemail
          FROM users
          WHERE userid = $1;
        `,
        [userid]
      );
  
     const uemail = userEmail.rows[0].uemail;
  
     const result = await client.query(
      `
         SELECT r.*, p.*
         FROM reservation r
         JOIN properties p ON r.propertyid = p.propertyid
         WHERE $1 = ANY (string_to_array(suggestedemail, ','))
         AND reservationstatus = 'Published'
       `,
       [uemail]
     );
      
     res.json(result.rows);
  } catch (err) {
    console.error('Error fetching published reservations:', err);
    res.status(500).json({ message: 'Server error', success: false });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET all clusters
app.get('/clusters', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clusters ORDER BY clustername');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clusters' });
  }
});

// GET unique cluster names
app.get('/clusters/names', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT clustername FROM clusters ORDER BY clustername');
    res.json(result.rows.map(row => row.clustername));
  } catch (error) {
    console.error('Error fetching cluster names:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cluster names' });
  }
});

// POST create a new cluster
app.post('/clusters', async (req, res) => {
  const { clusterName, clusterState, clusterProvince } = req.body;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  
  if (!clusterName || !clusterState || !clusterProvince) {
    return res.status(400).json({ 
      success: false, 
      message: 'Cluster name, state, and province are required' 
    });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO clusters (clustername, clusterstate, clusterprovince, timestamp) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [clusterName, clusterState, clusterProvince, timestamp]
    );
    
    res.json({ 
      success: true, 
      message: 'Cluster created successfully', 
      cluster: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating cluster:', error);
    res.status(500).json({ success: false, message: 'Failed to create cluster' });
  }
});

// PUT update a cluster
app.put('/clusters/:id', async (req, res) => {
  const { id } = req.params;
  const { clusterName, clusterState, clusterProvince } = req.body;
  
  if (!clusterName || !clusterState || !clusterProvince) {
    return res.status(400).json({ 
      success: false, 
      message: 'Cluster name, state, and province are required' 
    });
  }
  
  try {
    const result = await pool.query(
      `UPDATE clusters 
       SET clustername = $1, clusterstate = $2, clusterprovince = $3 
       WHERE clusterid = $4 
       RETURNING *`,
      [clusterName, clusterState, clusterProvince, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Cluster updated successfully', 
      cluster: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating cluster:', error);
    res.status(500).json({ success: false, message: 'Failed to update cluster' });
  }
});

// DELETE a cluster
app.delete('/clusters/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if there are any properties associated with this cluster
    const propertyCheck = await pool.query(
      'SELECT COUNT(*) FROM properties WHERE clusterid = $1',
      [id]
    );
    
    if (parseInt(propertyCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cluster because it has associated properties'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM clusters WHERE clusterid = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }
    
    res.json({ success: true, message: 'Cluster deleted successfully' });
  } catch (error) {
    console.error('Error deleting cluster:', error);
    res.status(500).json({ success: false, message: 'Failed to delete cluster' });
  }
});

// GET all categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY categoryname');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Send Payment Successful Message To Operator and Customer
app.post('/payment_success/:reservationid', async (req, res) => {
  const { reservationid } = req.params;
  const { creatorid, creatorUsername } = req.query;

  // Expected values: "deposit", "balance", "full"
  const requestedPaymentType = String(
    req.body?.paymentType || req.query?.paymentType || ''
  )
    .trim()
    .toLowerCase();

  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `
      SELECT 
        rc.rclastname, 
        rc.rcemail, 
        rc.rctitle, 
        r.checkindatetime, 
        r.checkoutdatetime, 
        r.reservationblocktime, 
        r.totalprice,
        r.propertyid,
        r.request,
        r.reservationstatus,
        r.downpaymentamount,
        p.propertyaddress,
        p.userid AS owner_userid,
        u.ulastname,
        u.uemail,
        u.utitle
      FROM reservation_customer_details rc 
      JOIN reservation r ON rc.rcid = r.rcid 
      JOIN properties p ON r.propertyid = p.propertyid 
      JOIN users u ON p.userid = u.userid
      WHERE r.reservationid = $1
      `,
      [reservationid]
    );

    if (result.rows.length === 0) {
      console.log('No matching reservation found.');
      return res.status(404).json({
        message: 'Reservation customer or property not found',
      });
    }

    const data = result.rows[0];

    const {
      rclastname: customerLastName,
      rcemail: customerEmail,
      rctitle: customerTitle,
      checkindatetime: reservationCheckInDate,
      checkoutdatetime: reservationCheckOutDate,
      reservationblocktime: paymentDueDate,
      propertyaddress: reservationProperty,
      ulastname: operatorLastName,
      uemail: operatorEmail,
      utitle: operatorTitle,
      totalprice,
      downpaymentamount,
      reservationstatus,
      propertyid,
      owner_userid,
      request,
    } = data;

    const formatCurrency = (amount) => {
      const value = Number(amount || 0);
      return `RM ${value.toFixed(2)}`;
    };

    const formatDateForEmail = (dateValue) => {
      if (!dateValue) return '-';

      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return String(dateValue);
      }

      return date.toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuching',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    };

    const formatBookingDateTimeForEmail = (dateValue, type = 'checkin') => {
      if (!dateValue) return '-';

      const raw = String(dateValue);

      let year;
      let month;
      let day;

      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        [year, month, day] = raw.slice(0, 10).split('-').map(Number);
      } else {
        const parsed = new Date(dateValue);

        if (Number.isNaN(parsed.getTime())) {
          return String(dateValue);
        }

        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }

      const date = new Date(year, month - 1, day);

      const formattedDate = date.toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuching',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });

      const timeText = type === 'checkout' ? '12:00 pm' : '03:00 pm';

      return `${formattedDate}, ${timeText}`;
    };

    const previousStatus = String(reservationstatus || '').trim().toLowerCase();
    const totalAmountForLog = parseFloat(totalprice || 0);
    const depositAmountForLog = parseFloat(downpaymentamount || 0);
    const balanceAmountForLog = Math.max(
      0,
      totalAmountForLog - depositAmountForLog
    );

    // NEW: Payment type detection.
    // Priority:
    // 1. Trust paymentType sent from Flutter.
    // 2. Fallback to old status-based logic only if paymentType is missing.
    let paymentType = requestedPaymentType;

    if (!['deposit', 'balance', 'full'].includes(paymentType)) {
      if (previousStatus === 'partially paid') {
        paymentType = 'balance';
      } else if (
        depositAmountForLog > 0 &&
        depositAmountForLog < totalAmountForLog
      ) {
        paymentType = 'deposit';
      } else {
        paymentType = 'full';
      }
    }

    const isDepositPayment = paymentType === 'deposit';
    const isBalancePayment = paymentType === 'balance';
    const isInstantFullPayment = paymentType === 'full';

    console.log(
      `Payment success reservation #${reservationid}: paymentType=${paymentType}, previousStatus=${previousStatus}`
    );

const customerEmailSubject = isDepositPayment
  ? 'Your Deposit Payment Was Successful'
  : isBalancePayment
    ? 'Your Balance Payment Was Successful'
    : 'Your Payment Was Successful';

const bookedRoomPackageForEmail = formatRoomPackageForLog(request);

const customerRoomPackagePaymentLine =
  bookedRoomPackageForEmail && bookedRoomPackageForEmail !== 'N/A'
    ? `<p><b>Room / Package:</b> ${bookedRoomPackageForEmail}</p>`
    : `<p><b>Room / Package:</b> Whole Property / Homestay</p>`;

const roomPackagePaymentLine =
  bookedRoomPackageForEmail && bookedRoomPackageForEmail !== 'N/A'
    ? `<p><b>Room / Package Paid:</b> ${bookedRoomPackageForEmail}</p>`
    : `<p><b>Room / Package Paid:</b> Whole Property / Homestay</p>`;

const customerPaymentMessage = isDepositPayment
  ? `
      <p>Thank you for your deposit payment!</p>
      <p>Your booking for <b>${reservationProperty}</b> from <b>${formatBookingDateTimeForEmail(reservationCheckInDate, 'checkin')}</b> to <b>${formatBookingDateTimeForEmail(reservationCheckOutDate, 'checkout')}</b> has been <span style="color: #d97706; font-weight: bold;">reserved</span>.</p>
      ${customerRoomPackagePaymentLine}

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><b>Deposit Paid:</b> ${formatCurrency(depositAmountForLog)}</p>
        <p style="margin: 0 0 8px;"><b>Balance Remaining:</b> ${formatCurrency(balanceAmountForLog)}</p>
        <p style="margin: 0;"><b>Payment Deadline:</b> ${formatDateForEmail(paymentDueDate)}</p>
      </div>

      <p>Please remember to pay the remaining balance before the payment deadline to secure your booking.</p>
    `
  : isBalancePayment
    ? `
        <p>Thank you for completing your balance payment!</p>
        <p>Your booking for <b>${reservationProperty}</b> from <b>${formatBookingDateTimeForEmail(reservationCheckInDate, 'checkin')}</b> to <b>${formatBookingDateTimeForEmail(reservationCheckOutDate, 'checkout')}</b> has been <span style="color: green; font-weight: bold;">fully confirmed</span>.</p>
        ${customerRoomPackagePaymentLine}

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><b>Deposit Paid:</b> ${formatCurrency(depositAmountForLog)}</p>
          <p style="margin: 0 0 8px;"><b>Balance Paid:</b> ${formatCurrency(balanceAmountForLog)}</p>
          <p style="margin: 0;"><b>Total Paid:</b> ${formatCurrency(totalAmountForLog)}</p>
        </div>

        <p>No further payment is required. We look forward to your stay.</p>
      `
    : `
        <p>Thank you for your full payment!</p>
        <p>Your booking for <b>${reservationProperty}</b> from <b>${formatBookingDateTimeForEmail(reservationCheckInDate, 'checkin')}</b> to <b>${formatBookingDateTimeForEmail(reservationCheckOutDate, 'checkout')}</b> has been <span style="color: green; font-weight: bold;">confirmed</span>.</p>
        ${customerRoomPackagePaymentLine}

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><b>Total Paid:</b> ${formatCurrency(totalAmountForLog)}</p>
        </div>

        <p>No further payment is required. We look forward to your stay.</p>
      `;

const operatorPaymentMessage = isDepositPayment
  ? `
      <p>The customer has paid the <b>deposit fee</b> for <b>${reservationProperty}</b>.</p>
      ${roomPackagePaymentLine}
      <p>The booking is now <span style="color: #d97706; font-weight: bold;">Partially Paid</span>.</p>
      <p><b>Deposit Paid:</b> ${formatCurrency(depositAmountForLog)}</p>
      <p><b>Balance Remaining:</b> ${formatCurrency(balanceAmountForLog)}</p>
      <p><b>Payment Deadline:</b> ${formatDateForEmail(paymentDueDate)}</p>
    `
  : isBalancePayment
    ? `
        <p>The customer has completed the <b>balance payment</b> for <b>${reservationProperty}</b>.</p>
        ${roomPackagePaymentLine}
        <p>The booking is now <span style="color: green; font-weight: bold;">Paid</span>.</p>
        <p><b>Total Paid:</b> ${formatCurrency(totalAmountForLog)}</p>
        <p>Please prepare the selected room/package for the customer’s check-in.</p>
      `
    : `
        <p>The customer has made an <b>instant full payment</b> for <b>${reservationProperty}</b>.</p>
        ${roomPackagePaymentLine}
        <p>The booking is now <span style="color: green; font-weight: bold;">Paid</span>.</p>
        <p><b>Total Paid:</b> ${formatCurrency(totalAmountForLog)}</p>
        <p>Please prepare the selected room/package for the customer’s check-in.</p>
      `;

// Send email to customer
try {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'CAMS System',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [
        {
          email: customerEmail,
          name:
            `${customerTitle || ''} ${customerLastName || ''}`.trim() ||
            'Customer',
        },
      ],
      subject: customerEmailSubject,
      htmlContent: `
        <h1><b>Dear ${customerTitle || ''} ${customerLastName || ''},</b></h1>
        <hr/>

        ${customerPaymentMessage}

        <br/>
        <p>You may log in to your account to view the reservation details.</p>

        <div style="margin: 10px 0;">
          <a href="https://sarawakadventures.com/login"
            style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px;">
            Login
          </a>
        </div>
      `,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`Customer payment email sent for reservation #${reservationid}`);
} catch (customerEmailError) {
  console.error(
    `Customer payment email failed for reservation #${reservationid}:`,
    customerEmailError.response?.data || customerEmailError.message
  );
}

// Send email to operator / property owner
try {
  if (operatorEmail && String(operatorEmail).trim() !== '') {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: operatorEmail,
            name:
              `${operatorTitle || ''} ${operatorLastName || ''}`.trim() ||
              'Operator',
          },
        ],
        subject: isDepositPayment
          ? 'Customer Deposit Payment Received'
          : isBalancePayment
            ? 'Customer Balance Payment Received'
            : 'Customer Full Payment Received',
        htmlContent: `
          <h1><b>Dear ${operatorTitle || ''} ${operatorLastName || ''},</b></h1>
          <hr/>

          ${operatorPaymentMessage}

          <p><b>Check-in:</b> ${formatBookingDateTimeForEmail(reservationCheckInDate, 'checkin')}</p>
          <p><b>Check-out:</b> ${formatBookingDateTimeForEmail(reservationCheckOutDate, 'checkout')}</p>

          <br/>
          <p>Click the button below if you wish to view the reservation details.</p>

          <div style="margin: 10px 0;">
            <a href="https://sarawakadventures.com/login"
              style="background-color: black; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px;">
              Login
            </a>
          </div>
        `,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(
      `Operator payment email sent for reservation #${reservationid}. Type: ${
        isBalancePayment
          ? 'Balance Payment'
          : isDepositPayment
            ? 'Deposit Payment'
            : 'Full Payment'
      }. Email: ${operatorEmail}`
    );
  } else {
    console.log(`Operator payment email skipped for reservation #${reservationid}: operatorEmail is missing.`);
  }
} catch (operatorEmailError) {
  console.error(
    `Operator payment email failed for reservation #${reservationid}:`,
    operatorEmailError.response?.data || operatorEmailError.message
  );
}

    const bookedRoomPackageForLog = formatRoomPackageForLog(request);

    const roomPackageText = bookedRoomPackageForLog
      ? ` Room/Package: ${bookedRoomPackageForLog}.`
      : '';

    let paymentLogMessage = '';

    if (isBalancePayment) {
      paymentLogMessage =
        `${creatorUsername || 'Customer'} completed balance payment for reservation #${reservationid} (${reservationProperty}).${roomPackageText} ` +
        `Balance Paid: RM ${balanceAmountForLog.toFixed(2)} | ` +
        `Deposit Already Paid: RM ${depositAmountForLog.toFixed(2)} | ` +
        `Total Amount: RM ${totalAmountForLog.toFixed(2)}. ` +
        `Booking status changed to Paid.`;
    } else if (isDepositPayment) {
      paymentLogMessage =
        `${creatorUsername || 'Customer'} paid deposit fee for reservation #${reservationid} (${reservationProperty}).${roomPackageText} ` +
        `Deposit Paid: RM ${depositAmountForLog.toFixed(2)} | ` +
        `Balance Remaining: RM ${balanceAmountForLog.toFixed(2)} | ` +
        `Total Amount: RM ${totalAmountForLog.toFixed(2)}. ` +
        `Booking status changed to Partially Paid.`;
    } else {
      paymentLogMessage =
        `${creatorUsername || 'Customer'} made instant full payment for reservation #${reservationid} (${reservationProperty}).${roomPackageText} ` +
        `Full Payment Received: RM ${totalAmountForLog.toFixed(2)} | ` +
        `Total Amount: RM ${totalAmountForLog.toFixed(2)}. ` +
        `Booking status changed to Paid.`;
    }

    const expectedStatusForLog = isDepositPayment ? 'Partially Paid' : 'Paid';

    const existingPaymentLog = await client.query(
      `
      SELECT logid
      FROM book_and_pay_log
      WHERE log ILIKE $1
      LIMIT 1
      `,
      [
        `%reservation #${reservationid}%Booking status changed to ${expectedStatusForLog}%`,
      ]
    );

    if (existingPaymentLog.rows.length === 0) {
      await client.query(
        `
        INSERT INTO book_and_pay_log 
          (logtime, log, userid)
        VALUES ($1, $2, $3)
        `,
        [timestamp, paymentLogMessage, creatorid || null]
      );
    } else {
      console.log(`BooknPay duplicate skipped for reservation #${reservationid}`);
    }

    try {
     await client.query(
  `
  INSERT INTO audit_trail (
    entityid,
    timestamp,
    entitytype,
    actiontype,
    action,
    userid,
    username
  ) VALUES (
    $1,
    NOW() AT TIME ZONE 'Asia/Kuala_Lumpur',
    $2,
    $3,
    $4,
    $5,
    $6
  )
  `,
  [
    reservationid,
    'Reservation',
    'POST',
    isDepositPayment
      ? 'Payment Deposit'
      : isBalancePayment
        ? 'Payment Balance'
        : 'Make Payment',
    creatorid || null,
    creatorUsername || 'Customer',
  ]
);
    } catch (auditError) {
      console.error('Payment audit skipped:', auditError.message);
    }

    const commRes = await client.query(
      'SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1'
    );

    const commRate =
      commRes.rows.length > 0 ? parseFloat(commRes.rows[0].commission_rate) : 0.07;

    const gross = parseFloat(totalprice || 0);
    const commAmount = gross * commRate;
    const modEarning = gross - commAmount;

    let extractedRoomType = 'Standard';

    if (request) {
      const match =
        request.match(/Room Selected:\s*(.+)/i) ||
        request.match(/Package:\s*(.+)/i);

      if (match) extractedRoomType = match[1].trim();
    }

    const ledgerBookingStatus = isDepositPayment ? 'Partially Paid' : 'Paid';

    const ledgerDebit = isDepositPayment ? depositAmountForLog : 0;

    const ledgerCredit = isDepositPayment
      ? Math.max(0, gross - depositAmountForLog)
      : modEarning;

    const ledgerExpected =
  isDepositPayment
    ? Math.max(
        0,
        gross - depositAmountForLog
      )
    : gross;

    const ledgerRemarks = isDepositPayment
      ? 'Customer paid deposit fee'
      : isBalancePayment
        ? 'Customer completed balance payment'
        : 'Customer made instant full payment';

    // NEW: Prevent duplicate ledger constraint from crashing payment success email API.
    try {
      await insertLedgerEntry(client, {
        reservationid: reservationid,
        propertyid: propertyid,
        propertyname: reservationProperty,
        roomtype: extractedRoomType,
        moderator_userid: owner_userid,
        moderator_username: operatorLastName,
        customer_userid: null,
        customer_name: `${customerTitle || ''} ${customerLastName || ''}`.trim(),
        activity_type: 'Payment Successful',
        stock_status: 'Deducted',
        booking_status: ledgerBookingStatus,
        gross_amount: gross,
        commission_rate: commRate,
        commission_amount: commAmount,
        moderator_earning: modEarning,
        credit: ledgerCredit,
        debit: ledgerDebit,
        expected_amount: ledgerExpected,
        remarks: ledgerRemarks,
      });
    } catch (ledgerError) {
      if (ledgerError.code === '23505') {
        console.log(
          `Booking ledger duplicate skipped for reservation #${reservationid}: ${ledgerError.message}`
        );
      } else {
        throw ledgerError;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment success email sent successfully',
      paymentType,
    });
  } catch (err) {
    console.error('Error sending payment success email:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send payment success email',
      error: err.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// API endpoint to check overlap
app.post('/check-date-overlap/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;
  const { checkIn } = req.body;
  let client;

  if (!propertyId || !checkIn) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    client = await pool.connect();

    // Check for Blackouts FIRST
    const blackoutQuery = `
      SELECT id FROM blackout_dates 
      WHERE propertyid = $1 AND is_active = TRUE 
        AND start_date <= $2 AND end_date >= $2
      LIMIT 1
    `;
    const blackoutResult = await client.query(blackoutQuery, [propertyId, checkIn]);
    
    // If a blackout exists, tell the frontend immediately so it can show the red warning
    if (blackoutResult.rows.length > 0) {
        return res.status(200).json({ overlap: true, isBlackout: true });
    }

    // Check for Normal Reservations
    const resQuery = `
      SELECT r.reservationid FROM reservation r
      WHERE r.propertyid = $1 AND DATE(r.checkindatetime) <= $2 AND DATE(r.checkoutdatetime) >= $2
        AND LOWER(TRIM(r.reservationstatus)) IN ('paid', 'partially paid')
      LIMIT 1
    `;
    const resResult = await client.query(resQuery, [propertyId, checkIn]);

    // Return the result for normal bookings
    return res.status(200).json({ overlap: resResult.rows.length > 0, isBlackout: false });
    
  } catch (error) {
    console.error('Error checking date overlap:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});




// FETCH SARAWAK HOLIDAYS VIA DEDICATED API
app.get('/fetch-holidays/:year', async (req, res) => {
    try {
        const year = String(req.params.year || new Date().getFullYear());

        const response = await fetch(
            `https://sabah-holiday.dydxsoft.my/api/sarawak/${year}.json`
        );

        if (!response.ok) {
            return res.status(400).json({
                success: false,
                error: "Failed to fetch holidays from external API"
            });
        }

        const apiData = await response.json();

        const monthNames = {
            Jan: '01',
            Feb: '02',
            Mar: '03',
            Apr: '04',
            May: '05',
            Jun: '06',
            Jul: '07',
            Aug: '08',
            Sep: '09',
            Oct: '10',
            Nov: '11',
            Dec: '12'
        };

        const seenDates = new Set();

        const holidays = (Array.isArray(apiData) ? apiData : [])
            .map((holiday, index) => {
                const rawDate = String(holiday.date || '').trim(); // example: Jan 01
                const [monthText, dayText] = rawDate.split(/\s+/);

                const monthNumber = monthNames[monthText];
                const day = String(dayText || '').padStart(2, '0');

                if (!monthNumber || !dayText) return null;

                const normalizedDate = `${year}-${monthNumber}-${day}`;

                return {
                    id: `sarawak-${normalizedDate}-${index}`,
                    name: holiday.holiday_name || holiday.name || 'Public Holiday',
                    date: normalizedDate,
                    day_of_week: holiday.day_of_week || '',
                    is_mandatory: Boolean(holiday.is_mandatory),
                    active: true,
                    rate: "100"
                };
            })
            .filter(Boolean)
            .filter((holiday) => {
                if (seenDates.has(holiday.date)) return false;
                seenDates.add(holiday.date);
                return true;
            })
            .sort((a, b) => a.date.localeCompare(b.date));

        res.status(200).json({
            success: true,
            holidays
        });
    } catch (error) {
        console.error('API Fetch Error:', error);
        res.status(500).json({
            success: false,
            error: "Server failed to fetch holidays.",
            details: error.message
        });
    }
});

// Check property room availability for customer booking page
app.get('/property-availability', async (req, res) => {
  const { propertyid, checkIn, checkOut, roomName, packageName } = req.query;

  if (!propertyid || !checkIn || !checkOut) {
    return res.status(400).json({
      message: 'propertyid, checkIn and checkOut are required'
    });
  }

  let client;

  try {
    client = await pool.connect();

    const roomNameValue = String(roomName || '').trim();
    const packageNameValue = String(packageName || '').trim();

    let bookingQuery = `
      SELECT
        reservationid,
        propertyid,
        checkindatetime,
        checkoutdatetime,
        reservationstatus,
        request
      FROM reservation
      WHERE propertyid = $1
        AND checkindatetime < $3::date
        AND checkoutdatetime > $2::date
        AND LOWER(TRIM(reservationstatus)) IN ('paid', 'partially paid')
    `;

    const values = [propertyid, checkIn, checkOut];

    if (roomNameValue && packageNameValue) {
      bookingQuery += `
        AND regexp_replace(LOWER(COALESCE(request, '')), '\\s+', ' ', 'g')
            ILIKE regexp_replace(LOWER($4), '\\s+', ' ', 'g')
        AND regexp_replace(LOWER(COALESCE(request, '')), '\\s+', ' ', 'g')
            ILIKE regexp_replace(LOWER($5), '\\s+', ' ', 'g')
      `;
      values.push(`%Room Selected: ${roomNameValue}%`, `%Package:%${packageNameValue}%`);
    } else if (roomNameValue) {
      bookingQuery += `
        AND regexp_replace(LOWER(COALESCE(request, '')), '\\s+', ' ', 'g')
            ILIKE regexp_replace(LOWER($4), '\\s+', ' ', 'g')
        AND regexp_replace(LOWER(COALESCE(request, '')), '\\s+', ' ', 'g')
            NOT ILIKE '%(package:%'
      `;
      values.push(`%Room Selected: ${roomNameValue}%`);
    }

const bookingResult = await client.query(bookingQuery, values);

// DEBUG
console.log('BACKEND PROPERTY AVAILABILITY:', {
  propertyid,
  checkIn,
  checkOut,
  roomName: roomNameValue,
  packageName: packageNameValue,
  queryValues: values,
  bookedCount: bookingResult.rows.length,
  bookings: bookingResult.rows.map((row) => ({
    reservationid: row.reservationid,
    reservationstatus: row.reservationstatus,
    request: row.request,
    checkindatetime: row.checkindatetime,
    checkoutdatetime: row.checkoutdatetime
  }))
});

return res.status(200).json({
  bookedCount: bookingResult.rows.length,
  bookings: bookingResult.rows
});

  } catch (err) {
    console.error('Error checking property availability:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) client.release();
  }
});

app.get('/property-sold-out-dates', async (req, res) => {
  const { propertyid, days = 90 } = req.query;
  const propertyId = parseInt(propertyid, 10);

  if (!propertyId || Number.isNaN(propertyId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid propertyid is required',
      soldOutDates: []
    });
  }

  const safeDays = Math.min(Math.max(parseInt(days, 10) || 90, 1), 365);

  let client;

  const normalizeText = (value = '') => {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const normalizeStatus = (status = '') => {
    return String(status || '')
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const shouldHoldStock = (reservation) => {
  const status = normalizeStatus(reservation.reservationstatus);

  return [
    'paid',
    'partially paid'
  ].includes(status);
};

  const toIsoDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const getRoomQuantity = (room, option = null) => {
    const optionQty = parseInt(option?.quantity ?? option?.qty, 10);
    if (!Number.isNaN(optionQty) && optionQty > 0) return optionQty;

    const roomQty = parseInt(room?.quantity ?? room?.qty, 10);
    if (!Number.isNaN(roomQty) && roomQty > 0) return roomQty;

    return 1;
  };

  const extractBookedRoomInfo = (booking) => {
    const rawText = String(
      booking.request ||
      booking.reservationrequest ||
      booking.additionalrequests ||
      booking.reservation_request ||
      ''
    );

    const roomMatch = rawText.match(/Room Selected:\s*([^\n\r(]+)/i);
    const packageMatch = rawText.match(/\(Package:\s*([^)]+)\)/i);

    return {
      roomName: normalizeText(roomMatch?.[1] || rawText),
      packageName: normalizeText(packageMatch?.[1] || ''),
      rawText: normalizeText(rawText)
    };
  };

  const bookingMatchesRoomAndPackage = (booking, baseRoomName = '', packageName = '') => {
    const baseName = normalizeText(baseRoomName);
    const pkgName = normalizeText(packageName);

    if (!baseName) return false;

    const booked = extractBookedRoomInfo(booking);

    const sameRoom =
      booked.roomName === baseName ||
      booked.rawText.includes(`room selected: ${baseName}`);

    if (!sameRoom) return false;

    if (pkgName) {
      return booked.packageName === pkgName;
    }

    return !booked.packageName;
  };

  const parseRoomsFromProperty = (property) => {
    let rawSetup =
      property.room_details ||
      property.roomsetup ||
      '';

    const description = property.propertydescription || '';

    if (!rawSetup && description.includes('_ROOMDATA_')) {
      rawSetup = description.split('_ROOMDATA_')[1];
    }

    let rooms = [];

    try {
      if (Array.isArray(rawSetup)) {
        rooms = rawSetup;
      } else if (typeof rawSetup === 'object' && rawSetup !== null) {
        rooms = Array.isArray(rawSetup) ? rawSetup : [];
      } else if (typeof rawSetup === 'string' && rawSetup.trim().startsWith('[')) {
        rooms = JSON.parse(rawSetup);
      }
    } catch (error) {
      console.error('Failed to parse room_details:', error.message);
      rooms = [];
    }

    if (Array.isArray(rooms) && rooms.length > 0) {
      return rooms;
    }

    return [
      {
        name: 'Entire Property',
        quantity: property.quantity || 1,
        options: []
      }
    ];
  };

  const getRoomChecksForWholeProperty = (property) => {
    const rooms = parseRoomsFromProperty(property);
    const checks = [];

    rooms.forEach((room) => {
      const baseRoomName = room?.name || 'Entire Property';
      const options = Array.isArray(room?.options) ? room.options : [];

      if (options.length > 0) {
        options.forEach((option) => {
          checks.push({
            baseRoomName,
            packageName: option?.name || '',
            totalQty: getRoomQuantity(room, option)
          });
        });
      } else {
        checks.push({
          baseRoomName,
          packageName: '',
          totalQty: getRoomQuantity(room, null)
        });
      }
    });

    return checks;
  };

  try {
    client = await pool.connect();

    const propertyResult = await client.query(
      `
      SELECT
        propertyid,
        propertyaddress,
        propertydescription,
        quantity,
        room_details,
        roomsetup
      FROM properties
      WHERE propertyid = $1
      `,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
        soldOutDates: []
      });
    }

    const property = propertyResult.rows[0];
    const roomChecks = getRoomChecksForWholeProperty(property);

    if (roomChecks.length === 0) {
      return res.json({
        success: true,
        propertyid: propertyId,
        days: safeDays,
        soldOutDates: []
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + safeDays);

    const todayIso = toIsoDate(today);
    const endDateIso = toIsoDate(endDate);

    const reservationResult = await client.query(
      `
      SELECT
        reservationid,
        reservationstatus,
        request,
        checkindatetime,
        checkoutdatetime
      FROM reservation
      WHERE propertyid = $1
        AND checkindatetime < $3::date
        AND checkoutdatetime > $2::date
      `,
      [propertyId, todayIso, endDateIso]
    );

    const reservations = reservationResult.rows.filter(shouldHoldStock);
    const soldOutDates = [];

    for (let i = 0; i < safeDays; i += 1) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() + i);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const dayStartIso = toIsoDate(dayStart);
      const dayEndIso = toIsoDate(dayEnd);

      const roomResults = roomChecks.map((roomCheck) => {
        const overlappingBookings = reservations.filter((booking) => {
          const bookingStart = toIsoDate(booking.checkindatetime);
          const bookingEnd = toIsoDate(booking.checkoutdatetime);

          if (!bookingStart || !bookingEnd) return false;

          const overlaps =
            bookingStart < dayEndIso &&
            bookingEnd > dayStartIso;

          if (!overlaps) return false;

          return bookingMatchesRoomAndPackage(
            booking,
            roomCheck.baseRoomName,
            roomCheck.packageName
          );
        });

        const uniqueIds = new Set(
          overlappingBookings.map((booking) => booking.reservationid)
        );

        const bookedCount = uniqueIds.size;
        const left = Math.max(0, roomCheck.totalQty - bookedCount);

        return {
          soldOut: left <= 0,
          left
        };
      });

      if (roomResults.length > 0 && roomResults.every((item) => item.soldOut)) {
        soldOutDates.push(dayStartIso);
      }
    }

    return res.json({
      success: true,
      propertyid: propertyId,
      days: safeDays,
      soldOutDates
    });
  } catch (error) {
    console.error('Failed to get property sold out dates:', error.message);
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      message: 'Failed to get property sold out dates',
      details: error.message,
      soldOutDates: []
    });
  } finally {
    if (client) client.release();
  }
});

app.get('/blackouts', async (req, res) => {
  const { userid, usergroup } = req.query;
  let client;

  try {
    client = await pool.connect();
    const role = String(usergroup || '').trim().toLowerCase();
    let result;

    if (role === 'moderator') {
      if (!userid || isNaN(userid)) {
        return res.status(400).json({ message: 'Valid userid is required for moderator blackout view' });
      }
      result = await client.query(
        `
        SELECT b.*,
               TO_CHAR(b.start_date, 'YYYY-MM-DD') AS start_date,
               TO_CHAR(b.end_date, 'YYYY-MM-DD') AS end_date
        FROM blackout_dates b
        JOIN properties p ON p.propertyid = b.propertyid
        WHERE p.userid = $1
        ORDER BY b.created_at DESC
        `,
        [userid]
      );
    } else {
      result = await client.query(
        `
        SELECT *,
               TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
               TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
        FROM blackout_dates
        ORDER BY created_at DESC
        `
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blackouts:', error);
    res.status(500).json({ message: 'Failed to fetch blackout dates', details: error.message });
  } finally {
    if (client) client.release();
  }
});

app.get('/blackouts/my', async (req, res) => {
  const { userid } = req.query;
  if (!userid) {
    return res.status(400).json({ message: 'userid is required' });
  }
  try {
    const result = await pool.query(
      `SELECT *,
              TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
       FROM blackout_dates 
       WHERE created_by_userid = $1 
       ORDER BY created_at DESC`,
      [userid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching own blackouts:', error);
    res.status(500).json({ message: 'Failed to fetch your blackout dates' });
  }
});

// POST /blackouts — Create a new blackout (Admin or Moderator)
app.post('/blackouts', async (req, res) => {
  const {
    propertyid, property_name, room_name, startDate, endDate, reason,
    created_by_userid, created_by_username, created_by_role, force
  } = req.body;

  if (!propertyid || !startDate || !endDate || !created_by_userid || !created_by_role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let client;

  try {
    client = await pool.connect();
    const role = String(created_by_role || '').trim().toLowerCase();

    const propertyCheck = await client.query(
      `SELECT p.propertyid, p.propertyaddress, p.userid AS property_owner_userid
       FROM properties p WHERE p.propertyid = $1`,
      [propertyid]
    );

    if (propertyCheck.rows.length === 0) return res.status(404).json({ message: 'Property not found' });

    const propertyOwnerUserid = propertyCheck.rows[0].property_owner_userid;

    if (role === 'moderator' && String(propertyOwnerUserid) !== String(created_by_userid)) {
      return res.status(403).json({ message: 'Moderator can only create blackout dates for their own properties' });
    }

    const normalizedRoomName = String(room_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const isWholePropertyBlackout = !normalizedRoomName || normalizedRoomName === 'all rooms' || normalizedRoomName === 'all room';

    if (!force) {
      const conflicts = await client.query(
        `
        SELECT 
          r.reservationid, r.checkindatetime, r.checkoutdatetime, r.request,
          rc.rcfirstname, rc.rclastname, r.reservationstatus
        FROM reservation r
        JOIN reservation_customer_details rc ON r.rcid = rc.rcid
        WHERE r.propertyid = $1
          AND LOWER(TRIM(r.reservationstatus)) IN ('accepted', 'paid', 'partially paid', 'pending', 'booking', 'payment pending')
          AND NOT (
            DATE(r.checkoutdatetime) <= $2::date
            OR DATE(r.checkindatetime) > $3::date 
          )
          AND (
            $4::boolean = TRUE
            OR regexp_replace(LOWER(TRIM(COALESCE(r.request, ''))), '\\s+', ' ', 'g') LIKE '%' || $5 || '%'
          )
        `,
        [propertyid, startDate, endDate, isWholePropertyBlackout, normalizedRoomName]
      );

      if (conflicts.rows.length > 0) {
        return res.status(409).json({
          message: isWholePropertyBlackout
            ? 'Conflict detected. There are active bookings during this blackout period.'
            : `Conflict detected. There are active bookings for ${room_name} during this blackout period.`,
          isConflict: true,
          conflicts: conflicts.rows
        });
      }
    }

    const result = await client.query(
      `
      INSERT INTO blackout_dates 
        (propertyid, property_name, room_name, start_date, end_date, reason, created_by_userid, created_by_username, created_by_role, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, LOWER($9), TRUE, NOW())
      RETURNING *,
                TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
                TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      `,
      [
        propertyid, property_name || propertyCheck.rows[0].propertyaddress,
        isWholePropertyBlackout ? null : String(room_name || '').trim(),
        startDate, endDate, reason || null, created_by_userid, created_by_username || 'Unknown', created_by_role
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blackout:', error);
    res.status(500).json({ message: 'Failed to create blackout', details: error.message });
  } finally {
    if (client) client.release();
  }
});

app.patch('/blackouts/:id/override', async (req, res) => {
  const { id } = req.params;
  const { overrideReason, override_by_userid, override_by_username, override_by_role } = req.body;

  const role = String(override_by_role || '').trim().toLowerCase();

  if (role !== 'administrator' && role !== 'admin') {
    return res.status(403).json({ message: 'Only Administrator can override blackout dates' });
  }

  if (!overrideReason || !overrideReason.trim()) {
    return res.status(400).json({ message: 'Override reason is required' });
  }

  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `
      UPDATE blackout_dates
      SET 
        is_active = FALSE,
        override_reason = $1,
        override_by_userid = $2,
        override_by_username = $3,
        override_at = NOW()
      WHERE id = $4
        AND created_by_role = 'moderator'
        AND is_active = TRUE
      RETURNING *,
                TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
                TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      `,
      [overrideReason, override_by_userid || null, override_by_username || 'Administrator', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Blackout not found, already inactive, or not created by moderator'
      });
    }

    res.json({
      message: 'Blackout overridden successfully',
      blackout: result.rows[0]
    });
  } catch (error) {
    console.error('Error overriding blackout:', error);
    res.status(500).json({ message: 'Failed to override blackout', details: error.message });
  } finally {
    if (client) client.release();
  }
});

app.delete('/blackouts/:id', async (req, res) => {
  const { id } = req.params;
  const { userid, usergroup } = req.query;

  const role = String(usergroup || '').trim().toLowerCase();

  let client;

  try {
    client = await pool.connect();

    const blackoutResult = await client.query(
      `
      SELECT *
      FROM blackout_dates
      WHERE id = $1
      `,
      [id]
    );

    if (blackoutResult.rows.length === 0) {
      return res.status(404).json({ message: 'Blackout not found' });
    }

    const blackout = blackoutResult.rows[0];

    const isAdmin = role === 'administrator' || role === 'admin';
    const isOwnBlackout = String(blackout.created_by_userid) === String(userid);

    if (!isAdmin && !isOwnBlackout) {
      return res.status(403).json({
        message: 'You can only delete your own blackout records'
      });
    }

    await client.query(
      `
      DELETE FROM blackout_dates
      WHERE id = $1
      `,
      [id]
    );

    res.json({ message: 'Blackout deleted successfully' });
  } catch (error) {
    console.error('Error deleting blackout:', error);
    res.status(500).json({ message: 'Failed to delete blackout', details: error.message });
  } finally {
    if (client) client.release();
  }
});
// GET DYNAMIC PRICING SETTINGS
app.get('/pricing-settings', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM global_pricing_settings ORDER BY id ASC LIMIT 1");
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            
            res.status(200).json({
                weekendMultiplier: row.weekend_multiplier,
                specialEventEnabled: row.special_event_enabled,
                specialEventMultiplier: row.special_event_multiplier,
                earlyBirdMultiplier: row.early_bird_multiplier,
                lastMinuteMultiplier: row.last_minute_multiplier,
                sstRate: row.sst_rate,
                depositRate: row.deposit_rate // Make sure this matches your DB column exactly
            });
        } else {
            res.status(404).json({ error: "Settings not found" });
        }
    } catch (error) {
        console.error("Fetch Settings Error:", error);
        res.status(500).json({ error: "Failed to fetch pricing settings." });
    }
});

// SAVE DYNAMIC PRICING SETTINGS + EMAIL NOTIFICATION
app.post('/pricing-settings', async (req, res) => {
  let client;

  const {
    weekendMultiplier,
    specialEventEnabled,
    specialEventMultiplier,
    earlyBirdMultiplier,
    lastMinuteMultiplier,
    sstRate,
    depositRate // Capture from the incoming payload
  } = req.body;

  try {
    client = await pool.connect();

    const currentResult = await client.query(
      `SELECT * FROM global_pricing_settings WHERE id = 1 LIMIT 1`
    );

    const currentSettings = currentResult.rows[0] || {
      weekend_multiplier: 100,
      special_event_enabled: false,
      special_event_multiplier: 150,
      early_bird_multiplier: 90,
      last_minute_multiplier: 85,
      sst_rate: 0.08,
      deposit_rate: 0.10 // Default fallback
    };

    const newWeekendMultiplier = weekendMultiplier !== undefined ? parseFloat(weekendMultiplier) : 100;
    const newSpecialEventEnabled = specialEventEnabled !== undefined ? specialEventEnabled : false;
    const newSpecialEventMultiplier = specialEventMultiplier !== undefined ? parseFloat(specialEventMultiplier) : 150;
    const newEarlyBirdMultiplier = earlyBirdMultiplier !== undefined ? parseFloat(earlyBirdMultiplier) : 90;
    const newLastMinuteMultiplier = lastMinuteMultiplier !== undefined ? parseFloat(lastMinuteMultiplier) : 85;
    const newSstRate = sstRate !== undefined ? parseFloat(sstRate) : 0.08;
    const newDepositRate = depositRate !== undefined ? parseFloat(depositRate) : 0.10;

    const changes = [];

    // Detect Changes (Keeping your existing logic)
    if (parseFloat(currentSettings.weekend_multiplier) !== newWeekendMultiplier) {
      changes.push({ label: 'Weekend Rate', oldValue: `${parseFloat(currentSettings.weekend_multiplier)}%`, newValue: `${newWeekendMultiplier}%` });
    }
    if (parseFloat(currentSettings.early_bird_multiplier) !== newEarlyBirdMultiplier) {
      changes.push({ label: 'Early Bird Discount', oldValue: `${parseFloat(currentSettings.early_bird_multiplier)}%`, newValue: `${newEarlyBirdMultiplier}%` });
    }
    if (parseFloat(currentSettings.last_minute_multiplier) !== newLastMinuteMultiplier) {
      changes.push({ label: 'Last Minute Discount', oldValue: `${parseFloat(currentSettings.last_minute_multiplier)}%`, newValue: `${newLastMinuteMultiplier}%` });
    }
    if (parseFloat(currentSettings.special_event_multiplier) !== newSpecialEventMultiplier) {
      changes.push({ label: 'Special Event Rate', oldValue: `${parseFloat(currentSettings.special_event_multiplier)}%`, newValue: `${newSpecialEventMultiplier}%` });
    }
    if (Boolean(currentSettings.special_event_enabled) !== Boolean(newSpecialEventEnabled)) {
      changes.push({ label: 'Special Event Enabled', oldValue: currentSettings.special_event_enabled ? 'Enabled' : 'Disabled', newValue: newSpecialEventEnabled ? 'Enabled' : 'Disabled' });
    }
    if (parseFloat(currentSettings.sst_rate) !== newSstRate) {
      changes.push({ label: 'SST Rate', oldValue: `${(parseFloat(currentSettings.sst_rate) * 100).toFixed(2)}%`, newValue: `${(newSstRate * 100).toFixed(2)}%` });
    }
    if (parseFloat(currentSettings.deposit_rate || 0) !== newDepositRate) {
      changes.push({ label: 'Deposit Rate', oldValue: `${(parseFloat(currentSettings.deposit_rate || 0) * 100).toFixed(0)}%`, newValue: `${(newDepositRate * 100).toFixed(0)}%` });
    }

    // UPDATE DATABASE
    const updateQuery = `
      UPDATE global_pricing_settings 
      SET weekend_multiplier = $1, 
          special_event_enabled = $2, 
          special_event_multiplier = $3, 
          early_bird_multiplier = $4, 
          last_minute_multiplier = $5,
          sst_rate = $6,
          deposit_rate = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [
      newWeekendMultiplier, newSpecialEventEnabled, newSpecialEventMultiplier,
      newEarlyBirdMultiplier, newLastMinuteMultiplier, newSstRate, newDepositRate
    ]);

    let savedSettings;

    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO global_pricing_settings
        (id, weekend_multiplier, special_event_enabled, special_event_multiplier, early_bird_multiplier, last_minute_multiplier, sst_rate, deposit_rate, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      const insertResult = await client.query(insertQuery, [
        newWeekendMultiplier, newSpecialEventEnabled, newSpecialEventMultiplier,
        newEarlyBirdMultiplier, newLastMinuteMultiplier, newSstRate, newDepositRate
      ]);
      savedSettings = insertResult.rows[0];
    } else {
      savedSettings = result.rows[0];
    }

    if (changes.length === 0) {
      return res.status(200).json({ success: true, message: "No changes detected. Settings remain the same." });
    }

    // Email Notification logic
    const usersResult = await client.query(
      `SELECT userid, ufirstname, ulastname, uemail, usergroup
       FROM users WHERE LOWER(usergroup) IN ('administrator', 'moderator')
       AND uemail IS NOT NULL AND TRIM(uemail) <> ''`
    );

    const recipients = usersResult.rows;
    const malaysiaTime = new Date(new Date(savedSettings.updated_at).getTime() + 8 * 60 * 60 * 1000);
    const effectiveDate = malaysiaTime.toLocaleString('en-MY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const changesHtml = changes.map((change) => `
          <tr>
            <td style="padding:8px; border:1px solid #ddd;"><b>${change.label}</b></td>
            <td style="padding:8px; border:1px solid #ddd;">${change.oldValue}</td>
            <td style="padding:8px; border:1px solid #ddd;">${change.newValue}</td>
          </tr>
        `).join('');

    for (const row of recipients) {
      const fullName = [row.ufirstname, row.ulastname].filter(Boolean).join(' ') || 'User';

      await axios.post('https://api.brevo.com/v3/smtp/email', {
          sender: { name: process.env.BREVO_SENDER_NAME || 'CAMS System', email: process.env.BREVO_SENDER_EMAIL },
          to: [{ email: row.uemail, name: fullName }],
          subject: 'Dynamic Pricing Settings Updated',
          htmlContent: `
            <h2>Dear ${fullName},</h2>
            <p>Please be informed that the dynamic pricing settings have been modified.</p>
            <table style="border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 16px;">
              <thead>
                <tr><th style="padding:8px; border:1px solid #ddd; text-align:left;">Category</th><th style="padding:8px; border:1px solid #ddd; text-align:left;">Previous Value</th><th style="padding:8px; border:1px solid #ddd; text-align:left;">New Value</th></tr>
              </thead>
              <tbody>${changesHtml}</tbody>
            </table>
            <p><b>Effective From:</b> ${effectiveDate}</p>
          `,
        },
        { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' } }
      );
    }

    res.status(200).json({ success: true, message: "Pricing & Tax settings saved permanently and notification emails sent." });

  } catch (error) {
    console.error("Save Settings Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to save settings or send notification emails." });
  } finally {
    if (client) client.release();
  }
});

// CALCULATE DYNAMIC BOOKING PRICE FOR CUSTOMER
app.post('/calculate-price', async (req, res) => {
    // ADD propertyid to the requested body so we can look up the discount
    const { checkInDate, checkOutDate, basePrice, propertyid } = req.body;

    try {
        const safeBasePrice = parseFloat(basePrice) || 0;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const today = new Date();

        // SMART MATH HELPER
        const normalizeRate = (rate) => {
            const val = parseFloat(rate) || 1;
            return val <= 5 ? val : val / 100; 
        };

        // FETCH THE PROPERTY DISCOUNT FROM THE DB
        let flatDiscount = 0;
        if (propertyid) {
            const propRes = await pool.query("SELECT propertydiscount FROM properties WHERE propertyid = $1", [propertyid]);
            if (propRes.rows.length > 0) {
                flatDiscount = parseFloat(propRes.rows[0].propertydiscount) || 0;
            }
        }

        const settingsRes = await pool.query("SELECT * FROM global_pricing_settings ORDER BY id ASC LIMIT 1");
        const settings = settingsRes.rows[0] || {};

        const holidaysRes = await pool.query(`
            SELECT holiday_name AS name, holiday_date AS date, rate 
            FROM official_holidays 
            WHERE holiday_date >= $1 AND holiday_date <= $2 AND is_active = true
        `, [checkInDate, checkOutDate]);
        const holidays = holidaysRes.rows;

        const festiveRes = await pool.query(`
            SELECT event_name AS name, start_date, end_date, rate 
            FROM custom_festive_periods 
            WHERE end_date >= $1 AND start_date <= $2
        `, [checkInDate, checkOutDate]);
        const festivePeriods = festiveRes.rows;

        let totalPrice = 0;
        let dailyBreakdown = [];

        const daysInAdvance = Math.floor((checkIn - today) / (1000 * 60 * 60 * 24));
        let globalDiscountMultiplier = 1;

        if (daysInAdvance > 30 && settings.early_bird_multiplier) {
            globalDiscountMultiplier = normalizeRate(settings.early_bird_multiplier);
        } else if (daysInAdvance <= 7 && settings.last_minute_multiplier) {
            globalDiscountMultiplier = normalizeRate(settings.last_minute_multiplier);
        }

        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
            const currentDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const isWeekend = d.getDay() === 0 || d.getDay() === 6; 

            let dailyRate = safeBasePrice;

            const holidayMatch = holidays.find(h => {
                if (!h.date) return false;
                const hDate = new Date(h.date);
                const hDateStr = new Date(hDate.getTime() - (hDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                return hDateStr === currentDateStr;
            });

            const festiveMatch = festivePeriods.find(f => {
                if (!f.start_date || !f.end_date) return false;
                return d >= new Date(f.start_date) && d <= new Date(f.end_date);
            });

            // STRICT PRICING HIERARCHY
            if (holidayMatch) {
                dailyRate = safeBasePrice * normalizeRate(holidayMatch.rate);
            } 
            else if (festiveMatch) {
                dailyRate = safeBasePrice * normalizeRate(festiveMatch.rate);
            }
            else if (isWeekend && settings.weekend_multiplier) {
                dailyRate = safeBasePrice * normalizeRate(settings.weekend_multiplier);
            }
            else if (globalDiscountMultiplier !== 1) {
                dailyRate = safeBasePrice * globalDiscountMultiplier;
            }
            else {
                dailyRate = safeBasePrice;
            }

            // APPLY THE MODERATOR'S FLAT DISCOUNT (Ensuring price doesn't drop below 0)
            dailyRate = Math.max(0, dailyRate - flatDiscount);

            totalPrice += dailyRate;
            dailyBreakdown.push({
                date: currentDateStr,
                price: parseFloat(dailyRate.toFixed(2)),
                reason: "Best Available Rate" 
            });
        }

        res.status(200).json({
            success: true,
            totalPrice: parseFloat(totalPrice.toFixed(2)),
            totalNights: dailyBreakdown.length,
            breakdown: dailyBreakdown
        });

    } catch (error) {
        console.error("Pricing Engine Error:", error);
        res.status(500).json({ error: "Failed to calculate dynamic price.", details: error.message });
    }
});

// HOLIDAY MANAGER BACKEND ROUTES
// Fetch Official Holidays from DB
app.get('/manage-holidays', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (holiday_date)
        id,
        holiday_name AS name,
        TO_CHAR(holiday_date, 'YYYY-MM-DD') AS date,
        is_active AS active,
        rate
      FROM official_holidays
      ORDER BY holiday_date ASC, id DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Fetch Holidays Error:", error);
    res.status(500).json({ error: "Failed to fetch holidays from DB" });
  }
});

// Save Official Holidays to DB + Send Email Notifications
app.post('/manage-holidays', async (req, res) => {
    const { holidays } = req.body;
    const client = await pool.connect();

    const normalizeDate = (date) => {
        if (!date) return '';

        const raw = String(date).trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        const parsed = new Date(raw);

        if (Number.isNaN(parsed.getTime())) {
            return '';
        }

        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const formatDate = (date) => {
        const normalizedDate = normalizeDate(date);

        if (!normalizedDate) return '-';

        return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const toMultiplierRate = (rate) => {
        const num = parseFloat(rate);

        if (!Number.isFinite(num) || num <= 0) {
            return 1;
        }

        // Frontend sends 100, 120, 150.
        // DB should save 1.00, 1.20, 1.50.
        return num > 5 ? num / 100 : num;
    };

    const toDisplayPercentage = (rate) => {
        const num = parseFloat(rate);

        if (!Number.isFinite(num) || num <= 0) {
            return 100;
        }

        // DB might be 1.2 or frontend might be 120.
        return num <= 5 ? Math.round(num * 100) : num;
    };

    try {
        await client.query('BEGIN');

        if (!Array.isArray(holidays)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: "Invalid holidays data"
            });
        }

        // 1. Clean old duplicate rows already inside DB.
        // Keep the latest ID for each holiday_date.
        await client.query(`
            DELETE FROM official_holidays old_holiday
            USING official_holidays latest_holiday
            WHERE old_holiday.holiday_date = latest_holiday.holiday_date
              AND old_holiday.id < latest_holiday.id
        `);

        const existingResult = await client.query(`
            SELECT 
                id, 
                holiday_name AS name, 
                TO_CHAR(holiday_date, 'YYYY-MM-DD') AS date, 
                is_active AS active, 
                rate
            FROM official_holidays
            ORDER BY holiday_date ASC, id DESC
        `);

        const existingRows = existingResult.rows;

        // 2. Clean incoming frontend holidays.
        // Rule: one holiday per date.
        const seenIncomingDates = new Set();

        const cleanedHolidays = holidays
            .map((h) => {
                const date = normalizeDate(h.date);

                return {
                    id: h.id,
                    name: h.name || h.holiday_name || h.title || 'Public Holiday',
                    date,
                    active: h.active !== false,
                    rate: toMultiplierRate(h.rate)
                };
            })
            .filter((h) => {
                if (!h.date) return false;

                if (seenIncomingDates.has(h.date)) {
                    return false;
                }

                seenIncomingDates.add(h.date);
                return true;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Match existing DB rows by ID first, then by date.
        const existingById = new Map(
            existingRows.map(row => [Number(row.id), row])
        );

        const existingByDate = new Map(
            existingRows.map(row => [normalizeDate(row.date), row])
        );

        const matchedExistingIds = new Set();
        const added = [];
        const updated = [];
        const removed = [];

        for (const h of cleanedHolidays) {
            const parsedId =
                h.id &&
                !String(h.id).startsWith('temp-') &&
                !String(h.id).startsWith('sarawak-') &&
                !isNaN(Number(h.id))
                    ? Number(h.id)
                    : null;

            let old = null;

            // Try match by DB id first
            if (parsedId && existingById.has(parsedId)) {
                old = existingById.get(parsedId);
            }

            // Fallback match by date only
            // This prevents same date from being inserted again with different name.
            if (!old && existingByDate.has(h.date)) {
                old = existingByDate.get(h.date);
            }

            if (old) {
                matchedExistingIds.add(Number(old.id));

                const oldDate = normalizeDate(old.date);
                const oldRatePercent = toDisplayPercentage(old.rate);
                const newRatePercent = toDisplayPercentage(h.rate);

                const changed =
                    String(old.name || '') !== String(h.name || '') ||
                    oldDate !== h.date ||
                    Boolean(old.active) !== Boolean(h.active) ||
                    Number(oldRatePercent) !== Number(newRatePercent);

                await client.query(`
                    UPDATE official_holidays
                    SET holiday_name = $1,
                        holiday_date = $2,
                        is_active = $3,
                        rate = $4
                    WHERE id = $5
                `, [h.name, h.date, h.active, h.rate, old.id]);

                if (changed) {
                    updated.push({
                        name: h.name,
                        date: formatDate(h.date),
                        oldRate: `${oldRatePercent}%`,
                        newRate: `${newRatePercent}%`,
                        oldStatus: old.active ? 'Active' : 'Inactive',
                        newStatus: h.active ? 'Active' : 'Inactive'
                    });
                }
            } else {
                const insertResult = await client.query(`
                    INSERT INTO official_holidays (
                        holiday_name, 
                        holiday_date, 
                        is_active, 
                        rate
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [h.name, h.date, h.active, h.rate]);

                matchedExistingIds.add(Number(insertResult.rows[0].id));

                added.push({
                    name: h.name,
                    date: formatDate(h.date),
                    rate: `${toDisplayPercentage(h.rate)}%`,
                    status: h.active ? 'Active' : 'Inactive'
                });
            }
        }

        // 4. Remove DB holidays that are no longer submitted from frontend.
        for (const old of existingRows) {
            if (!matchedExistingIds.has(Number(old.id))) {
                removed.push({
                    name: old.name,
                    date: formatDate(old.date),
                    rate: `${toDisplayPercentage(old.rate)}%`,
                    status: old.active ? 'Active' : 'Inactive'
                });

                await client.query(`
                    DELETE FROM official_holidays
                    WHERE id = $1
                `, [old.id]);
            }
        }

        // 5. Final DB cleanup again just in case.
        await client.query(`
            DELETE FROM official_holidays old_holiday
            USING official_holidays latest_holiday
            WHERE old_holiday.holiday_date = latest_holiday.holiday_date
              AND old_holiday.id < latest_holiday.id
        `);

        await client.query('COMMIT');

        // 6. Send email notification after successful save.
        if (added.length > 0 || updated.length > 0 || removed.length > 0) {
            try {
                const users = await pool.query(`
                    SELECT ufirstname, ulastname, uemail
                    FROM users
                    WHERE LOWER(usergroup) IN ('administrator', 'admin', 'moderator')
                      AND uemail IS NOT NULL
                      AND TRIM(uemail) <> ''
                `);

                const malaysiaTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);

                const formattedDate = malaysiaTime.toLocaleString('en-MY', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                const addedHtml = added.length > 0 ? `
                    <h3 style="margin-bottom:8px;">Added Holidays</h3>
                    <ul>
                        ${added.map(item => `
                            <li><b>${item.name}</b> (${item.date}) — ${item.rate} — ${item.status}</li>
                        `).join('')}
                    </ul>
                ` : '';

                const updatedHtml = updated.length > 0 ? `
                    <h3 style="margin-bottom:8px;">Updated Holidays</h3>
                    <ul>
                        ${updated.map(item => `
                            <li><b>${item.name}</b> (${item.date}) — Rate: ${item.oldRate} → ${item.newRate}; Status: ${item.oldStatus} → ${item.newStatus}</li>
                        `).join('')}
                    </ul>
                ` : '';

                const removedHtml = removed.length > 0 ? `
                    <h3 style="margin-bottom:8px;">Removed Holidays</h3>
                    <ul>
                        ${removed.map(item => `
                            <li><b>${item.name}</b> (${item.date}) — ${item.rate} — ${item.status}</li>
                        `).join('')}
                    </ul>
                ` : '';

                for (const user of users.rows) {
                    const fullName =
                        `${user.ufirstname || ''} ${user.ulastname || ''}`.trim() || 'User';

                    await axios.post(
                        'https://api.brevo.com/v3/smtp/email',
                        {
                            sender: {
                                name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                                email: process.env.BREVO_SENDER_EMAIL,
                            },
                            to: [
                                {
                                    email: user.uemail,
                                    name: fullName
                                }
                            ],
                            subject: 'Holiday Settings Updated',
                            htmlContent: `
                                <h2>Dear ${fullName},</h2>
                                <p>The holiday pricing settings have been updated.</p>
                                ${addedHtml}
                                ${updatedHtml}
                                ${removedHtml}
                                <p><b>Effective From:</b> ${formattedDate}</p>
                                <p>Please take note of these updates for future pricing calculations.</p>
                            `
                        },
                        {
                            headers: {
                                'api-key': process.env.BREVO_API_KEY,
                                'Content-Type': 'application/json',
                            }
                        }
                    );
                }
            } catch (emailError) {
                // Do not fail the save if email fails.
                console.error("Holiday notification email failed:", emailError.response?.data || emailError.message);
            }
        }

        res.status(200).json({
            success: true,
            message: "Holiday settings saved successfully",
            holidays: cleanedHolidays,
            changes: {
                added,
                updated,
                removed
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');

        console.error("Holiday Error:", error.response?.data || error.message);

        res.status(500).json({
            success: false,
            error: "Failed to save holidays",
            details: error.message
        });
    } finally {
        client.release();
    }
});

// Fetch Festive Periods from DB
app.get('/manage-festive', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                event_name AS name,
                TO_CHAR(start_date, 'YYYY-MM-DD') AS start,
                TO_CHAR(end_date, 'YYYY-MM-DD') AS end,
                rate 
            FROM custom_festive_periods 
            ORDER BY start_date ASC
        `);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Festive Error:", error);
        res.status(500).json({ error: "Failed to fetch festive periods" });
    }
});

// Save Festive Periods to DB
app.post('/manage-festive', async (req, res) => {
    const { festivePeriods } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingResult = await client.query(`
            SELECT id, event_name AS name, start_date AS start, end_date AS end, rate
            FROM custom_festive_periods
            ORDER BY start_date ASC
        `);

        const existingRows = existingResult.rows;

        const normalizeDate = (date) => {
    if (!date) return '';

    const raw = String(date).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        const makeFestiveKey = (item) =>
            `${item.name}__${normalizeDate(item.start)}__${normalizeDate(item.end)}`;

        const existingById = new Map(existingRows.map(row => [Number(row.id), row]));
        const existingByKey = new Map(existingRows.map(row => [makeFestiveKey(row), row]));

        const matchedExistingIds = new Set();
        const added = [];
        const updated = [];
        const removed = [];

        for (const p of festivePeriods) {
            const rate = parseFloat(p.rate || 100);
            const parsedId =
                p.id && !String(p.id).startsWith('temp-') && !isNaN(Number(p.id))
                    ? Number(p.id)
                    : null;

            let old = null;

            // Try match by real DB id
            if (parsedId && existingById.has(parsedId)) {
                old = existingById.get(parsedId);
            } else {
                // Fallback match by content
                const key = makeFestiveKey({
                    name: p.name,
                    start: p.start,
                    end: p.end
                });
                if (existingByKey.has(key)) {
                    old = existingByKey.get(key);
                }
            }

            if (old) {
                matchedExistingIds.add(Number(old.id));

                await client.query(`
                    UPDATE custom_festive_periods
                    SET event_name = $1,
                        start_date = $2,
                        end_date = $3,
                        rate = $4
                    WHERE id = $5
                `, [p.name, p.start, p.end, rate, old.id]);

                const changed =
                    old.name !== p.name ||
                    normalizeDate(old.start) !== normalizeDate(p.start) ||
                    normalizeDate(old.end) !== normalizeDate(p.end) ||
                    parseFloat(old.rate) !== rate;

                if (changed) {
                    updated.push({
                        name: p.name,
                        start: formatDate(p.start),
                        end: formatDate(p.end),
                        oldRate: `${parseFloat(old.rate)}%`,
                        newRate: `${rate}%`
                    });
                }
            } else {
                const insertResult = await client.query(`
                    INSERT INTO custom_festive_periods (event_name, start_date, end_date, rate)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [p.name, p.start, p.end, rate]);

                matchedExistingIds.add(Number(insertResult.rows[0].id));

                added.push({
                    name: p.name,
                    start: formatDate(p.start),
                    end: formatDate(p.end),
                    rate: `${rate}%`
                });
            }
        }

        // Only rows not matched at all are removed
        for (const old of existingRows) {
            if (!matchedExistingIds.has(Number(old.id))) {
                removed.push({
                    name: old.name,
                    start: formatDate(old.start),
                    end: formatDate(old.end),
                    rate: `${parseFloat(old.rate)}%`
                });

                await client.query(`
                    DELETE FROM custom_festive_periods
                    WHERE id = $1
                `, [old.id]);
            }
        }

        await client.query('COMMIT');

        if (added.length > 0 || updated.length > 0 || removed.length > 0) {
            const users = await client.query(`
                SELECT ufirstname, ulastname, uemail
                FROM users
                WHERE LOWER(usergroup) IN ('administrator', 'admin', 'moderator')
                  AND uemail IS NOT NULL
                  AND TRIM(uemail) <> ''
            `);

            const malaysiaTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);

            const formattedDate = malaysiaTime.toLocaleString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            const addedHtml = added.length > 0 ? `
                <h3 style="margin-bottom:8px;">Added Festive Periods</h3>
                <ul>
                    ${added.map(item => `
                        <li><b>${item.name}</b> (${item.start} - ${item.end}) — ${item.rate}</li>
                    `).join('')}
                </ul>
            ` : '';

            const updatedHtml = updated.length > 0 ? `
                <h3 style="margin-bottom:8px;">Updated Festive Rates</h3>
                <ul>
                    ${updated.map(item => `
                        <li><b>${item.name}</b> (${item.start} - ${item.end}) — ${item.oldRate} → ${item.newRate}</li>
                    `).join('')}
                </ul>
            ` : '';

            const removedHtml = removed.length > 0 ? `
                <h3 style="margin-bottom:8px;">Removed Festive Periods</h3>
                <ul>
                    ${removed.map(item => `
                        <li><b>${item.name}</b> (${item.start} - ${item.end}) — ${item.rate}</li>
                    `).join('')}
                </ul>
            ` : '';

            for (const user of users.rows) {
                const fullName = `${user.ufirstname || ''} ${user.ulastname || ''}`.trim() || 'User';

                await axios.post(
                    'https://api.brevo.com/v3/smtp/email',
                    {
                        sender: {
                            name: process.env.BREVO_SENDER_NAME || 'CAMS System',
                            email: process.env.BREVO_SENDER_EMAIL,
                        },
                        to: [{ email: user.uemail, name: fullName }],
                        subject: 'Festive Settings Updated',
                        htmlContent: `
                            <h2>Dear ${fullName},</h2>
                            <p>The festive pricing settings have been updated.</p>
                            ${addedHtml}
                            ${updatedHtml}
                            ${removedHtml}
                            <p><b>Effective From:</b> ${formattedDate}</p>
                            <p>Please take note of these updates for future pricing calculations.</p>
                        `
                    },
                    {
                        headers: {
                            'api-key': process.env.BREVO_API_KEY,
                            'Content-Type': 'application/json',
                        }
                    }
                );
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Festive Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to save festive periods" });
    } finally {
        client.release();
    }
});

// Notification History
// Sync payment reminder + future booking notifications
app.post('/notifications/sync-booking-alerts/:userid', async (req, res) => {
  const { userid } = req.params;

  try {
    // Payment Reminder: Partially Paid bookings, due tomorrow
    await pool.query(
      `
      INSERT INTO notifications (
        userid,
        reservationid,
        propertyid,
        notificationtitle,
        notificationmessage,
        notificationtype,
        notificationstatus,
        isread,
        timestamp
      )
      SELECT
        r.userid,
        r.reservationid,
        r.propertyid,
        'Payment Reminder',
        'Your booking for ' || p.propertyaddress ||
        ' is partially paid. Please pay the remaining balance before the payment deadline: ' ||
        TO_CHAR((r.reservationblocktime AT TIME ZONE 'Asia/Kuching'), 'DD/MM/YYYY') || '.',
        'Payment Reminder',
        'Unread',
        false,
        NOW() AT TIME ZONE 'Asia/Kuching'
      FROM reservation r
      JOIN properties p ON p.propertyid = r.propertyid
      WHERE r.userid = $1
      AND LOWER(TRIM(r.reservationstatus)) = 'partially paid'
      AND r.reservationblocktime IS NOT NULL
      AND (r.reservationblocktime AT TIME ZONE 'Asia/Kuching')::date
        = (NOW() AT TIME ZONE 'Asia/Kuching')::date + INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1
        FROM notifications n
        WHERE n.userid = r.userid
        AND n.reservationid = r.reservationid
        AND n.notificationtype = 'Payment Reminder'
      )
      `,
      [userid]
    );

    // Upcoming Booking: Paid bookings with check-in tomorrow
    await pool.query(
      `
      INSERT INTO notifications (
        userid,
        reservationid,
        propertyid,
        notificationtitle,
        notificationmessage,
        notificationtype,
        notificationstatus,
        isread,
        timestamp
      )
      SELECT
        r.userid,
        r.reservationid,
        r.propertyid,
        'Upcoming Booking',
        'You have an upcoming paid booking for ' || p.propertyaddress ||
        ' on ' || TO_CHAR((r.checkindatetime AT TIME ZONE 'Asia/Kuching'), 'DD/MM/YYYY') || '.',
        'Upcoming Booking',
        'Unread',
        false,
        NOW() AT TIME ZONE 'Asia/Kuching'
      FROM reservation r
      JOIN properties p ON p.propertyid = r.propertyid
      WHERE r.userid = $1
      AND LOWER(TRIM(r.reservationstatus)) = 'paid'
      AND r.checkindatetime IS NOT NULL
      AND (r.checkindatetime AT TIME ZONE 'Asia/Kuching')::date
        = (NOW() AT TIME ZONE 'Asia/Kuching')::date + INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1
        FROM notifications n
        WHERE n.userid = r.userid
        AND n.reservationid = r.reservationid
        AND n.notificationtype = 'Upcoming Booking'
      )
      `,
      [userid]
    );

    res.status(200).json({ message: 'Booking alerts synced successfully' });
  } catch (error) {
    console.error('Failed to sync booking alerts:', error.message);
    console.error(error);

    res.status(500).json({
      message: 'Failed to sync booking alerts',
      details: error.message
    });
  }
});

// Get all notifications for a user
app.get('/notifications', async (req, res) => {
    const { userid } = req.query;
    let client;

    if (!userid) {
        return res.status(400).json({ message: 'userid is required' });
    }

    try {
        client = await pool.connect();

        const result = await client.query(
            `
            SELECT *
            FROM notifications
            WHERE userid = $1
            ORDER BY timestamp DESC
            `,
            [userid]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    } finally {
        if (client) client.release();
    }
});

// Create a new notification
app.post('/notifications', async (req, res) => {
    const {
        userid,
        reservationid,
        propertyid,
        notificationtitle,
        notificationmessage,
        notificationtype,
        notificationstatus
    } = req.body;

    let client;

    if (!userid || !notificationtitle || !notificationmessage || !notificationtype) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const result = await client.query(
            `
            INSERT INTO notifications (
                userid,
                reservationid,
                propertyid,
                notificationtitle,
                notificationmessage,
                notificationtype,
                notificationstatus
            )
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Unread'))
            RETURNING *
            `,
            [
                userid,
                reservationid || null,
                propertyid || null,
                notificationtitle,
                notificationmessage,
                notificationtype,
                notificationstatus || 'Unread'
            ]
        );

        await client.query('COMMIT');

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Failed to create notification' });
    } finally {
        if (client) client.release();
    }
});

// Mark one notification as read
app.put('/notifications/:notificationid/read', async (req, res) => {
    const { notificationid } = req.params;
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const result = await client.query(
            `
            UPDATE notifications
            SET isread = TRUE,
                notificationstatus = 'Read'
            WHERE notificationid = $1
            RETURNING *
            `,
            [notificationid]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Notification not found' });
        }

        await client.query('COMMIT');

        res.status(200).json(result.rows[0]);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to update notification' });
    } finally {
        if (client) client.release();
    }
});

// Mark all notifications as read for a user
app.put('/notifications/read-all/:userid', async (req, res) => {
    const { userid } = req.params;
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        await client.query(
            `
            UPDATE notifications
            SET isread = TRUE,
                notificationstatus = 'Read'
            WHERE userid = $1
            `,
            [userid]
        );

        await client.query('COMMIT');

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Failed to update notifications' });
    } finally {
        if (client) client.release();
    }
});

// Auto-expire reservations when payment deadline has passed
// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const expiredResult = await client.query(`
      UPDATE reservation r
      SET reservationstatus = 'Expired'
      WHERE LOWER(TRIM(r.reservationstatus)) IN (
        'payment pending',
        'pending',
        'booking',
        'accepted',
        'partially paid'
      )
      AND r.reservationblocktime IS NOT NULL
AND r.reservationblocktime < NOW()
      RETURNING
        r.reservationid,
        r.propertyid,
        r.userid,
        r.rcid,
        r.checkindatetime,
        r.checkoutdatetime,
        r.totalprice,
        r.downpaymentamount,
        r.request
    `);

    if (expiredResult.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    for (const reservation of expiredResult.rows) {
      const propertyResult = await client.query(
        `
        SELECT 
          p.propertyaddress,
          p.userid AS owner_userid,
          rc.rcfirstname,
          rc.rclastname
        FROM properties p
        LEFT JOIN reservation_customer_details rc ON rc.rcid = $1
        WHERE p.propertyid = $2
        `,
        [reservation.rcid, reservation.propertyid]
      );

      const propertyData = propertyResult.rows[0] || {};

      const totalAmount = parseFloat(reservation.totalprice || 0);
      const depositAmount = parseFloat(reservation.downpaymentamount || 0);
      const balanceAmount = Math.max(0, totalAmount - depositAmount);

      const roomPackageText = formatRoomPackageForLog(reservation.request);

      await client.query(
        `
        INSERT INTO book_and_pay_log (logtime, log, userid)
        VALUES ($1, $2, $3)
        `,
        [
          new Date(Date.now() + 8 * 60 * 60 * 1000),
          `System expired reservation #${reservation.reservationid} (${propertyData.propertyaddress || 'Unknown Property'}). Room/Package: ${roomPackageText}. Stock Restocked. Total: RM ${totalAmount.toFixed(2)} | Deposit Paid: RM ${depositAmount.toFixed(2)} | Balance Removed: RM ${balanceAmount.toFixed(2)}. Booking status changed to Expired.`,
          propertyData.owner_userid || reservation.userid || 0
        ]
      );

      await client.query(
        `
        UPDATE booking_ledger
        SET
          booking_status = 'Expired',
          stock_status = 'Restocked',
          credit = 0,
          expected_amount = COALESCE(gross_amount, $1::numeric, 0)
        WHERE reservationid = $2
        `,
        [totalAmount, reservation.reservationid]
      );

      const commRes = await client.query(
        'SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1'
      );

      const commRate = commRes.rows.length > 0
        ? parseFloat(commRes.rows[0].commission_rate)
        : 0.07;

      const commissionAmount = totalAmount * commRate;
      const moderatorEarning = totalAmount - commissionAmount;

      await insertLedgerEntry(client, {
        reservationid: reservation.reservationid,
        propertyid: reservation.propertyid,
        propertyname: propertyData.propertyaddress || 'Unknown Property',
        roomtype: roomPackageText,
        moderator_userid: propertyData.owner_userid || null,
        moderator_username: 'System',
        customer_userid: reservation.userid || null,
        customer_name: `${propertyData.rcfirstname || ''} ${propertyData.rclastname || ''}`.trim(),
        activity_type: 'Reservation Expired',
        stock_status: 'Restocked',
        booking_status: 'Expired',
        gross_amount: totalAmount,
        commission_rate: commRate,
        commission_amount: commissionAmount,
        moderator_earning: moderatorEarning,
        credit: 0,
        debit: moderatorEarning,
        expected_amount: 0,
        remarks: 'Booking expired automatically because the payment deadline passed.'
      });

      await client.query(
        `
        INSERT INTO audit_trail (
          entityid, timestamp, entitytype, actiontype, action, userid, username
        )
        VALUES ($1, NOW(), $2, $3, $4, $5, $6)
        `,
        [
          reservation.reservationid,
          'Reservation',
          'PATCH',
          'Auto Expire Reservation',
          propertyData.owner_userid || reservation.userid || 0,
          'System'
        ]
      );

      if (typeof notifyWaitlistedUsers === 'function') {
        notifyWaitlistedUsers(
          reservation.propertyid,
          reservation.checkindatetime,
          reservation.checkoutdatetime
        ).catch((error) => {
          console.error('[Cron] Waitlist notification failed:', error.message);
        });
      }
    }

    await client.query('COMMIT');

    console.log(
      `[Cron] Auto-expired ${expiredResult.rows.length} reservation(s):`,
      expiredResult.rows.map((row) => row.reservationid)
    );

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('[Cron] Reservation deadline expiry job failed:', err.message);

  } finally {
    if (client) {
      client.release();
    }
  }
});


// LEDGER PAGE API

app.get('/ledger', async (req, res) => {
const {
  userid,
  page = 1,
  limit = 10,
  search = '',
  status = '',
  selectedDate = '',
  sortOrder = 'latest'
} = req.query;

  if (!userid) {
    return res.status(400).json({ message: 'Missing userid parameter' });
  }

  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      `SELECT usergroup, clusterid FROM users WHERE userid = $1`,
      [userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const usergroup = userResult.rows[0].usergroup;
    const clusterid = userResult.rows[0].clusterid;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 10;
    const offset = (parsedPage - 1) * parsedLimit;

    let conditions = [];
    let values = [];
    let index = 1;

    // Role scope
    if (usergroup === 'Owner') {
      // Owner can see all ledger records
    } else if (usergroup === 'Moderator') {
      // Moderator can only see ledger records for properties created/managed by their own userid
      conditions.push(`COALESCE(p.userid, bl.moderator_userid) = $${index}`);
      values.push(userid);
      index++;
    } else if (usergroup === 'Administrator') {
      if (clusterid) {
        conditions.push(`u.clusterid = $${index}`);
        values.push(clusterid);
        index++;
      }
      // Administrator without clusterid can see all ledger records
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const roomTypeExpr = `
      COALESCE(
        NULLIF(
          TRIM(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                SUBSTRING(r.request FROM 'Room Selected:\\s*([\\s\\S]*)'),
                '(\\n|\\r|\\s)*Additional Requests:[\\s\\S]*$',
                '',
                'i'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ),
          ''
        ),
        bl.roomtype,
        'Standard'
      )
    `;

    const statusExpr = `
      CASE
        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('partially paid', 'partial paid')
        THEN 'partially paid'

        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('cancelled', 'canceled')
        THEN 'cancelled'

        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'expired'
        THEN 'expired'

        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'paid'
        THEN 'paid'

        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'accepted'
        THEN 'accepted'

        WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'payment pending'
        THEN 'payment pending'

        ELSE LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, '')))
      END
    `;

    if (search) {
  conditions.push(`(
    CAST(
      COALESCE(
        r.reservationid,
        bl.reservationid
      ) AS TEXT
    ) ILIKE $${index}

    OR (
      '#' ||
      CAST(
        COALESCE(
          r.reservationid,
          bl.reservationid
        ) AS TEXT
      )
    ) ILIKE $${index}

    OR bl.propertyname ILIKE $${index}
    OR bl.customer_name ILIKE $${index}
    OR COALESCE(
      u.username,
      bl.moderator_username,
      ''
    ) ILIKE $${index}
    OR bl.activity_type ILIKE $${index}
    OR ${roomTypeExpr} ILIKE $${index}
  )`);

  values.push(`%${search}%`);
  index++;
}

    if (status) {
      const normalizedStatus = String(status).toLowerCase().trim();

      if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
        conditions.push(`${statusExpr} = 'cancelled'`);
      } else if (normalizedStatus === 'partial paid' || normalizedStatus === 'partially paid') {
        conditions.push(`${statusExpr} = 'partially paid'`);
      } else if (normalizedStatus === 'paid') {
        conditions.push(`${statusExpr} = 'paid'`);
      } else if (normalizedStatus === 'expired') {
        conditions.push(`${statusExpr} = 'expired'`);
      } else if (normalizedStatus === 'accepted') {
        conditions.push(`${statusExpr} = 'accepted'`);
      } else if (normalizedStatus === 'payment pending') {
        conditions.push(`${statusExpr} = 'payment pending'`);
      }
    }

if (selectedDate) {
  conditions.push(`r.checkindatetime::date = $${index}::date`);
  values.push(selectedDate);
  index++;
}

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const joinClause = `
      LEFT JOIN reservation r ON r.reservationid = bl.reservationid
      LEFT JOIN properties p ON p.propertyid = COALESCE(r.propertyid, bl.propertyid)
      LEFT JOIN users u ON u.userid = COALESCE(p.userid, bl.moderator_userid)
    `;
const normalizedSortOrder = String(sortOrder).toLowerCase();

let orderByClause = `
  ORDER BY bl.timestamp DESC, bl.ledgerid DESC
`;

if (normalizedSortOrder === 'oldest') {
  orderByClause = `
    ORDER BY bl.timestamp ASC, bl.ledgerid ASC
  `;
}

if (normalizedSortOrder === 'reservation_latest') {
  orderByClause = `
    ORDER BY bl.reservationid DESC NULLS LAST, bl.timestamp DESC, bl.ledgerid DESC
  `;
}

if (normalizedSortOrder === 'reservation_oldest') {
  orderByClause = `
    ORDER BY bl.reservationid ASC NULLS LAST, bl.timestamp ASC, bl.ledgerid ASC
  `;
}

    const dataQuery = `
      SELECT
        bl.ledgerid,
        bl.reservationid,
        bl.propertyid,
        bl.propertyname,

        ${roomTypeExpr} AS roomtype,

        COALESCE(p.userid, bl.moderator_userid) AS moderator_userid,
        COALESCE(u.username, bl.moderator_username) AS moderator_username,
        bl.customer_userid,
        bl.customer_name,
        bl.activity_type,

        CASE
          WHEN ${statusExpr} IN ('paid', 'partially paid')
          THEN 'Deducted'

          WHEN ${statusExpr} IN ('expired', 'cancelled')
          THEN 'Restored'

          WHEN ${statusExpr} IN ('accepted', 'payment pending')
          THEN 'Reserved'

          ELSE COALESCE(bl.stock_status, 'Reserved')
        END AS stock_status,

        CASE
          WHEN ${statusExpr} = 'partially paid' THEN 'Partially Paid'
          WHEN ${statusExpr} = 'cancelled' THEN 'Cancelled'
          WHEN ${statusExpr} = 'expired' THEN 'Expired'
          WHEN ${statusExpr} = 'paid' THEN 'Paid'
          WHEN ${statusExpr} = 'accepted' THEN 'Accepted'
          WHEN ${statusExpr} = 'payment pending' THEN 'Payment Pending'
          ELSE COALESCE(r.reservationstatus, bl.booking_status, '—')
        END AS booking_status,

        COALESCE(r.totalprice, bl.gross_amount, 0) AS gross_amount,
        bl.commission_rate,
        bl.commission_amount,
        bl.moderator_earning,

       CASE
  WHEN ${statusExpr} = 'paid'
  THEN COALESCE(
    bl.moderator_earning,
    bl.credit,
    0
  )

  WHEN ${statusExpr} = 'partially paid'
  THEN GREATEST(
    COALESCE(
      r.totalprice,
      bl.gross_amount,
      0
    )
    -
    COALESCE(
      r.downpaymentamount,
      bl.debit,
      0
    ),
    0
  )

  WHEN ${statusExpr} = 'cancelled'
    AND LOWER(
      TRIM(
        COALESCE(
          bl.activity_type,
          ''
        )
      )
    ) = 'manual restock'
  THEN COALESCE(
    bl.credit,
    0
  )

  ELSE 0
END AS credit,

       CASE
  WHEN ${statusExpr} = 'partially paid'
  THEN COALESCE(
    r.downpaymentamount,
    bl.debit,
    0
  )

  WHEN ${statusExpr} = 'cancelled'
    AND LOWER(
      TRIM(
        COALESCE(
          bl.activity_type,
          ''
        )
      )
    ) = 'manual restock'
  THEN COALESCE(
    bl.debit,
    0
  )

  ELSE 0
END AS debit,

       CASE
  WHEN ${statusExpr} = 'paid'
  THEN COALESCE(
    r.totalprice,
    bl.gross_amount,
    0
  )

  WHEN ${statusExpr} = 'partially paid'
  THEN COALESCE(
    r.totalprice,
    bl.gross_amount,
    0
  )

  WHEN ${statusExpr} = 'cancelled'
    AND LOWER(
      TRIM(
        COALESCE(
          bl.activity_type,
          ''
        )
      )
    ) = 'manual restock'
  THEN COALESCE(
    bl.expected_amount,
    0
  )

  WHEN ${statusExpr} IN (
    'expired',
    'cancelled'
  )
  THEN COALESCE(
    r.totalprice,
    bl.gross_amount,
    bl.expected_amount,
    0
  )

  WHEN ${statusExpr} IN (
    'accepted',
    'payment pending'
  )
  THEN COALESCE(
    r.totalprice,
    bl.gross_amount,
    bl.expected_amount,
    0
  )

  ELSE 0
END AS expected_amount,

        bl.remarks,
bl.timestamp,
TO_CHAR(
  bl.timestamp + INTERVAL '8 hours',
  'YYYY-MM-DD HH24:MI:SS'
) AS formatted_timestamp,
        COALESCE(u.usergroup, 'Moderator') AS operator_role

      FROM booking_ledger bl
      ${joinClause}
      ${whereClause}
      ${orderByClause}
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM booking_ledger bl
      ${joinClause}
      ${whereClause}
    `;

    const result = await client.query(dataQuery, [...values, parsedLimit, offset]);
    const countResult = await client.query(countQuery, values);

    const total = parseInt(countResult.rows[0].total, 10) || 0;
    const totalPages = Math.ceil(total / parsedLimit);

    return res.status(200).json({
      ledger: result.rows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages
      }
    });

  } catch (err) {
    console.error('Error fetching ledger:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) client.release();
  }
});


// LEDGER SUMMARY API
app.get('/ledger/summary', async (req, res) => {
  const { userid, selectedDate = '', status = '', search = '' } = req.query;

  if (!userid) {
    return res.status(400).json({ message: 'Missing userid parameter' });
  }

  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      `SELECT usergroup, clusterid FROM users WHERE userid = $1`,
      [userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const usergroup = userResult.rows[0].usergroup;
    const clusterid = userResult.rows[0].clusterid;

    let conditions = [];
    let values = [];
    let index = 1;

    // Role scope
    if (usergroup === 'Owner') {
      // Owner can see all ledger records
    } else if (usergroup === 'Moderator') {
      // Moderator can only see ledger summary for properties created/managed by their own userid
      conditions.push(`COALESCE(p.userid, bl.moderator_userid) = $${index}`);
      values.push(userid);
      index++;
    } else if (usergroup === 'Administrator') {
      if (clusterid) {
        conditions.push(`u.clusterid = $${index}`);
        values.push(clusterid);
        index++;
      }
      // Administrator without clusterid can see all ledger records
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

if (selectedDate) {
  conditions.push(`r.checkindatetime::date = $${index}::date`);
  values.push(selectedDate);
  index++;
}

    const roomTypeExpr = `
  COALESCE(
    NULLIF(
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            SUBSTRING(r.request FROM 'Room Selected:\\s*([\\s\\S]*)'),
            '(\\n|\\r|\\s)*Additional Requests:[\\s\\S]*$',
            '',
            'i'
          ),
          '\\s+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    bl.roomtype,
    'Standard'
  )
`;

const statusExpr = `
  CASE
    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('partially paid', 'partial paid')
    THEN 'partially paid'

    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('cancelled', 'canceled')
    THEN 'cancelled'

    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'expired'
    THEN 'expired'

    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'paid'
    THEN 'paid'

    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'accepted'
    THEN 'accepted'

    WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'payment pending'
    THEN 'payment pending'

    ELSE LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, '')))
  END
`;

if (search) {
  conditions.push(`(
    CAST(
      COALESCE(
        r.reservationid,
        bl.reservationid
      ) AS TEXT
    ) ILIKE $${index}

    OR (
      '#' ||
      CAST(
        COALESCE(
          r.reservationid,
          bl.reservationid
        ) AS TEXT
      )
    ) ILIKE $${index}

    OR bl.propertyname ILIKE $${index}
    OR bl.customer_name ILIKE $${index}
    OR COALESCE(
      u.username,
      bl.moderator_username,
      ''
    ) ILIKE $${index}
    OR bl.activity_type ILIKE $${index}
    OR ${roomTypeExpr} ILIKE $${index}
  )`);

  values.push(`%${search}%`);
  index++;
}

if (status) {
  const normalizedStatus = String(status).toLowerCase().trim();

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    conditions.push(`${statusExpr} = 'cancelled'`);
  } else if (normalizedStatus === 'partial paid' || normalizedStatus === 'partially paid') {
    conditions.push(`${statusExpr} = 'partially paid'`);
  } else if (normalizedStatus === 'paid') {
    conditions.push(`${statusExpr} = 'paid'`);
  } else if (normalizedStatus === 'expired') {
    conditions.push(`${statusExpr} = 'expired'`);
  } else if (normalizedStatus === 'accepted') {
    conditions.push(`${statusExpr} = 'accepted'`);
  } else if (normalizedStatus === 'payment pending') {
    conditions.push(`${statusExpr} = 'payment pending'`);
  }
}

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    

    const query = `
      SELECT
        COALESCE(SUM(
  CASE
    WHEN ${statusExpr} = 'paid'
    THEN COALESCE(
      bl.moderator_earning,
      bl.credit,
      0
    )

    WHEN ${statusExpr} = 'partially paid'
    THEN GREATEST(
      COALESCE(
        r.totalprice,
        bl.gross_amount,
        0
      )
      -
      COALESCE(
        r.downpaymentamount,
        bl.debit,
        0
      ),
      0
    )

    WHEN ${statusExpr} = 'cancelled'
      AND LOWER(
        TRIM(
          COALESCE(
            bl.activity_type,
            ''
          )
        )
      ) = 'manual restock'
    THEN COALESCE(
      bl.credit,
      0
    )

    ELSE 0
  END
), 0) AS total_credit,

       COALESCE(SUM(
  CASE
    WHEN ${statusExpr} = 'partially paid'
    THEN COALESCE(
      r.downpaymentamount,
      bl.debit,
      0
    )

    WHEN ${statusExpr} = 'cancelled'
      AND LOWER(
        TRIM(
          COALESCE(
            bl.activity_type,
            ''
          )
        )
      ) = 'manual restock'
    THEN COALESCE(
      bl.debit,
      0
    )

    ELSE 0
  END
), 0) AS total_debit,

        COALESCE(SUM(
  CASE
    WHEN ${statusExpr} = 'paid'
    THEN COALESCE(
      r.totalprice,
      bl.gross_amount,
      0
    )

    WHEN ${statusExpr} = 'partially paid'
    THEN COALESCE(
      r.totalprice,
      bl.gross_amount,
      0
    )

    WHEN ${statusExpr} = 'cancelled'
      AND LOWER(
        TRIM(
          COALESCE(
            bl.activity_type,
            ''
          )
        )
      ) = 'manual restock'
    THEN COALESCE(
      bl.expected_amount,
      0
    )

    WHEN ${statusExpr} IN (
      'expired',
      'cancelled'
    )
    THEN COALESCE(
      r.totalprice,
      bl.gross_amount,
      bl.expected_amount,
      0
    )

    WHEN ${statusExpr} IN (
      'accepted',
      'payment pending'
    )
    THEN COALESCE(
      r.totalprice,
      bl.gross_amount,
      bl.expected_amount,
      0
    )

    ELSE 0
  END
), 0) AS total_expected,

        COALESCE(SUM(bl.commission_amount), 0) AS total_commission,
        COUNT(*) AS total_transactions

      FROM booking_ledger bl
      LEFT JOIN reservation r ON r.reservationid = bl.reservationid
      LEFT JOIN properties p ON p.propertyid = COALESCE(r.propertyid, bl.propertyid)
      LEFT JOIN users u ON u.userid = COALESCE(p.userid, bl.moderator_userid)
      ${whereClause}
    `;

    const result = await client.query(query, values);

    return res.status(200).json({
      summary: result.rows[0]
    });

  } catch (err) {
    console.error('Error fetching ledger summary:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      details: err.message
    });
  } finally {
    if (client) client.release();
  }
});

// FETCH SST RATE FOR CUSTOMER CHECKOUT
app.get('/api/sst', async (req, res) => {
    try {
        const result = await pool.query("SELECT sst_rate FROM global_pricing_settings ORDER BY id ASC LIMIT 1");
        
        if (result.rows.length > 0 && result.rows[0].sst_rate !== null) {
            res.json({ sst_rate: parseFloat(result.rows[0].sst_rate) });
        } else {
            res.json({ sst_rate: 0.08 }); // Default fallback to 8%
        }
    } catch (err) {
        console.error("Error fetching SST:", err);
        res.json({ sst_rate: 0.08 }); // Safe fallback if DB fails
    }
});


// Extract selected room/package from reservation request
const extractRoomNameForEmail = (request) => {
  if (!request) return 'Standard';

  const text = String(request || '');

  const roomMatch =
    text.match(/Room Selected:\s*([\s\S]*?)(?:\n\s*\n?Additional Requests:|\n\s*Package:|$)/i) ||
    text.match(/Room:\s*([\s\S]*?)(?:\n|$)/i);

  if (roomMatch?.[1]) {
    return roomMatch[1].replace(/\s+/g, ' ').trim();
  }

  const packageMatch =
    text.match(/Package:\s*([\s\S]*?)(?:\n\s*\n?Additional Requests:|$)/i) ||
    text.match(/Rate:\s*([\s\S]*?)(?:\n|$)/i);

  if (packageMatch?.[1]) {
    return packageMatch[1].replace(/\s+/g, ' ').trim();
  }

  return 'Standard';
};

const normalizeRoomText = (value = '') => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

const getRoomPossibleNames = (room = {}) => {
  return [
    room.roomname,
    room.room_name,
    room.name,
    room.roomName,
    room.baseRoomName,
    room.title,
    room.label
  ]
    .filter(Boolean)
    .map(normalizeRoomText);
};

const getRoomQuantity = (room = {}, fallback = 1) => {
  const qty = parseInt(
    room.quantity ??
    room.roomquantity ??
    room.roomQuantity ??
    room.qty ??
    fallback,
    10
  );

  return Number.isFinite(qty) && qty > 0 ? qty : fallback;
};

// Send email to notify about stock sold out (property owner)
const sendSoldOutRoomEmail = async (client, reservationid) => {
  const result = await client.query(
    `
    SELECT 
      r.reservationid,
      r.propertyid,
      r.checkindatetime,
      r.checkoutdatetime,
      r.request,
      p.propertyaddress,
      p.quantity,
      p.room_details,
      owner.uemail AS owner_email,
      owner.username AS owner_username
    FROM reservation r
    JOIN properties p ON p.propertyid = r.propertyid
    JOIN users owner ON owner.userid = p.userid
    WHERE r.reservationid = $1
    `,
    [reservationid]
  );

  if (result.rows.length === 0) return;

  const data = result.rows[0];

  if (!data.owner_email) return;

  const selectedRoom = extractRoomNameForEmail(data.request);
  const normalizedSelectedRoom = normalizeRoomText(selectedRoom);

  let totalStock = parseInt(data.quantity || 1, 10) || 1;
  let matchedRoomName = selectedRoom;

  if (data.room_details) {
    try {
      const rooms =
        typeof data.room_details === 'string'
          ? JSON.parse(data.room_details || '[]')
          : data.room_details;

      const matchedRoom = Array.isArray(rooms)
        ? rooms.find((room) => {
            const possibleNames = getRoomPossibleNames(room);

            return possibleNames.some((name) =>
              normalizedSelectedRoom.includes(name) ||
              name.includes(normalizedSelectedRoom)
            );
          })
        : null;

      if (matchedRoom) {
        totalStock = getRoomQuantity(matchedRoom, totalStock);
        matchedRoomName =
          matchedRoom.roomname ||
          matchedRoom.room_name ||
          matchedRoom.name ||
          selectedRoom;
      }
    } catch (error) {
      console.log('Room details parse skipped:', error.message);
    }
  }

  // Count only bookings for the same room/package, not the whole property.
  const bookedResult = await client.query(
    `
    SELECT reservationid, request
    FROM reservation
    WHERE propertyid = $1
      AND LOWER(TRIM(reservationstatus)) IN ('paid', 'partially paid')
      AND checkindatetime < $3
      AND checkoutdatetime > $2
    `,
    [data.propertyid, data.checkindatetime, data.checkoutdatetime]
  );

  const matchingBookings = bookedResult.rows.filter((booking) => {
    const bookedRoom = extractRoomNameForEmail(booking.request);
    const normalizedBookedRoom = normalizeRoomText(bookedRoom);

    return (
      normalizedBookedRoom === normalizedSelectedRoom ||
      normalizedBookedRoom.includes(normalizedSelectedRoom) ||
      normalizedSelectedRoom.includes(normalizedBookedRoom)
    );
  });

  const bookedCount = matchingBookings.length;
  const remainingStock = totalStock - bookedCount;

  console.log('SOLD OUT EMAIL CHECK:', {
    reservationid,
    propertyid: data.propertyid,
    selectedRoom,
    matchedRoomName,
    totalStock,
    bookedCount,
    remainingStock,
    overlappingReservations: matchingBookings.map((b) => b.reservationid)
  });

  if (remainingStock > 0) return;

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'CAMS System',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [
        {
          email: data.owner_email,
          name: data.owner_username || 'Property Owner'
        }
      ],
      subject: `Room Sold Out - ${data.propertyaddress}`,
      htmlContent: `
        <h2 style="margin: 0 0 16px; color: #111827;">Room Sold Out</h2>

        <p style="font-size: 15px; color: #374151;">
          Your room/property has reached full booking capacity for the selected date range.
        </p>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px 18px; border-radius: 8px; margin: 18px 0;">
          <p style="margin: 0 0 8px;"><b>Reservation ID:</b> ${data.reservationid}</p>
          <p style="margin: 0 0 8px;"><b>Property Name:</b> ${data.propertyaddress || 'N/A'}</p>
          <p style="margin: 0 0 8px;"><b>Room / Package:</b> ${matchedRoomName || selectedRoom}</p>
          <p style="margin: 0 0 8px;"><b>Check-in:</b> ${new Date(data.checkindatetime).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuching' })}</p>
          <p style="margin: 0 0 8px;"><b>Check-out:</b> ${new Date(data.checkoutdatetime).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuching' })}</p>
          <p style="margin: 0 0 8px;"><b>Total Stock:</b> ${totalStock}</p>
          <p style="margin: 0 0 8px;"><b>Booked Count:</b> ${bookedCount}</p>
          <p style="margin: 0;"><b>Remaining Stock:</b> 0</p>
        </div>

        <p style="font-size: 15px; color: #374151;">
          You may log in to your dashboard to review the booking and room availability.
        </p>

        <div style="margin: 18px 0;">
          <a href="https://sarawakadventures.com/login" 
            style="background-color: black; color: white; padding: 10px 22px; font-weight: bold; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login
          </a>
        </div>
      `
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  console.log(
    `Sold out email sent for reservation ${reservationid}, room/package: ${matchedRoomName || selectedRoom}`
  );
};

// Customer / Moderator submit question
// Admin review and publish FAQ

// Submit FAQ / Support Question
app.post('/support-question', upload.single('file'), async (req, res) => {
  const { userid, role, name, email, category, question } = req.body;
  const file = req.file;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  const cleanRole = String(role || '').trim().toLowerCase();

  if (!name || !email || !question) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and question are required'
    });
  }

  if (!['customer', 'moderator'].includes(cleanRole)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be Customer or Moderator'
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const insertResult = await client.query(
      `
      INSERT INTO faq_questions (
        userid,
        role,
        name,
        email,
        category,
        question,
        attachment_name,
        attachment_data,
        attachment_type,
        status,
        createdat
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
      RETURNING *
      `,
      [
        userid || null,
        cleanRole,
        name,
        email,
        category || 'others',
        question,
        file ? file.originalname : null,
        file ? file.buffer : null,
        file ? file.mimetype : null,
        timestamp
      ]
    );

    const savedQuestion = insertResult.rows[0];

    // Optional: email admins after saving into DB
    const adminsResult = await client.query(
      `
      SELECT username, uemail
      FROM users
      WHERE LOWER(TRIM(usergroup)) = 'administrator'
      AND uemail IS NOT NULL
      AND TRIM(uemail) <> ''
      `
    );

    if (adminsResult.rows.length > 0) {
      const adminRecipients = adminsResult.rows.map((admin) => ({
        email: admin.uemail,
        name: admin.username || 'Administrator'
      }));

      const emailPayload = {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS System',
          email: process.env.BREVO_SENDER_EMAIL
        },
        to: adminRecipients,
        replyTo: {
          email,
          name
        },
        subject: `New ${cleanRole} FAQ Question - ${category || 'Others'}`,
        htmlContent: `
          <h2>New FAQ Question Submitted</h2>
          <p>A ${cleanRole} has submitted a question through the FAQ form.</p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:8px;">
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Role:</b> ${cleanRole}</p>
            <p><b>Category:</b> ${category || 'Others'}</p>
            <p><b>Attachment:</b> ${file ? file.originalname : 'No attachment'}</p>
            <p><b>Question:</b></p>
            <p style="white-space:pre-line;">${question}</p>
          </div>

          <p>Please login to the Admin FAQ page to review and publish it if useful.</p>
        `
      };

      if (file) {
        emailPayload.attachment = [
          {
            name: file.originalname,
            content: file.buffer.toString('base64')
          }
        ];
      }

      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        emailPayload,
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (userid) {
  await client.query(
    `
    INSERT INTO audit_trail (
      entityid, timestamp, entitytype, actiontype, action, userid, username
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      savedQuestion.questionid,
      timestamp,
      'FAQ',
      'POST',
      'Submit FAQ Question',
      userid,
      name
    ]
  );
}

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Question submitted successfully',
      data: savedQuestion
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');

    console.error('FAQ submit error:', error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to submit question',
      details: error.message
    });

  } finally {
    if (client) client.release();
  }
});


// Admin: get all submitted FAQ questions
app.get('/admin/faq/questions', async (req, res) => {
  const { role, status, search } = req.query;

  let client;

  try {
    client = await pool.connect();

    const conditions = [];
    const values = [];

    if (role && role !== 'all') {
      values.push(role.toLowerCase());
      conditions.push(`LOWER(role) = $${values.length}`);
    }

    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      conditions.push(`
        (
          LOWER(name) LIKE $${values.length}
          OR LOWER(email) LIKE $${values.length}
          OR LOWER(category) LIKE $${values.length}
          OR LOWER(question) LIKE $${values.length}
        )
      `);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await client.query(
      `
      SELECT
        questionid AS id,
        userid,
        role,
        name,
        email,
        category,
        question,
        attachment_name AS attachmentname,
        attachment_type AS attachmenttype,
        status,
        adminanswer,
        reviewed_by AS reviewedby,
        reviewed_at AS reviewedat,
        published_faq_id AS publishedfaqid,
        TO_CHAR(createdat, 'YYYY-MM-DD HH24:MI:SS') AS createdat
      FROM faq_questions
      ${whereClause}
      ORDER BY createdat DESC
      `,
      values
    );

    return res.status(200).json({
      success: true,
      questions: result.rows
    });

  } catch (error) {
    console.error('Fetch FAQ questions error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ questions',
      details: error.message
    });

  } finally {
    if (client) client.release();
  }
});


// Admin: get FAQ dashboard stats
app.get('/admin/faq/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'reviewed') AS reviewed,
        COUNT(*) FILTER (WHERE status = 'published') AS published_questions,
        COUNT(*) FILTER (WHERE LOWER(role) = 'customer') AS customer,
        COUNT(*) FILTER (WHERE LOWER(role) = 'moderator') AS moderator,
        (
          SELECT COUNT(*)
          FROM published_faqs
          WHERE is_active = TRUE
        ) AS published
      FROM faq_questions
      `
    );

    return res.status(200).json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Fetch FAQ stats error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ stats',
      details: error.message
    });
  }
});


// Admin: mark question reviewed
app.patch('/admin/faq/questions/:questionid/review', async (req, res) => {
  const { questionid } = req.params;
  const { adminanswer, reviewedBy } = req.body;

  if (!adminanswer || !adminanswer.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Admin answer is required'
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE faq_questions
      SET
        status = 'reviewed',
        adminanswer = $1,
        reviewed_by = $2,
        reviewed_at = NOW()
      WHERE questionid = $3
      RETURNING *
      `,
      [adminanswer, reviewedBy || null, questionid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ question not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Question marked as reviewed',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Review FAQ question error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to review question',
      details: error.message
    });
  }
});


// Admin: publish reviewed question to public FAQ
app.post('/admin/faq/questions/:questionid/publish', async (req, res) => {
  const { questionid } = req.params;
  const { answer, category, publishedBy } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Answer is required before publishing'
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const questionResult = await client.query(
      `
      SELECT *
      FROM faq_questions
      WHERE questionid = $1
      `,
      [questionid]
    );

    if (questionResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'FAQ question not found'
      });
    }

    const question = questionResult.rows[0];

    const faqResult = await client.query(
      `
      INSERT INTO published_faqs (
        questionid,
        category,
        question,
        answer,
        source_role,
        published_by,
        is_active,
        createdat,
        updatedat
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
      RETURNING *
      `,
      [
        questionid,
        category || question.category || 'others',
        question.question,
        answer,
        question.role,
        publishedBy || null
      ]
    );

    const publishedFaq = faqResult.rows[0];

    await client.query(
      `
      UPDATE faq_questions
      SET
        status = 'published',
        adminanswer = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        published_faq_id = $3
      WHERE questionid = $4
      `,
      [
        answer,
        publishedBy || null,
        publishedFaq.faqid,
        questionid
      ]
    );

    await client.query(
      `
      INSERT INTO audit_trail (
        entityid, timestamp, entitytype, actiontype, action, userid, username
      )
      VALUES ($1, NOW(), $2, $3, $4, $5, $6)
      `,
      [
        publishedFaq.faqid,
        'FAQ',
        'POST',
        'Publish FAQ',
        publishedBy || null,
        'Administrator'
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'FAQ published successfully',
      data: publishedFaq
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');

    console.error('Publish FAQ error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to publish FAQ',
      details: error.message
    });

  } finally {
    if (client) client.release();
  }
});


// Admin: reject submitted FAQ question
app.patch('/admin/faq/questions/:questionid/reject', async (req, res) => {
  const { questionid } = req.params;
  const { reviewedBy } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE faq_questions
      SET
        status = 'rejected',
        reviewed_by = $1,
        reviewed_at = NOW()
      WHERE questionid = $2
      RETURNING *
      `,
      [reviewedBy || null, questionid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ question not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Question rejected successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Reject FAQ question error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to reject question',
      details: error.message
    });
  }
});


// Public/customer/moderator: get published FAQs
app.get('/faqs', async (req, res) => {
  const { category, search } = req.query;

  let client;

  try {
    client = await pool.connect();

    const conditions = [`is_active = TRUE`];
    const values = [];

    if (category && category !== 'all') {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      conditions.push(`
        (
          LOWER(question) LIKE $${values.length}
          OR LOWER(answer) LIKE $${values.length}
          OR LOWER(category) LIKE $${values.length}
        )
      `);
    }

    const result = await client.query(
      `
      SELECT
        faqid AS id,
        questionid,
        category,
        question AS q,
        answer AS a,
        source_role AS sourcerole,
        TO_CHAR(createdat, 'YYYY-MM-DD') AS createdat
      FROM published_faqs
      WHERE ${conditions.join(' AND ')}
      ORDER BY createdat DESC
      `,
      values
    );

    return res.status(200).json({
      success: true,
      faqs: result.rows
    });

  } catch (error) {
    console.error('Fetch public FAQs error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      details: error.message
    });

  } finally {
    if (client) client.release();
  }
});


// Admin: get published FAQs
app.get('/admin/faq/published', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        faqid AS id,
        questionid,
        category,
        question,
        answer,
        source_role AS sourcerole,
        published_by AS publishedby,
        is_active AS isactive,
        TO_CHAR(createdat, 'YYYY-MM-DD HH24:MI:SS') AS createdat
      FROM published_faqs
      WHERE is_active = TRUE
      ORDER BY createdat DESC
      `
    );

    return res.status(200).json({
      success: true,
      faqs: result.rows
    });

  } catch (error) {
    console.error('Fetch admin published FAQs error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch published FAQs',
      details: error.message
    });
  }
});


// Admin: delete / hide published FAQ
app.delete('/admin/faq/published/:faqid', async (req, res) => {
  const { faqid } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE published_faqs
      SET is_active = FALSE, updatedat = NOW()
      WHERE faqid = $1
      RETURNING *
      `,
      [faqid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Published FAQ not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FAQ removed from public page'
    });

  } catch (error) {
    console.error('Delete published FAQ error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to remove FAQ',
      details: error.message
    });
  }
});

app.post('/faq/questions/:id/reply-email', async (req, res) => {
  const { id } = req.params;
  const { answer, repliedBy } = req.body;

  if (!answer || !String(answer).trim()) {
    return res.status(400).json({ message: 'Answer is required.' });
  }

  const client = await pool.connect();

  try {
    const questionResult = await client.query(
      `
      SELECT questionid AS id, name, email, question, category
      FROM faq_questions
      WHERE questionid = $1
      `,
      [id]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    const question = questionResult.rows[0];

    if (!question.email) {
      return res.status(400).json({ message: 'User email not found.' });
    }

    let repliedByName = 'CAMS Support Team';

if (repliedBy) {
  const adminResult = await client.query(
    `
    SELECT 
      username,
      ufirstname,
      ulastname,
      usergroup
    FROM users
    WHERE userid = $1
    `,
    [repliedBy]
  );

  if (adminResult.rows.length > 0) {
    const admin = adminResult.rows[0];

    const fullName = `${admin.ufirstname || ''} ${admin.ulastname || ''}`.trim();

    repliedByName = fullName || admin.username || 'CAMS Support Team';
  }
}

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'CAMS Support',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email: question.email,
            name: question.name || 'User',
          },
        ],
       subject: 'CAMS Support has replied to your question',
       htmlContent: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color:#1f2937;">
    <h2 style="margin-bottom: 8px;">Your question has been answered</h2>

    <p>Hello ${question.name || 'User'},</p>

    <p>
      Thank you for contacting CAMS Support. We appreciate you taking the time
      to send us your question. Our team has reviewed your enquiry and replied
      below.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;margin:14px 0;">
      <p style="margin:0 0 8px 0;"><strong>Your Question:</strong></p>
      <p style="white-space:pre-line;margin:0;">${question.question}</p>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:8px;margin:14px 0;">
      <p style="margin:0 0 8px 0;"><strong>Reply from ${repliedByName}:</strong></p>
      <p style="white-space:pre-line;margin:0;">${answer.trim()}</p>
    </div>

    <p>
      We hope this answer helps you. If you still need further assistance,
      you may submit another question through the FAQ support form.
    </p>

    <p>
      Thank you for using CAMS.
    </p>

    <p style="margin-top:18px;">
      Best regards,<br/>
      <strong>${repliedByName}</strong><br/>
      CAMS Support Team
    </p>
  </div>
`,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    await client.query(
      `
      UPDATE faq_questions
      SET adminanswer = $1,
          status = CASE WHEN status = 'pending' THEN 'reviewed' ELSE status END,
          reviewed_by = $2,
          reviewed_at = NOW()
      WHERE questionid = $3
      `,
      [answer.trim(), repliedBy || null, id]
    );

    return res.json({
      success: true,
      message: 'Reply email sent successfully.',
    });
  } catch (error) {
    console.error('FAQ reply email error:', error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to send reply email.' });
  } finally {
    client.release();
  }
});
// Owner + Administrator: view all
// Moderator: view own properties only

app.get('/finance/ledger-card', async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({
      success: false,
      message: 'Missing userid parameter',
    });
  }

  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      `
      SELECT userid, usergroup
      FROM users
      WHERE userid = $1
      `,
      [userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const usergroup = userResult.rows[0].usergroup;

    const conditions = [];
    const values = [];
    let index = 1;

    // Owner and Administrator can view all finance records.
    // Moderator can only view finance records for their own properties.
    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      // no restriction
    } else if (usergroup === 'Moderator') {
      conditions.push(`COALESCE(p.userid, bl.moderator_userid) = $${index}`);
      values.push(userid);
      index++;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      WITH latest_ledger AS (
        SELECT DISTINCT ON (COALESCE(reservationid, -ledgerid))
          *
        FROM booking_ledger
        ORDER BY COALESCE(reservationid, -ledgerid), timestamp DESC, ledgerid DESC
      ),

      base_scope AS (
        SELECT
          bl.ledgerid,
          bl.reservationid,
          bl.propertyid,
          bl.propertyname,
          bl.moderator_userid,
          bl.moderator_username,
          bl.activity_type,
          bl.booking_status,
          bl.gross_amount,
          bl.commission_rate,
          bl.commission_amount,
          bl.moderator_earning,
          bl.credit,
          bl.debit,
          bl.expected_amount,
          bl.timestamp,

          r.reservationstatus,
          r.totalprice,
          r.downpaymentamount,
          r.checkindatetime,
          r.checkoutdatetime,

          p.userid AS property_owner_userid,
          p.propertyaddress,

          TO_CHAR(COALESCE(r.checkindatetime, bl.timestamp), 'YYYY-MM') AS month,

          CASE
            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('partially paid', 'partial paid')
              THEN 'partially paid'

            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) IN ('cancelled', 'canceled')
              THEN 'cancelled'

            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'expired'
              THEN 'expired'

            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'paid'
              THEN 'paid'

            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'accepted'
              THEN 'accepted'

            WHEN LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, ''))) = 'payment pending'
              THEN 'payment pending'

            ELSE LOWER(TRIM(COALESCE(r.reservationstatus, bl.booking_status, '')))
          END AS normalized_status

        FROM latest_ledger bl
        LEFT JOIN reservation r ON r.reservationid = bl.reservationid
        LEFT JOIN properties p ON p.propertyid = COALESCE(r.propertyid, bl.propertyid)
        ${whereClause}
      ),

      calc_scope AS (
        SELECT
          *,

          COALESCE(totalprice, gross_amount, 0) AS booking_total,

          CASE
  WHEN normalized_status = 'paid'
  THEN COALESCE(
    moderator_earning,
    credit,
    0
  )

  WHEN normalized_status = 'cancelled'
    AND LOWER(
      TRIM(
        COALESCE(
          activity_type,
          ''
        )
      )
    ) = 'manual restock'
  THEN COALESCE(
    credit,
    moderator_earning,
    0
  )

  ELSE 0
END AS paid_operator_earning,

          CASE
            WHEN normalized_status = 'partially paid'
              THEN COALESCE(downpaymentamount, debit, 0)
            ELSE 0
          END AS deposit_paid,

          CASE
            WHEN normalized_status = 'partially paid'
              THEN GREATEST(
                COALESCE(totalprice, gross_amount, 0) - COALESCE(downpaymentamount, debit, 0),
                0
              )
            ELSE 0
          END AS balance_remaining,

          CASE
  WHEN normalized_status IN (
    'paid',
    'partially paid'
  )
  THEN COALESCE(
    commission_amount,
    0
  )

  WHEN normalized_status = 'cancelled'
    AND LOWER(
      TRIM(
        COALESCE(
          activity_type,
          ''
        )
      )
    ) = 'manual restock'
  THEN COALESCE(
    commission_amount,
    0
  )

  ELSE 0
END AS commission_value,

          CASE
  WHEN normalized_status IN (
    'paid',
    'partially paid',
    'accepted',
    'payment pending'
  )
  THEN COALESCE(
    totalprice,
    gross_amount,
    expected_amount,
    0
  )

WHEN normalized_status = 'cancelled'
  AND LOWER(
    TRIM(
      COALESCE(
        activity_type,
        ''
      )
    )
  ) = 'manual restock'
THEN GREATEST(
  COALESCE(
    totalprice,
    gross_amount,
    0
  )
  -
  COALESCE(
    debit,
    0
  ),
  0
)

  ELSE 0
END AS active_revenue

        FROM base_scope
      ),

      summary AS (
        SELECT
          COALESCE(SUM(active_revenue), 0) AS total_revenue,
          COALESCE(SUM(paid_operator_earning), 0) AS total_operator_earning,
          COALESCE(SUM(deposit_paid), 0) AS total_deposit_paid,
          COALESCE(SUM(balance_remaining), 0) AS total_expected_balance,
          COALESCE(SUM(commission_value), 0) AS total_commission,

          COUNT(*) AS total_transactions,

          COUNT(*) FILTER (WHERE normalized_status = 'paid') AS paid_count,
          COUNT(*) FILTER (WHERE normalized_status = 'partially paid') AS partially_paid_count,
          COUNT(*) FILTER (WHERE normalized_status = 'cancelled') AS cancelled_count,
          COUNT(*) FILTER (WHERE normalized_status = 'expired') AS expired_count
        FROM calc_scope
      ),

      monthly_summary AS (
        SELECT
          month,
          COALESCE(SUM(active_revenue), 0) AS monthly_revenue,
          COALESCE(SUM(paid_operator_earning), 0) AS monthly_earning,
          COALESCE(SUM(deposit_paid), 0) AS monthly_deposit,
          COALESCE(SUM(balance_remaining), 0) AS monthly_expected_balance,
          COALESCE(SUM(commission_value), 0) AS monthly_commission,
          COUNT(*) AS monthly_transactions
        FROM calc_scope
        WHERE month IS NOT NULL
        GROUP BY month
        ORDER BY month
      )

      SELECT
        s.total_revenue,
        s.total_operator_earning,
        s.total_deposit_paid,
        s.total_expected_balance,
        s.total_commission,
        s.total_transactions,
        s.paid_count,
        s.partially_paid_count,
        s.cancelled_count,
        s.expired_count,

        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'month', month,
                'monthlyrevenue', monthly_revenue,
                'monthlyearning', monthly_earning,
                'monthlydeposit', monthly_deposit,
                'monthlyexpectedbalance', monthly_expected_balance,
                'monthlycommission', monthly_commission,
                'monthlytransactions', monthly_transactions
              )
              ORDER BY month
            )
            FROM monthly_summary
          ),
          '[]'
        ) AS monthly_data

      FROM summary s;
    `;

    const result = await client.query(query, values);
    const row = result.rows[0] || {};

    return res.status(200).json({
      success: true,
      usergroup,
      summary: {
        totalRevenue: Number(row.total_revenue || 0),
        totalOperatorEarning: Number(row.total_operator_earning || 0),
        totalDepositPaid: Number(row.total_deposit_paid || 0),
        totalExpectedBalance: Number(row.total_expected_balance || 0),
        totalCommission: Number(row.total_commission || 0),
        totalTransactions: Number(row.total_transactions || 0),
        paidCount: Number(row.paid_count || 0),
        partiallyPaidCount: Number(row.partially_paid_count || 0),
        cancelledCount: Number(row.cancelled_count || 0),
        expiredCount: Number(row.expired_count || 0),
      },
      monthlyData: row.monthly_data || [],
    });

  } catch (err) {
    console.error('Finance ledger card error:', err);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      details: err.message,
    });
  } finally {
    if (client) client.release();
  }
});


// Owner + Administrator: view all
// Moderator: view own property reviews only

app.get('/finance/review-chart', async (req, res) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).json({
      success: false,
      message: 'Missing userid parameter',
    });
  }

  let client;

  try {
    client = await pool.connect();

    const userResult = await client.query(
      `
      SELECT userid, usergroup
      FROM users
      WHERE userid = $1
      `,
      [userid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const usergroup = userResult.rows[0].usergroup;

    const conditions = [`(r.is_deleted = false OR r.is_deleted IS NULL)`];
    const values = [];
    let index = 1;

    if (usergroup === 'Owner' || usergroup === 'Administrator') {
      // no restriction
    } else if (usergroup === 'Moderator') {
      conditions.push(`p.userid = $${index}`);
      values.push(userid);
      index++;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      WITH review_scope AS (
        SELECT
          r.reviewid,
          r.rating,
          r.reviewdate,
          p.propertyid,
          p.propertyaddress,
          p.userid AS property_owner_userid,
          TO_CHAR(r.reviewdate, 'YYYY-MM') AS month
        FROM reviews r
        JOIN properties p ON p.propertyid = r.propertyid
        ${whereClause}
      ),

      summary AS (
        SELECT
          COUNT(*) AS total_reviews,
          COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS overall_rating
        FROM review_scope
      ),

      monthly_summary AS (
        SELECT
          month,
          COUNT(*) AS total_reviews,
          COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating
        FROM review_scope
        WHERE month IS NOT NULL
        GROUP BY month
        ORDER BY month
      )

      SELECT
        s.total_reviews,
        s.overall_rating,

        COALESCE(
          (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'month', month,
                'totalReviews', total_reviews,
                'averageRating', average_rating
              )
              ORDER BY month
            )
            FROM monthly_summary
          ),
          '[]'
        ) AS monthly_data

      FROM summary s;
    `;

    const result = await client.query(query, values);
    const row = result.rows[0] || {};

    return res.status(200).json({
      success: true,
      usergroup,
      summary: {
        totalReviews: Number(row.total_reviews || 0),
        overallRating: Number(row.overall_rating || 0),
      },
      monthlyData: row.monthly_data || [],
    });

  } catch (err) {
    console.error('Finance review chart error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch review chart data',
      details: err.message,
    });
  } finally {
    if (client) client.release();
  }
});

// MFA (TWO-FACTOR AUTH) API CALLS

// 1. Send Email OTP (Adapted for Brevo)
app.post('/mfa/send-email-otp', async (req, res) => {
  const { tempToken } = req.body;
  let client;
  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'mfa_verification') return res.status(401).json({ success: false, message: 'Invalid token.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); 

    client = await pool.connect();
    await client.query(`UPDATE users SET email_otp = $1, email_otp_expiry = $2 WHERE userid = $3`, [code, expiry, decoded.userid]);
    const userResult = await client.query(`SELECT uemail, username FROM users WHERE userid = $1`, [decoded.userid]);
    const user = userResult.rows[0];

    if (!user?.uemail) return res.status(404).json({ success: false, message: 'User email not found.' });

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: process.env.BREVO_SENDER_NAME || 'CAMS System', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: user.uemail, name: user.username }],
        subject: 'Hello Sarawak — Your Login Verification Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #1A130B; margin-bottom: 8px;">Hello Sarawak</h2>
            <p style="color: #5C4A38; margin-bottom: 24px;">Your one-time login verification code:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #BF8C5A; text-align: center; padding: 20px; background: #F7F2EA; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 20px;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `
      },
      { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' } }
    );

    res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Send email OTP error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to send verification email.' });
  } finally {
    if (client) client.release();
  }
});

// 2. Verify MFA Login and Finalize
app.post('/mfa/verify-login', async (req, res) => {
  const { tempToken, token, method } = req.body;
  let client;
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000);

  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'mfa_verification') return res.status(401).json({ success: false, message: 'Invalid token.' });

    client = await pool.connect();
    const result = await client.query(`SELECT * FROM users WHERE userid = $1`, [decoded.userid]);
    const user = result.rows[0];

    let verified = false;
    if (method === 'authenticator') {
      verified = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token, window: 3 });
    } else if (method === 'email') {
      if (user.email_otp === token && user.email_otp_expiry && new Date() < new Date(user.email_otp_expiry)) {
        verified = true;
        await client.query(`UPDATE users SET email_otp = NULL, email_otp_expiry = NULL WHERE userid = $1`, [user.userid]);
      }
    }

    if (!verified) return res.status(400).json({ success: false, message: 'Invalid or expired code.' });

    const incomingIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const incomingDevice = req.headers['user-agent'] || '';

    await client.query(
      `UPDATE users SET ustatus = 'login', last_login_ip = $1, last_login_device = $2 WHERE userid = $3`,
      [incomingIP, incomingDevice, user.userid]
    );

    await client.query(
      `INSERT INTO audit_trail (entityid, timestamp, entitytype, actiontype, action, userid, username) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.userid, timestamp, 'Users', 'POST', 'Login (MFA)', user.userid, user.username]
    );

    const tokenPayload = { userid: user.userid, usergroup: user.usergroup, username: user.username };
    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    setTokenCookies(res, accessToken, refreshToken);

    // ← Only change is here: include tokens in body for mobile clients
    const isMobile = req.headers['x-client-type'] === 'mobile';
    const responsePayload = {
      success: true, userid: user.userid, usergroup: user.usergroup,
      uactivation: user.uactivation, username: user.username,
    };
    if (isMobile) {
      responsePayload.accessToken = accessToken;
      responsePayload.refreshToken = refreshToken;
    }
    return res.json(responsePayload);

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    if (client) client.release();
  }
});

// 3. Setup MFA
app.post('/mfa/setup', async (req, res) => {
  const { userid } = req.body;
  try {
    const secret = speakeasy.generateSecret({ name: `Hello Sarawak`, issuer: 'Hello Sarawak' });
    await pool.query(`UPDATE users SET mfa_secret = $1 WHERE userid = $2`, [secret.base32, userid]);
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, qrCode: qrCodeUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate QR code.' });
  }
});

// 4. Verify Setup
app.post('/mfa/verify-setup', async (req, res) => {
  const { userid, token } = req.body;
  try {
    const result = await pool.query(`SELECT mfa_secret FROM users WHERE userid = $1`, [userid]);
    const verified = speakeasy.totp.verify({ secret: result.rows[0].mfa_secret, encoding: 'base32', token, window: 3 });
    
    if (verified) {
      await pool.query(`UPDATE users SET mfa_enabled = TRUE WHERE userid = $1`, [userid]);
      res.json({ success: true, message: 'MFA enabled successfully.' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid code.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// 5. Disable MFA
app.post('/mfa/disable', async (req, res) => {
  try {
    await pool.query(`UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE userid = $1`, [req.body.userid]);
    res.json({ success: true, message: 'MFA disabled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Start the server only after
// Audit Trail timezone protection is ready.
const startServer = async () => {
  try {
    await setupAuditTrailTimestamp();

    app.listen(port, () => {
      console.log(
        `Server running on http://localhost:${port}`
      );
    });
  } catch (error) {
    console.error(
      'Failed to prepare Audit Trail timestamp:',
      error
    );

    process.exit(1);
  }
};

startServer();

// Schedule a daily job to send payment reminders at 9:00 AM Malaysia/Sarawak time
cron.schedule(
  '0 9 * * *',
  async () => {
    console.log('Running scheduled payment reminder job...');

    try {
      const response = await fetch(`http://localhost:${port}/send_payment_reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch (_) {
        result = text;
      }

      console.log('Scheduled payment reminder status:', response.status);
      console.log('Scheduled payment reminder result:', result);
    } catch (error) {
      console.error('Scheduled payment reminder job failed:', error.message);
    }
  },
  {
    timezone: 'Asia/Kuching',
  }
);
