/**
 * Check if the authenticated user is a VENDOR and whether the resource belongs to them.
 * Admin, Purchase Manager, Approver, Warehouse, Finance can view as allowed by roleMiddleware.
 */
const checkVendorOwnership = (getResourceVendorId) => {
  return (req, res, next) => {
    if (req.user.role === 'VENDOR') {
      const resourceVendorId = getResourceVendorId(req);
      const userVendorId = req.user.vendorId ? req.user.vendorId._id || req.user.vendorId : null;

      if (!userVendorId || !resourceVendorId || resourceVendorId.toString() !== userVendorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have permission to access resources of another vendor.',
        });
      }
    }
    next();
  };
};

module.exports = { checkVendorOwnership };
