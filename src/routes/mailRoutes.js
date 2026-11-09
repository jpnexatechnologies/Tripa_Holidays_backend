const router = require('express').Router()
const { smtp } = require('../config/env')
const { getTransport } = require('../services/emailService')
const { authenticate, requireAdmin } = require('../middleware/auth')
const asyncHandler = require('../utils/asyncHandler')
const HttpError = require('../utils/httpError')

router.get('/health', (req, res) =>
  res.json({
    success: true,
    message:
      'Mail endpoint available; SMTP is configured only when credentials are set.'
  })
)
router.post(
  '/send',
  // authenticate,
  // requireAdmin,
  asyncHandler(async (req, res) => {
    const { to, subject, body, htmlBody = false } = req.body
    if (!to || !subject || !body)
      throw new HttpError(400, 'to, subject, and body are required.')
    await getTransport().sendMail({
      from: smtp.from,
      to,
      subject,
      ...(htmlBody ? { html: body } : { text: body })
    })
    res.json({ success: true, message: `Email delivered to ${to}` })
  })
)
router.post(
  '/send-bulk',
  // authenticate,
  // requireAdmin,
  asyncHandler(async (req, res) => {
    const { recipients, subject, body, htmlBody = false } = req.body
    if (!Array.isArray(recipients) || !recipients.length || !subject || !body)
      throw new HttpError(400, 'recipients, subject, and body are required.')
    if (recipients.length > 100)
      throw new HttpError(400, 'Bulk requests are limited to 100 recipients.')
    const transport = getTransport()
    const results = await Promise.allSettled(
      recipients
        .filter(Boolean)
        .map(to =>
          transport.sendMail({
            from: smtp.from,
            to,
            subject,
            ...(htmlBody ? { html: body } : { text: body })
          })
        )
    )
    const sent = results.filter(r => r.status === 'fulfilled').length
    res.json({
      success: sent === results.length,
      message: `Email delivered to ${sent} of ${results.length} recipients`,
      sent,
      failed: results.length - sent
    })
  })
)
module.exports = router
