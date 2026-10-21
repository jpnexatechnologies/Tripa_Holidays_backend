const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const openapi = require('./config/swagger')
const requestMetrics = require('./middleware/requestMetrics')
const { corsOrigins, nodeEnv } = require('./config/env')
const { pingDb } = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const resourceRoutes = require('./routes/resourceRoutes')
const mailRoutes = require('./routes/mailRoutes')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const asyncHandler = require('./utils/asyncHandler')

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use('/api/docs', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https:; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; connect-src 'self'"
  )
  next()
})
app.use(compression())
app.use(
  cors({
    origin (origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin))
        return callback(null, true)
      return callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(requestMetrics)
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
)
app.get('/health', asyncHandler(async (req, res) => {
  try {
    await pingDb()
  } catch (error) {
    console.error('Health check database ping failed:', error)
    return res.status(503).json({
      status: 'DOWN',
      service: 'tripaholidays-express-api',
      environment: nodeEnv,
      database: 'DOWN',
      timestamp: new Date().toISOString()
    })
  }

  res.json({
    status: 'UP',
    service: 'tripaholidays-express-api',
    environment: nodeEnv,
    database: 'UP',
    timestamp: new Date().toISOString()
  })
}))
app.use('/api/auth', authRoutes)
app.use('/api', resourceRoutes)
app.use('/api/mail', mailRoutes)

app.get('/api/openapi.json', (req, res) => res.json(openapi))
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, { explorer: true })
)
app.use(notFound)
app.use(errorHandler)
module.exports = app
