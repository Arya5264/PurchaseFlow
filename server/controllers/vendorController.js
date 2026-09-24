const Vendor = require('../models/Vendor');
const { logAudit } = require('../services/auditService');

// Helper to generate next vendor code
const generateVendorCode = async () => {
  const latestVendor = await Vendor.findOne().sort({ vendorCode: -1 });
  if (!latestVendor || !latestVendor.vendorCode) {
    return 'VEN-0001';
  }
  const match = latestVendor.vendorCode.match(/VEN-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `VEN-${String(nextNum).padStart(4, '0')}`;
  }
  return `VEN-${Date.now().toString().slice(-4)}`;
};

// @desc   Get all vendors
// @route  GET /api/vendors
// @access Private (Admin, Purchase Manager, Finance, Warehouse)
const getVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { name: searchRegex },
        { vendorCode: searchRegex },
        { email: searchRegex },
        { contactPerson: searchRegex },
      ];
    }

    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single vendor
// @route  GET /api/vendors/:id
// @access Private
const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new vendor
// @route  POST /api/vendors
// @access Private (Admin, Purchase Manager)
const createVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, address, gstNumber, bankDetails, status } = req.body;

    if (!name || !contactPerson || !email || !phone || !address || !gstNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact person, email, phone, address, and GST number are required.',
      });
    }

    const existingVendor = await Vendor.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { gstNumber: gstNumber.toUpperCase().trim() }],
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message: 'A vendor with this email or GST number already exists.',
      });
    }

    const vendorCode = await generateVendorCode();

    const vendor = await Vendor.create({
      vendorCode,
      name,
      contactPerson,
      email: email.toLowerCase().trim(),
      phone,
      address,
      gstNumber: gstNumber.toUpperCase().trim(),
      bankDetails: bankDetails || {},
      status: status || 'ACTIVE',
    });

    await logAudit({
      userId: req.user._id,
      action: 'CREATE_VENDOR',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Created vendor ${vendor.name} (${vendor.vendorCode}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully.',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update vendor
// @route  PUT /api/vendors/:id
// @access Private (Admin, Purchase Manager)
const updateVendor = async (req, res, next) => {
  try {
    const { name, contactPerson, phone, address, gstNumber, bankDetails, status } = req.body;

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found.',
      });
    }

    if (name) vendor.name = name;
    if (contactPerson) vendor.contactPerson = contactPerson;
    if (phone) vendor.phone = phone;
    if (address) vendor.address = address;
    if (gstNumber) vendor.gstNumber = gstNumber.toUpperCase().trim();
    if (bankDetails) vendor.bankDetails = bankDetails;
    if (status) vendor.status = status;

    await vendor.save();

    await logAudit({
      userId: req.user._id,
      action: 'UPDATE_VENDOR',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Updated vendor information for ${vendor.name} (${vendor.vendorCode}).`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully.',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Update vendor status (Active, Inactive, Suspended)
// @route  PATCH /api/vendors/:id/status
// @access Private (Admin)
const updateVendorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'ACTIVE', 'INACTIVE', or 'SUSPENDED'.",
      });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found.',
      });
    }

    vendor.status = status;
    await vendor.save();

    await logAudit({
      userId: req.user._id,
      action: 'UPDATE_VENDOR_STATUS',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Vendor ${vendor.name} status updated to ${status}.`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Vendor status changed to ${status}.`,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus,
};
