const jwt = require('jsonwebtoken')
const { findRecord } = require('../config/db')
const { jwtSecret } = require('../config/env')
const HttpError = require('../utils/httpError')

async function authenticate (req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token)
      throw new HttpError(401, 'Please log in to continue.')
    const claims = jwt.verify(token, jwtSecret)
    const user = await findRecord('users', claims.sub)
    if (!user)
      throw new HttpError(401, 'User account no longer exists.')
    req.user = user
    next()
  } catch (error) {
    if (error instanceof HttpError) return next(error)
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    )
      return next(new HttpError(401, 'Invalid or expired token.'))
    next(error)
  }
}
function requireAdmin (req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Authentication required.'))
  if (String(req.user.role).toUpperCase() !== 'ADMIN')
    return next(new HttpError(403, 'Administrator access required.'))
  next()
}
function optionalAuth (req, res, next) {
  const header = req.headers.authorization || ''
  if (!header) return next()
  authenticate(req, res, next)
}
module.exports = { authenticate, requireAdmin, optionalAuth }
