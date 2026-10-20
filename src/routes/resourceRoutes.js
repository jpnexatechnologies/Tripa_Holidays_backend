const express = require('express')
const {
  deleteRecord,
  findRecord,
  getCollection,
  insertRecord,
  listRecords,
  toApiDocument,
  updateRecord
} = require('../config/db')
const crudRouter = require('../utils/crudRouter')
const asyncHandler = require('../utils/asyncHandler')
const HttpError = require('../utils/httpError')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(
  '/destinations',
  crudRouter({
    table: 'destinations',
    fields: ['name', 'country', 'image', 'packageCount', 'blurb'],
    adminOnly: true
  })
)
router.use(
  '/packages',
  crudRouter({
    table: 'packages',
    fields: [
      'title',
      'destinationId',
      'location',
      'category',
      'tripType',
      'duration',
      'price',
      'rating',
      'reviewCount',
      'featured',
      'trending',
      'images',
      'shortDescription',
      'description',
      'included',
      'excluded',
      'tourPlan'
    ],
    adminOnly: false
  })
)
router.use(
  '/offers',
  crudRouter({
    table: 'offers',
    fields: [
      'title',
      'description',
      'discount',
      'bannerImage',
      'startDate',
      'endDate',
      'packageId'
    ],
    adminOnly: false
  })
)
router.use(
  '/videos',
  crudRouter({
    table: 'videos',
    fields: ['title', 'description', 'videoUrl', 'thumbnailUrl'],
    adminOnly: false
  })
)

const bookingRouter = express.Router()
bookingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const booking = req.body
    if (!booking.name || !booking.email)
      throw new HttpError(400, 'Name and email are required.')
    const record = await insertRecord('bookings', {
      packageId: booking.packageId ? Number(booking.packageId) : null,
      packageTitle: booking.packageTitle || null,
      name: booking.name,
      email: String(booking.email).trim().toLowerCase(),
      phone: booking.phone || null,
      adults: Number(booking.adults || 1),
      children: Number(booking.children || 0),
      groupType: booking.groupType || null,
      days: booking.days || null,
      travelDate: booking.travelDate || null,
      specialRequests: booking.specialRequests || null,
      status: 'PENDING',
      totalPrice: booking.totalPrice || null,
      createdAt: new Date()
    })
    res.status(201).json(record)
  })
)
bookingRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await listRecords('bookings', { sortBy: 'createdAt' }))
  })
)
bookingRouter.get(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const booking = await findRecord('bookings', req.params.id)
    if (!booking) throw new HttpError(404, 'Booking not found.')
    res.json(booking)
  })
)
bookingRouter.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = String(req.body.status || '').toUpperCase()
    if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(status))
      throw new HttpError(400, 'Unsupported booking status.')
    if (!await updateRecord('bookings', req.params.id, { status }))
      throw new HttpError(404, 'Booking not found.')
    res.json(await findRecord('bookings', req.params.id))
  })
)
bookingRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!await deleteRecord('bookings', req.params.id))
      throw new HttpError(404, 'Booking not found.')
    res.status(204).end()
  })
)
router.use('/bookings', bookingRouter)

const contactRouter = express.Router()
contactRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const contact = req.body
    if (!contact.name || !contact.email || !contact.message)
      throw new HttpError(400, 'Name, email, and message are required.')
    res.status(201).json(await insertRecord('contacts', {
      name: contact.name,
      email: String(contact.email).trim().toLowerCase(),
      phone: contact.phone || null,
      subject: contact.subject || null,
      message: contact.message,
      isRead: false,
      date: new Date()
    }))
  })
)
contactRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await listRecords('contacts', { sortBy: 'date' }))
  })
)
contactRouter.put(
  '/:id/read',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!await updateRecord('contacts', req.params.id, { isRead: true }))
      throw new HttpError(404, 'Contact not found.')
    res.json(await findRecord('contacts', req.params.id))
  })
)
contactRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!await deleteRecord('contacts', req.params.id))
      throw new HttpError(404, 'Contact not found.')
    res.status(204).end()
  })
)
router.use('/contacts', contactRouter)

const reviewRouter = express.Router()
reviewRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = req.query.packageId === undefined
      ? {}
      : { packageId: Number(req.query.packageId) }
    const collection = await getCollection('reviews')
    const reviews = await collection.find(filter).sort({ date: -1 }).toArray()
    res.json(reviews.map(toApiDocument))
  })
)
reviewRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const review = req.body
    const rating = Number(review.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new HttpError(400, 'Rating must be an integer from 1 to 5.')
    if (!review.name) throw new HttpError(400, 'Name is required.')
    res.status(201).json(await insertRecord('reviews', {
      packageId: review.packageId ? Number(review.packageId) : null,
      userId: Number(req.user.id),
      name: review.name,
      avatar: review.avatar || null,
      rating,
      comment: review.comment || null,
      date: new Date()
    }))
  })
)
reviewRouter.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const review = await findRecord('reviews', req.params.id)
    if (!review) throw new HttpError(404, 'Review not found.')
    if (
      Number(review.userId) !== Number(req.user.id) &&
      String(req.user.role).toUpperCase() !== 'ADMIN'
    )
      throw new HttpError(403, 'You can only update your own review.')
    const fields = ['name', 'avatar', 'rating', 'comment']
    const payload = {}
    for (const field of fields) {
      if (req.body[field] !== undefined) payload[field] = req.body[field]
    }
    if (
      payload.rating !== undefined &&
      (!Number.isInteger(Number(payload.rating)) ||
        Number(payload.rating) < 1 ||
        Number(payload.rating) > 5)
    )
      throw new HttpError(400, 'Rating must be an integer from 1 to 5.')
    if (!Object.keys(payload).length)
      throw new HttpError(400, 'No supported fields provided.')
    if (!await updateRecord('reviews', req.params.id, payload))
      throw new HttpError(404, 'Review not found.')
    res.json(await findRecord('reviews', req.params.id))
  })
)
reviewRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const review = await findRecord('reviews', req.params.id)
    if (!review) throw new HttpError(404, 'Review not found.')
    if (
      Number(review.userId) !== Number(req.user.id) &&
      String(req.user.role).toUpperCase() !== 'ADMIN'
    )
      throw new HttpError(403, 'You can only delete your own review.')
    if (!await deleteRecord('reviews', req.params.id))
      throw new HttpError(404, 'Review not found.')
    res.status(204).end()
  })
)
router.use('/reviews', reviewRouter)

const userRouter = express.Router()
userRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await listRecords('users')
    res.json(users.map(({ password, ...user }) => user))
  })
)
userRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === Number(req.user.id))
      throw new HttpError(400, 'You cannot delete your own administrator account.')
    if (!await deleteRecord('users', req.params.id))
      throw new HttpError(404, 'User not found.')
    res.status(204).end()
  })
)
router.use('/users', userRouter)

module.exports = router
