const mongoose = require('mongoose');

/**
 * Health check controller
 * Checks backend server status, uptime, and MongoDB connectivity
 */
const getHealthStatus = (req, res) => {
  const dbStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const dbStateCode = mongoose.connection.readyState;
  const isDbConnected = dbStateCode === 1;

  res.status(200).json({
    success: true,
    message: 'AcxiomCRM Backend API is operational',
    data: {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStates[dbStateCode] || 'Unknown',
        connected: isDbConnected,
        name: mongoose.connection.name || 'acxiom_crm',
      },
    },
  });
};

module.exports = {
  getHealthStatus,
};
