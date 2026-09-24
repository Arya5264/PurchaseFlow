require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const Approval = require('../models/Approval');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/purchaseflow';
    await mongoose.connect(mongoUri);
    console.log(`[Seed]: Connected to MongoDB at ${mongoUri}`);

    // Clean previous collections
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      PurchaseRequisition.deleteMany({}),
      Approval.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      GoodsReceipt.deleteMany({}),
      Invoice.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('[Seed]: Cleared existing database records.');

    // 1. Create Vendors
    const vendorsData = [
      {
        vendorCode: 'VEN-0001',
        name: 'Apex Infotech Solutions',
        contactPerson: 'Rajesh Sharma',
        email: 'vendor@purchaseflow.com', // Linked to demo vendor user
        phone: '+91 98765 43210',
        address: '12 Cyber City, DLF Phase 2, Gurugram, Haryana - 122002',
        gstNumber: '06AAACA1234A1Z5',
        bankDetails: {
          accountNumber: '918020012345678',
          bankName: 'HDFC Bank',
          ifscCode: 'HDFC0001234',
        },
        status: 'ACTIVE',
      },
      {
        vendorCode: 'VEN-0002',
        name: 'Omni Hardware & Office Systems',
        contactPerson: 'Sunita Verma',
        email: 'sales@omnihardware.in',
        phone: '+91 98111 22334',
        address: '44 Industrial Area Phase 1, Bengaluru, Karnataka - 560058',
        gstNumber: '29AABCO5678B1Z2',
        bankDetails: {
          accountNumber: '002305001290',
          bankName: 'ICICI Bank',
          ifscCode: 'ICIC0000023',
        },
        status: 'ACTIVE',
      },
      {
        vendorCode: 'VEN-0003',
        name: 'Zenith Logistics & Industrial Supplies',
        contactPerson: 'Vikram Mehta',
        email: 'contact@zenithlogistics.com',
        phone: '+91 99200 88776',
        address: 'Plot 78, MIDC Andheri East, Mumbai, Maharashtra - 400093',
        gstNumber: '27AACFZ9012C1Z8',
        bankDetails: {
          accountNumber: '50200023456789',
          bankName: 'Axis Bank',
          ifscCode: 'UTIB0000502',
        },
        status: 'ACTIVE',
      },
      {
        vendorCode: 'VEN-0004',
        name: 'Nexus Cloud Networks',
        contactPerson: 'Priya Iyer',
        email: 'enterprise@nexusnetworks.io',
        phone: '+91 97400 33221',
        address: 'Tech Park Blvd, Whitefield, Bengaluru - 560066',
        gstNumber: '29AACCN4321D1Z1',
        bankDetails: {
          accountNumber: '334455667788',
          bankName: 'State Bank of India',
          ifscCode: 'SBIN0004321',
        },
        status: 'ACTIVE',
      },
      {
        vendorCode: 'VEN-0005',
        name: 'Pinnacle Stationers & Printers',
        contactPerson: 'Anil Kapoor',
        email: 'orders@pinnaclestat.com',
        phone: '+91 98990 11223',
        address: '15 Nehru Place, New Delhi - 110019',
        gstNumber: '07AABCP8765E1Z9',
        bankDetails: {
          accountNumber: '112233445566',
          bankName: 'Punjab National Bank',
          ifscCode: 'PUNB0112233',
        },
        status: 'SUSPENDED',
      },
    ];

    const createdVendors = await Vendor.insertMany(vendorsData);
    const demoVendor = createdVendors[0];
    console.log(`[Seed]: Created ${createdVendors.length} vendors.`);

    // 2. Create Demo Users
    const usersData = [
      {
        name: 'System Administrator',
        email: 'admin@purchaseflow.com',
        passwordHash: 'Admin@123',
        role: 'ADMIN',
        isActive: true,
      },
      {
        name: 'Aarav Patel (Procurement)',
        email: 'manager@purchaseflow.com',
        passwordHash: 'Manager@123',
        role: 'PURCHASE_MANAGER',
        isActive: true,
      },
      {
        name: 'Dr. Meera Nambiar (Director)',
        email: 'approver@purchaseflow.com',
        passwordHash: 'Approver@123',
        role: 'APPROVER',
        isActive: true,
      },
      {
        name: 'Rajesh Sharma (Apex Vendor)',
        email: 'vendor@purchaseflow.com',
        passwordHash: 'Vendor@123',
        role: 'VENDOR',
        vendorId: demoVendor._id,
        isActive: true,
      },
      {
        name: 'Karan Singh (Warehouse)',
        email: 'warehouse@purchaseflow.com',
        passwordHash: 'Warehouse@123',
        role: 'WAREHOUSE',
        isActive: true,
      },
      {
        name: 'Ananya Deshmukh (Finance)',
        email: 'finance@purchaseflow.com',
        passwordHash: 'Finance@123',
        role: 'FINANCE',
        isActive: true,
      },
    ];

    const createdUsers = [];
    for (const u of usersData) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    const [adminUser, managerUser, approverUser, vendorUser, warehouseUser, financeUser] = createdUsers;
    console.log(`[Seed]: Created ${createdUsers.length} standard demo role users.`);

    // 3. Create 10+ Purchase Requisitions
    const prsData = [
      {
        prNumber: 'PR-2026-0001',
        requestedBy: managerUser._id,
        department: 'Information Technology',
        itemName: 'Developer Laptops (Dell Latitude 5540)',
        description: 'High-performance laptops for new engineering hires (Core i7, 32GB RAM, 1TB SSD).',
        quantity: 20,
        estimatedCost: 1200000,
        requiredDate: new Date('2026-10-15'),
        status: 'PO_GENERATED',
      },
      {
        prNumber: 'PR-2026-0002',
        requestedBy: managerUser._id,
        department: 'Operations & Facilities',
        itemName: 'Ergonomic Mesh Office Chairs',
        description: 'Lumbar support office chairs for Floor 3 workspace upgrade.',
        quantity: 50,
        estimatedCost: 350000,
        requiredDate: new Date('2026-10-20'),
        status: 'APPROVED',
      },
      {
        prNumber: 'PR-2026-0003',
        requestedBy: managerUser._id,
        department: 'Research & Development',
        itemName: '4K UltraSharp Monitors 27-inch',
        description: 'Color-calibrated dual monitor setups for UI/UX & design team.',
        quantity: 15,
        estimatedCost: 450000,
        requiredDate: new Date('2026-10-25'),
        status: 'PENDING_APPROVAL',
      },
      {
        prNumber: 'PR-2026-0004',
        requestedBy: managerUser._id,
        department: 'IT Infrastructure',
        itemName: 'Cisco 48-Port Gigabit PoE Switches',
        description: 'Network backbone switch replacement for server rack A.',
        quantity: 4,
        estimatedCost: 280000,
        requiredDate: new Date('2026-11-01'),
        status: 'PENDING_APPROVAL',
      },
      {
        prNumber: 'PR-2026-0005',
        requestedBy: managerUser._id,
        department: 'Human Resources',
        itemName: 'Employee Welcome Kit Hampers',
        description: 'Branded backpack, thermal bottle, notebook, and wireless earplugs for Q4 onboarding.',
        quantity: 100,
        estimatedCost: 180000,
        requiredDate: new Date('2026-10-05'),
        status: 'APPROVED',
      },
      {
        prNumber: 'PR-2026-0006',
        requestedBy: managerUser._id,
        department: 'Marketing & Media',
        itemName: 'Sony Alpha 4K Video Production Camera Kit',
        description: 'Video equipment kit for corporate studio and customer case-study shoots.',
        quantity: 2,
        estimatedCost: 550000,
        requiredDate: new Date('2026-10-10'),
        status: 'REJECTED',
        remarks: 'Budget currently prioritized for server infrastructure. Please re-evaluate in Q1 next fiscal year.',
      },
      {
        prNumber: 'PR-2026-0007',
        requestedBy: managerUser._id,
        department: 'Information Technology',
        itemName: 'Server RAM Upgrades (64GB DDR5 ECC)',
        description: 'Memory upgrade modules for database cluster hosts.',
        quantity: 8,
        estimatedCost: 160000,
        requiredDate: new Date('2026-11-15'),
        status: 'DRAFT',
      },
      {
        prNumber: 'PR-2026-0008',
        requestedBy: managerUser._id,
        department: 'Operations',
        itemName: 'Warehouse Barcode Scanners & Docking Stations',
        description: 'Rugged handheld 2D QR scanners for inventory scanning.',
        quantity: 10,
        estimatedCost: 125000,
        requiredDate: new Date('2026-10-30'),
        status: 'PO_GENERATED',
      },
      {
        prNumber: 'PR-2026-0009',
        requestedBy: managerUser._id,
        department: 'Finance & Accounting',
        itemName: 'High-Speed Document Scanners',
        description: 'Duplex heavy-duty paper document digitizers for audit records.',
        quantity: 3,
        estimatedCost: 95000,
        requiredDate: new Date('2026-10-18'),
        status: 'CANCELLED',
        remarks: 'Department decided to migrate to direct digital invoice capture portal.',
      },
      {
        prNumber: 'PR-2026-0010',
        requestedBy: managerUser._id,
        department: 'IT Infrastructure',
        itemName: 'APC Smart-UPS 3000VA Battery Backup',
        description: 'Emergency rack-mount UPS units for server room power protection.',
        quantity: 2,
        estimatedCost: 210000,
        requiredDate: new Date('2026-11-05'),
        status: 'PO_GENERATED',
      },
    ];

    const createdPRs = await PurchaseRequisition.insertMany(prsData);
    console.log(`[Seed]: Created ${createdPRs.length} purchase requisitions.`);

    // 4. Create Approvals
    await Approval.create([
      {
        prId: createdPRs[0]._id,
        approverId: approverUser._id,
        decision: 'APPROVED',
        remarks: 'Approved for Q3 engineering hiring sprint.',
        decisionDate: new Date('2026-09-01'),
      },
      {
        prId: createdPRs[1]._id,
        approverId: approverUser._id,
        decision: 'APPROVED',
        remarks: 'Approved per facilities ergonomic assessment.',
        decisionDate: new Date('2026-09-05'),
      },
      {
        prId: createdPRs[4]._id,
        approverId: approverUser._id,
        decision: 'APPROVED',
        remarks: 'Approved within standard HR onboarding budget.',
        decisionDate: new Date('2026-09-08'),
      },
      {
        prId: createdPRs[5]._id,
        approverId: approverUser._id,
        decision: 'REJECTED',
        remarks: 'Budget currently prioritized for server infrastructure. Please re-evaluate in Q1 next fiscal year.',
        decisionDate: new Date('2026-09-10'),
      },
      {
        prId: createdPRs[7]._id,
        approverId: approverUser._id,
        decision: 'APPROVED',
        remarks: 'Approved for warehouse modernization project.',
        decisionDate: new Date('2026-09-02'),
      },
      {
        prId: createdPRs[9]._id,
        approverId: approverUser._id,
        decision: 'APPROVED',
        remarks: 'Critical facility power backup approval.',
        decisionDate: new Date('2026-09-03'),
      },
    ]);
    console.log('[Seed]: Created approvals records.');

    // 5. Create Purchase Orders
    // PO 1: Closed and Paid (Demonstrating completed workflow)
    const po1 = await PurchaseOrder.create({
      poNumber: 'PO-2026-0001',
      prId: createdPRs[0]._id,
      vendorId: demoVendor._id,
      createdBy: managerUser._id,
      items: [
        {
          itemName: 'Developer Laptops (Dell Latitude 5540)',
          description: 'Core i7, 32GB RAM, 1TB NVMe SSD',
          quantity: 20,
          unitPrice: 50847.46,
          taxRate: 18,
          totalPrice: 1016949.2,
        },
      ],
      subtotal: 1016949.2,
      tax: 183050.8,
      totalAmount: 1200000,
      deliveryDate: new Date('2026-10-15'),
      status: 'CLOSED',
      sentAt: new Date('2026-09-02'),
      acknowledgedAt: new Date('2026-09-03'),
    });

    // PO 2: Delivered, invoice submitted and matched (Ready for payment)
    const po2 = await PurchaseOrder.create({
      poNumber: 'PO-2026-0002',
      prId: createdPRs[7]._id,
      vendorId: demoVendor._id,
      createdBy: managerUser._id,
      items: [
        {
          itemName: 'Warehouse Barcode Scanners & Docking Stations',
          description: 'Rugged 2D barcode scanner with cradle',
          quantity: 10,
          unitPrice: 10593.22,
          taxRate: 18,
          totalPrice: 105932.2,
        },
      ],
      subtotal: 105932.2,
      tax: 19067.8,
      totalAmount: 125000,
      deliveryDate: new Date('2026-10-30'),
      status: 'INVOICE_PENDING',
      sentAt: new Date('2026-09-04'),
      acknowledgedAt: new Date('2026-09-05'),
    });

    // PO 3: Partially Received (Demonstrating partial delivery & mismatch test)
    const po3 = await PurchaseOrder.create({
      poNumber: 'PO-2026-0003',
      prId: createdPRs[9]._id,
      vendorId: createdVendors[1]._id,
      createdBy: managerUser._id,
      items: [
        {
          itemName: 'APC Smart-UPS 3000VA Battery Backup',
          description: 'Rackmount 3kVA pure sine wave UPS',
          quantity: 2,
          unitPrice: 88983.05,
          taxRate: 18,
          totalPrice: 177966.1,
        },
      ],
      subtotal: 177966.1,
      tax: 32033.9,
      totalAmount: 210000,
      deliveryDate: new Date('2026-11-05'),
      status: 'PARTIALLY_RECEIVED',
      sentAt: new Date('2026-09-06'),
      acknowledgedAt: new Date('2026-09-07'),
    });

    // PO 4: In Transit (En route to warehouse)
    const po4 = await PurchaseOrder.create({
      poNumber: 'PO-2026-0004',
      prId: createdPRs[1]._id,
      vendorId: createdVendors[2]._id,
      createdBy: managerUser._id,
      items: [
        {
          itemName: 'Ergonomic Mesh Office Chairs',
          description: 'High-back mesh adjustable office chair',
          quantity: 50,
          unitPrice: 5932.2,
          taxRate: 18,
          totalPrice: 296610,
        },
      ],
      subtotal: 296610,
      tax: 53390,
      totalAmount: 350000,
      deliveryDate: new Date('2026-10-20'),
      status: 'IN_TRANSIT',
      sentAt: new Date('2026-09-08'),
      acknowledgedAt: new Date('2026-09-09'),
    });

    // PO 5: Sent (Awaiting vendor acknowledgment)
    const po5 = await PurchaseOrder.create({
      poNumber: 'PO-2026-0005',
      prId: createdPRs[4]._id,
      vendorId: demoVendor._id,
      createdBy: managerUser._id,
      items: [
        {
          itemName: 'Employee Welcome Kit Hampers',
          description: 'Custom branded welcome pack',
          quantity: 100,
          unitPrice: 1525.42,
          taxRate: 18,
          totalPrice: 152542,
        },
      ],
      subtotal: 152542,
      tax: 27458,
      totalAmount: 180000,
      deliveryDate: new Date('2026-10-05'),
      status: 'SENT',
      sentAt: new Date('2026-09-12'),
    });
    console.log('[Seed]: Created 5 sample purchase orders representing different lifecycle stages.');

    // 6. Create Goods Receipts
    // Receipt 1 for PO 1 (Complete delivery: 20 of 20)
    await GoodsReceipt.create({
      receiptNumber: 'GR-2026-0001',
      poId: po1._id,
      receivedBy: warehouseUser._id,
      receivedItems: [
        {
          itemName: 'Developer Laptops (Dell Latitude 5540)',
          orderedQuantity: 20,
          receivedQuantity: 20,
          damagedQuantity: 0,
        },
      ],
      receivedDate: new Date('2026-09-08'),
      condition: 'EXCELLENT',
      remarks: 'All 20 laptops inspected, seal intact, asset tagged and added to inventory.',
    });

    // Receipt 2 for PO 2 (Complete delivery: 10 of 10)
    await GoodsReceipt.create({
      receiptNumber: 'GR-2026-0002',
      poId: po2._id,
      receivedBy: warehouseUser._id,
      receivedItems: [
        {
          itemName: 'Warehouse Barcode Scanners & Docking Stations',
          orderedQuantity: 10,
          receivedQuantity: 10,
          damagedQuantity: 0,
        },
      ],
      receivedDate: new Date('2026-09-10'),
      condition: 'GOOD',
      remarks: 'Scanners tested with warehouse terminal, operational.',
    });

    // Receipt 3 for PO 3 (Partial delivery: 1 of 2 received)
    await GoodsReceipt.create({
      receiptNumber: 'GR-2026-0003',
      poId: po3._id,
      receivedBy: warehouseUser._id,
      receivedItems: [
        {
          itemName: 'APC Smart-UPS 3000VA Battery Backup',
          orderedQuantity: 2,
          receivedQuantity: 1,
          damagedQuantity: 0,
        },
      ],
      receivedDate: new Date('2026-09-11'),
      condition: 'GOOD',
      remarks: 'First consignment: 1 unit received. Balance 1 unit expected next week.',
    });
    console.log('[Seed]: Created sample goods receipts (complete and partial).');

    // 7. Create Invoices
    // Invoice 1: Paid & Matched (for PO 1)
    await Invoice.create({
      invoiceNumber: 'INV-2026-901',
      poId: po1._id,
      vendorId: demoVendor._id,
      invoiceDate: new Date('2026-09-09'),
      dueDate: new Date('2026-10-09'),
      amount: 1200000,
      items: [
        {
          itemName: 'Developer Laptops (Dell Latitude 5540)',
          quantity: 20,
          unitPrice: 60000,
          totalPrice: 1200000,
        },
      ],
      status: 'APPROVED',
      matchStatus: 'MATCHED',
      paymentStatus: 'PAID',
      discrepancyDetails: [],
      remarks: 'Payment disbursed via RTGS transaction #RTGS260909124451.',
    });

    // Invoice 2: Approved & Matched (for PO 2), Ready for payment
    await Invoice.create({
      invoiceNumber: 'INV-2026-902',
      poId: po2._id,
      vendorId: demoVendor._id,
      invoiceDate: new Date('2026-09-11'),
      dueDate: new Date('2026-10-11'),
      amount: 125000,
      items: [
        {
          itemName: 'Warehouse Barcode Scanners & Docking Stations',
          quantity: 10,
          unitPrice: 12500,
          totalPrice: 125000,
        },
      ],
      status: 'APPROVED',
      matchStatus: 'MATCHED',
      paymentStatus: 'PENDING',
      discrepancyDetails: [],
      remarks: 'Verified against GR-2026-0002. Approved by Finance for payment.',
    });

    // Invoice 3: Mismatched Invoice (PO 3 ordered 2, Warehouse received 1, Invoice billed for 2!)
    await Invoice.create({
      invoiceNumber: 'INV-2026-903',
      poId: po3._id,
      vendorId: createdVendors[1]._id,
      invoiceDate: new Date('2026-09-12'),
      dueDate: new Date('2026-10-12'),
      amount: 210000,
      items: [
        {
          itemName: 'APC Smart-UPS 3000VA Battery Backup',
          quantity: 2,
          unitPrice: 105000,
          totalPrice: 210000,
        },
      ],
      status: 'PENDING',
      matchStatus: 'MISMATCHED',
      paymentStatus: 'PENDING',
      discrepancyDetails: [
        {
          field: 'Quantity (APC Smart-UPS 3000VA Battery Backup)',
          expected: 'Invoiced: 2 units',
          actual: 'Received: 1 units',
          message: 'Quantity discrepancy: 2 units invoiced but only 1 units received in warehouse.',
        },
      ],
      remarks: 'System detected quantity discrepancy during three-way matching.',
    });
    console.log('[Seed]: Created sample invoices (Matched Paid, Matched Pending Payment, and Mismatched).');

    // 8. Create Notifications
    await Notification.create([
      {
        userId: approverUser._id,
        type: 'PR_SUBMITTED',
        title: 'New Requisition Submitted',
        message: 'Requisition PR-2026-0003 for 4K UltraSharp Monitors (₹4,50,000) awaits your approval.',
        relatedEntity: 'PurchaseRequisition',
        relatedEntityId: createdPRs[2]._id,
        isRead: false,
      },
      {
        userId: financeUser._id,
        type: 'INVOICE_MATCHED',
        title: 'Invoice INV-2026-902 Matched',
        message: 'Invoice INV-2026-902 for ₹1,25,000 matches PO-2026-0002 and goods receipt. Ready for approval.',
        relatedEntity: 'Invoice',
        isRead: false,
      },
      {
        userId: financeUser._id,
        type: 'INVOICE_MISMATCHED',
        title: 'Invoice Discrepancy Detected',
        message: 'Invoice INV-2026-903 shows quantity mismatch (2 billed vs 1 received). Payment hold applied.',
        relatedEntity: 'Invoice',
        isRead: false,
      },
      {
        userId: vendorUser._id,
        type: 'PO_SENT',
        title: 'New Purchase Order Received',
        message: 'Purchase Order PO-2026-0005 has been issued to your organization.',
        relatedEntity: 'PurchaseOrder',
        relatedEntityId: po5._id,
        isRead: false,
      },
    ]);
    console.log('[Seed]: Created sample notifications.');

    // 9. Create Audit Logs
    await AuditLog.create([
      {
        userId: adminUser._id,
        action: 'SYSTEM_SEED',
        entityType: 'System',
        description: 'Database initialized with demo procurement records and roles.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: managerUser._id,
        action: 'CREATE_REQUISITION',
        entityType: 'PurchaseRequisition',
        entityId: createdPRs[0]._id,
        description: 'Created PR-2026-0001 for Developer Laptops.',
        ipAddress: '192.168.1.10',
      },
      {
        userId: approverUser._id,
        action: 'APPROVE_REQUISITION',
        entityType: 'PurchaseRequisition',
        entityId: createdPRs[0]._id,
        description: 'Approved PR-2026-0001 with remarks: Approved for Q3 engineering hiring sprint.',
        ipAddress: '192.168.1.15',
      },
      {
        userId: managerUser._id,
        action: 'GENERATE_PO',
        entityType: 'PurchaseOrder',
        entityId: po1._id,
        description: 'Generated Purchase Order PO-2026-0001 for ₹12,00,000.',
        ipAddress: '192.168.1.10',
      },
      {
        userId: warehouseUser._id,
        action: 'RECORD_RECEIPT',
        entityType: 'GoodsReceipt',
        description: 'Recorded GR-2026-0001 for 20 units of Developer Laptops.',
        ipAddress: '192.168.1.30',
      },
      {
        userId: financeUser._id,
        action: 'PROCESS_PAYMENT',
        entityType: 'Invoice',
        description: 'Payment of ₹12,00,000 disbursed for Invoice INV-2026-901. PO-2026-0001 closed.',
        ipAddress: '192.168.1.40',
      },
    ]);
    console.log('[Seed]: Created sample audit log entries.');

    console.log('\n========================================================');
    console.log('PURCHASEFLOW DATABASE SEEDED SUCCESSFULLY!');
    console.log('========================================================');
    console.log('Demo Credentials for Testing:');
    console.log('--------------------------------------------------------');
    console.log('ADMIN:            admin@purchaseflow.com      / Admin@123');
    console.log('PURCHASE_MANAGER: manager@purchaseflow.com    / Manager@123');
    console.log('APPROVER:         approver@purchaseflow.com   / Approver@123');
    console.log('VENDOR:           vendor@purchaseflow.com     / Vendor@123');
    console.log('WAREHOUSE:        warehouse@purchaseflow.com  / Warehouse@123');
    console.log('FINANCE:          finance@purchaseflow.com    / Finance@123');
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
