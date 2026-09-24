const AuditLog = require('../models/AuditLog');

const logAudit = async ({ userId, action, entityType, entityId, description, ipAddress = '' }) => {
  try {
    await AuditLog.create({
      userId: userId || null,
      action,
      entityType,
      entityId: entityId || null,
      description,
      ipAddress,
    });
  } catch (error) {
    console.error('[Audit Log Failure]:', error.message);
  }
};

module.exports = { logAudit };
