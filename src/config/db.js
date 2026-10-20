const { MongoClient } = require('mongodb')
const { mongoUri, mongoDbName } = require('./env')

const globalState = globalThis
globalState.__tripaMongo = globalState.__tripaMongo || {}
const state = globalState.__tripaMongo
state.counterReady = state.counterReady || new Map()

function getClient () {
  if (!state.clientPromise) {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      serverSelectionTimeoutMS: 10000
    })
    state.clientPromise = client.connect().catch(error => {
      state.clientPromise = null
      throw error
    })
  }
  return state.clientPromise
}

async function getDb () {
  const client = await getClient()
  const database = client.db(mongoDbName)
  if (!state.indexPromise) {
    state.indexPromise = Promise.all([
      database.collection('users').createIndex(
        { email: 1 },
        { unique: true, name: 'unique_users_email' }
      ),
      database.collection('reviews').createIndex({ packageId: 1, date: -1 }),
      database.collection('bookings').createIndex({ createdAt: -1 }),
      database.collection('contacts').createIndex({ date: -1 })
    ]).catch(error => {
      state.indexPromise = null
      throw error
    })
  }
  await state.indexPromise
  return database
}

async function pingDb () {
  const database = await getDb()
  await database.command({ ping: 1 })
}

async function getCollection (name) {
  const database = await getDb()
  return database.collection(name)
}

function toApiDocument (document) {
  if (!document) return null
  const { _id, ...fields } = document
  return { id: _id, ...fields }
}

async function findRecord (name, id) {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null
  const collection = await getCollection(name)
  return toApiDocument(await collection.findOne({ _id: numericId }))
}

async function listRecords (name, { filter = {}, sortBy = 'id', direction = -1 } = {}) {
  const collection = await getCollection(name)
  const sortField = sortBy === 'id' ? '_id' : sortBy
  const documents = await collection.find(filter).sort({ [sortField]: direction }).toArray()
  return documents.map(toApiDocument)
}

async function nextId (name) {
  if (!state.counterReady.has(name)) {
    const ready = (async () => {
      const collection = await getCollection(name)
      const highest = await collection.find({}, { projection: { _id: 1 } })
        .sort({ _id: -1 })
        .limit(1)
        .next()
      const counters = await getCollection('_counters')
      await counters.updateOne(
        { _id: name },
        { $max: { value: highest?._id || 0 } },
        { upsert: true }
      )
    })()
    state.counterReady.set(name, ready)
    ready.catch(() => state.counterReady.delete(name))
  }
  await state.counterReady.get(name)
  const counters = await getCollection('_counters')
  const counter = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { returnDocument: 'after' }
  )
  if (!counter) throw new Error(`Unable to allocate an ID for ${name}.`)
  return counter.value
}

async function insertRecord (name, document) {
  const collection = await getCollection(name)
  const id = await nextId(name)
  const record = { ...document, _id: id }
  await collection.insertOne(record)
  return toApiDocument(record)
}

async function updateRecord (name, id, fields) {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId < 1) return false
  const collection = await getCollection(name)
  const result = await collection.updateOne({ _id: numericId }, { $set: fields })
  return result.matchedCount > 0
}

async function deleteRecord (name, id) {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId < 1) return false
  const collection = await getCollection(name)
  const result = await collection.deleteOne({ _id: numericId })
  return result.deletedCount > 0
}

module.exports = {
  deleteRecord,
  findRecord,
  getCollection,
  getDb,
  insertRecord,
  listRecords,
  nextId,
  pingDb,
  toApiDocument,
  updateRecord
}
