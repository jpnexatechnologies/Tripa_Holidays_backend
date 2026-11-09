const nodemailer = require('nodemailer')
const { smtp } = require('../config/env')
const HttpError = require('../utils/httpError')

let transport

function getTransport () {
  if (!smtp.host || !smtp.user || !smtp.password || !smtp.from)
    throw new HttpError(503, 'Email service is not configured.')
  if (!transport) {
    transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    })
  }
  return transport
}

function closeTransport () {
  if (transport) {
    transport.close()
    transport = undefined
  }
}

module.exports = { getTransport, closeTransport }
