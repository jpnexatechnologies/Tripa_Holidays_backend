const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { findRecord, getCollection, insertRecord } = require('../config/db')
const { jwtSecret, jwtExpiresIn } = require('../config/env')
const HttpError = require('../utils/httpError')

function publicUser (user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    joined: user.joined,
    role: String(user.role).toLowerCase()
  }
}
function makeAuth (user) {
  const token = jwt.sign({ email: user.email, role: user.role }, jwtSecret, {
    subject: String(user.id),
    expiresIn: jwtExpiresIn
  })
  return {
    token,
    role: String(user.role).toLowerCase(),
    user: publicUser(user)
  }
}
async function register ({ name, email, password, phone }) {
  if (!name || !email || !password)
    throw new HttpError(400, 'Name, email, and password are required.')
  if (String(password).length < 8)
    throw new HttpError(400, 'Password must be at least 8 characters.')
  const normalizedEmail = String(email).trim().toLowerCase()
  const users = await getCollection('users')
  if (await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } }))
    throw new HttpError(409, 'An account with this email already exists.')
  const hash = await bcrypt.hash(password, 12)
  let user
  try {
    user = await insertRecord('users', {
      name: String(name).trim(),
      email: normalizedEmail,
      password: hash,
      phone: phone || null,
      joined: new Date().toISOString().slice(0, 10),
      role: 'USER'
    })
  } catch (error) {
    if (error.code === 11000)
      throw new HttpError(409, 'An account with this email already exists.')
    throw error
  }
  return makeAuth(user)
}
async function login ({ email, password }) {
  if (!email || !password)
    throw new HttpError(400, 'Email and password are required.')
  const users = await getCollection('users')
  const user = await users.findOne({ email: String(email).trim().toLowerCase() })
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new HttpError(401, 'Invalid email or password.')
  return makeAuth({ ...user, id: user._id })
}
module.exports = { register, login, publicUser }
