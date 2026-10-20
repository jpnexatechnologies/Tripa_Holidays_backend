const bcrypt = require('bcryptjs')
const { getCollection, insertRecord } = require('./config/db')
const { admin } = require('./config/env')

;(async () => {
  if (!admin.seed) {
    console.log('Admin seeding disabled.')
    return
  }
  if (!admin.password || admin.password.length < 12)
    throw new Error('Set ADMIN_PASSWORD to a strong password of at least 12 characters before enabling SEED_ADMIN.')
  const users = await getCollection('users')
  const existing = await users.findOne({ email: admin.email }, { projection: { _id: 1 } })
  if (existing) {
    console.log(`Admin account already exists: ${admin.email}`)
    return
  }
  const password = await bcrypt.hash(admin.password, 12)
  await insertRecord('users', {
    name: admin.name,
    email: admin.email,
    password,
    phone: null,
    joined: new Date().toISOString().slice(0, 10),
    role: 'ADMIN'
  })
  console.log(`Created initial administrator: ${admin.email}`)
})()
  .catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
