const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  
  // Log de la ruta no encontrada
  console.warn(`[404] Ruta no encontrada: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    error: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

module.exports = { notFound };

