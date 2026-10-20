if (!process.env.VERCEL) require('../src/telemetry')

module.exports = require('../src/app')
