const swaggerJsdoc = require('swagger-jsdoc')

const bearer = [{ bearerAuth: [] }]
const response = description => ({
  description,
  content: {
    'application/json': {
      schema: { type: 'object', additionalProperties: true }
    }
  }
})
const body = description => ({
  required: true,
  description,
  content: {
    'application/json': {
      schema: { type: 'object', additionalProperties: true }
    }
  }
})
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer' }
}

function crudPaths (resource, description, adminWrites = false) {
  const collection = `/api/${resource}`
  const item = `${collection}/{id}`
  return {
    [collection]: {
      get: {
        tags: [resource],
        summary: `List ${description}`,
        responses: { 200: response(`List of ${description}.`) }
      },
      post: {
        tags: [resource],
        summary: `Create ${description}`,
        ...(adminWrites ? { security: bearer } : {}),
        requestBody: body('Fields supported by the resource.'),
        responses: {
          201: response('Resource created.'),
          400: response('Invalid request.')
        }
      }
    },
    [item]: {
      get: {
        tags: [resource],
        summary: `Get ${description} by ID`,
        parameters: [idParameter],
        responses: {
          200: response('Resource details.'),
          404: response('Resource not found.')
        }
      },
      put: {
        tags: [resource],
        summary: `Update ${description}`,
        parameters: [idParameter],
        ...(adminWrites ? { security: bearer } : {}),
        requestBody: body('Fields to update.'),
        responses: {
          200: response('Resource updated.'),
          404: response('Resource not found.')
        }
      },
      delete: {
        tags: [resource],
        summary: `Delete ${description}`,
        parameters: [idParameter],
        ...(adminWrites ? { security: bearer } : {}),
        responses: {
          204: { description: 'Resource deleted.' },
          404: response('Resource not found.')
        }
      }
    }
  }
}

const paths = {
  '/health': {
    get: {
      tags: ['system'],
      summary: 'Check API and database readiness',
      responses: {
        200: response('API and database are healthy.'),
        503: response('API is running but the database is unavailable.')
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['authentication'],
      summary: 'Authenticate and receive a JWT',
      requestBody: body('Login credentials.'),
      responses: {
        200: response('JWT and user details.'),
        401: response('Invalid credentials.')
      }
    }
  },
  '/api/auth/register': {
    post: {
      tags: ['authentication'],
      summary: 'Register an account',
      requestBody: body('Account details.'),
      responses: {
        201: response('Account created.'),
        400: response('Invalid registration data.')
      }
    }
  },
  ...crudPaths('destinations', 'destinations', true),
  ...crudPaths('packages', 'packages'),
  ...crudPaths('offers', 'offers'),
  ...crudPaths('videos', 'videos'),
  '/api/bookings': {
    post: {
      tags: ['bookings'],
      summary: 'Submit a booking request',
      requestBody: body('Booking details; name and email are required.'),
      responses: { 201: response('Booking created.'), 400: response('Invalid booking.') }
    },
    get: {
      tags: ['bookings'],
      summary: 'List bookings',
      security: bearer,
      responses: { 200: response('Bookings.') }
    }
  },
  '/api/bookings/{id}': {
    get: {
      tags: ['bookings'],
      summary: 'Get a booking',
      parameters: [idParameter],
      security: bearer,
      responses: { 200: response('Booking details.'), 404: response('Booking not found.') }
    },
    delete: {
      tags: ['bookings'],
      summary: 'Delete a booking',
      parameters: [idParameter],
      security: bearer,
      responses: { 204: { description: 'Booking deleted.' } }
    }
  },
  '/api/bookings/{id}/status': {
    put: {
      tags: ['bookings'],
      summary: 'Update booking status',
      parameters: [idParameter],
      security: bearer,
      requestBody: body('A supported booking status.'),
      responses: { 200: response('Booking updated.'), 400: response('Unsupported status.') }
    }
  },
  '/api/contacts': {
    post: {
      tags: ['contacts'],
      summary: 'Submit a contact message',
      requestBody: body('Contact details; name, email, and message are required.'),
      responses: { 201: response('Contact message created.'), 400: response('Invalid message.') }
    },
    get: {
      tags: ['contacts'],
      summary: 'List contact messages',
      security: bearer,
      responses: { 200: response('Contact messages.') }
    }
  },
  '/api/contacts/{id}/read': {
    put: {
      tags: ['contacts'],
      summary: 'Mark a contact message as read',
      parameters: [idParameter],
      security: bearer,
      responses: { 200: response('Contact message updated.'), 404: response('Contact not found.') }
    }
  },
  '/api/contacts/{id}': {
    delete: {
      tags: ['contacts'],
      summary: 'Delete a contact message',
      parameters: [idParameter],
      security: bearer,
      responses: { 204: { description: 'Contact message deleted.' } }
    }
  },
  '/api/reviews': {
    get: {
      tags: ['reviews'],
      summary: 'List reviews',
      parameters: [{
        name: 'packageId',
        in: 'query',
        schema: { type: 'integer' }
      }],
      responses: { 200: response('Reviews.') }
    },
    post: {
      tags: ['reviews'],
      summary: 'Create a review',
      security: bearer,
      requestBody: body('Review details; rating must be between 1 and 5.'),
      responses: { 201: response('Review created.'), 400: response('Invalid review.') }
    }
  },
  '/api/reviews/{id}': {
    put: {
      tags: ['reviews'],
      summary: 'Update a review',
      parameters: [idParameter],
      security: bearer,
      requestBody: body('Review fields to update.'),
      responses: { 200: response('Review updated.'), 403: response('Not permitted.') }
    },
    delete: {
      tags: ['reviews'],
      summary: 'Delete a review',
      parameters: [idParameter],
      security: bearer,
      responses: { 204: { description: 'Review deleted.' }, 403: response('Not permitted.') }
    }
  },
  '/api/users': {
    get: {
      tags: ['users'],
      summary: 'List users',
      security: bearer,
      responses: { 200: response('Users; password hashes are excluded.') }
    },
    post: {
      tags: ['users'],
      summary: 'Create a user',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                phone: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['USER', 'ADMIN'], default: 'USER' }
              }
            }
          }
        }
      },
      responses: {
        201: response('User created; password is excluded.'),
        400: response('Invalid user data.'),
        409: response('Email address is already registered.')
      }
    }
  },
  '/api/users/{id}': {
    put: {
      tags: ['users'],
      summary: 'Update a user',
      parameters: [idParameter],
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                phone: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['USER', 'ADMIN'] }
              },
              minProperties: 1
            }
          }
        }
      },
      responses: {
        200: response('User updated; password is excluded.'),
        400: response('Invalid user data.'),
        404: response('User not found.'),
        409: response('Email address is already registered.')
      }
    },
    delete: {
      tags: ['users'],
      summary: 'Delete a user',
      parameters: [idParameter],
      security: bearer,
      responses: { 204: { description: 'User deleted.' }, 400: response('Cannot delete the current administrator.') }
    }
  },
  '/api/mail/health': {
    get: {
      tags: ['mail'],
      summary: 'Check mail endpoint availability',
      responses: { 200: response('Mail endpoint status.') }
    }
  },
  '/api/mail/send': {
    post: {
      tags: ['mail'],
      summary: 'Send an email',
      security: bearer,
      requestBody: body('Email recipient, subject, and body.'),
      responses: { 200: response('Email sent.'), 503: response('SMTP is not configured.') }
    }
  },
  '/api/mail/send-bulk': {
    post: {
      tags: ['mail'],
      summary: 'Send email to up to 100 recipients',
      security: bearer,
      requestBody: body('Recipients, subject, and body.'),
      responses: { 200: response('Delivery results.'), 400: response('Invalid request or too many recipients.') }
    }
  }
}

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TripaHolidays API',
      version: '1.0.0',
      description: 'Express.js API for the TripaHolidays platform.'
    },
    servers: [{
      url: process.env.PUBLIC_API_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.PORT || 8085}`)
    }],
    tags: [
      { name: 'system' },
      { name: 'authentication' },
      { name: 'destinations' },
      { name: 'packages' },
      { name: 'offers' },
      { name: 'videos' },
      { name: 'bookings' },
      { name: 'contacts' },
      { name: 'reviews' },
      { name: 'users' },
      { name: 'mail' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    paths
  },
  apis: []
})
