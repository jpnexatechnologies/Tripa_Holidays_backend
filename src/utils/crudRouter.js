const express = require('express')
const { deleteRecord, findRecord, insertRecord, listRecords, updateRecord } = require('../config/db')
const { authenticate, requireAdmin } = require('../middleware/auth')
const asyncHandler = require('./asyncHandler')
const HttpError = require('./httpError')

function crudRouter ({
  table,
  fields,
  publicList = true,
  publicGet = true,
  publicCreate = false,
  adminOnly = true,
  orderBy = 'id'
}) {
  const router = express.Router()
  const canManage = adminOnly ? [authenticate, requireAdmin] : []

  if (publicList) {
    router.get('/', asyncHandler(async (req, res) => {
      res.json(await listRecords(table, { sortBy: orderBy }))
    }))
  }
  if (publicGet) {
    router.get('/:id', asyncHandler(async (req, res) => {
      const record = await findRecord(table, req.params.id)
      if (!record) throw new HttpError(404, `${table} record not found.`)
      res.json(record)
    }))
  }
  router.post('/', ...(!publicCreate ? canManage : []), asyncHandler(async (req, res) => {
    const payload = {}
    for (const field of fields) {
      if (req.body[field] !== undefined) payload[field] = req.body[field]
    }
    if (!Object.keys(payload).length)
      throw new HttpError(400, 'At least one supported field is required.')
    res.status(201).json(await insertRecord(table, payload))
  }))
  router.put('/:id', ...canManage, asyncHandler(async (req, res) => {
    const payload = {}
    for (const field of fields) {
      if (req.body[field] !== undefined) payload[field] = req.body[field]
    }
    if (!Object.keys(payload).length)
      throw new HttpError(400, 'No supported fields provided for update.')
    if (!await updateRecord(table, req.params.id, payload))
      throw new HttpError(404, `${table} record not found.`)
    res.json(await findRecord(table, req.params.id))
  }))
  router.delete('/:id', ...canManage, asyncHandler(async (req, res) => {
    if (!await deleteRecord(table, req.params.id))
      throw new HttpError(404, `${table} record not found.`)
    res.status(204).end()
  }))

  return router
}

module.exports = crudRouter
