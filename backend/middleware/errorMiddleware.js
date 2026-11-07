function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.path}`)
  error.status = 404
  next(error)
}

function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request is too large.' })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    const fields = error.errors ? Object.keys(error.errors) : undefined
    return res.status(400).json({ message: 'Please check the submitted information.', ...(fields && { fields }) })
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A registration with this email already exists.' })
  }

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500
  if (status === 500) {
    console.error('API request failed:', error.name || 'Error')
    return res.status(status).json({ message: 'Something went wrong. Please try again later.' })
  }

  return res.status(status).json({ message: error.message || 'Request could not be completed.' })
}

module.exports = { errorHandler, notFound }
