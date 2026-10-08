/**
 * Audit Logger Foundation
 * Formats and records security and business events.
 * In Phase 6, this utility will also persist events to the MongoDB AuditLog collection.
 */
const logAuditEvent = ({ action, performedBy, targetEntity, details, ip }) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    performedBy: performedBy || 'ANONYMOUS',
    targetEntity: targetEntity || 'SYSTEM',
    details: details || {},
    ip: ip || '127.0.0.1',
  };

  console.log(`[AUDIT LOG] ${logEntry.timestamp} | ${logEntry.action} | PerformedBy: ${logEntry.performedBy} | Details: ${JSON.stringify(logEntry.details)}`);
  return logEntry;
};

module.exports = {
  logAuditEvent,
};
