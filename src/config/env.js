const dotenv = require('dotenv')
dotenv.config()

const required = ['MONGODB_URI', 'JWT_SECRET']
const missing = required.filter(key => !process.env[key])
if (missing.length)
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.')
}
if (!/^mongodb(\+srv)?:\/\//i.test(process.env.MONGODB_URI)) {
  throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.')
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8085),
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME || 'tripaholidays',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigins: (process.env.CORS_ORIGINS || 'https://tripa-holidays-backend.vercel.app/,http://localhost:3000')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
  admin: {
    seed: process.env.SEED_ADMIN === 'true',
    name: process.env.ADMIN_NAME || 'Trip Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || ''
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.MAIL_FROM || process.env.SMTP_USER
  }
}
