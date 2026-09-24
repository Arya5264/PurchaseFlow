require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const express = require('express');
const app = require('../app');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { performThreeWayMatch } = require('../services/matchingService');

// HTTP helper using Express app instance
const makeRequest = async (server, method, path, headers = {}, body = null) => {
  const url = `http://127.0.0.1:${server.address().port}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  return { status: response.status, headers: response.headers, data };
};

describe('PurchaseFlow Complete End-to-End QA Audit Suite', () => {
  let server;
  let tokens = {};
  let vendor1;
  let vendor2;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/purchaseflow';
    await mongoose.connect(mongoUri);

    await new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });

    const loginRole = async (email, password) => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', {}, { email, password });
      assert.strictEqual(res.status, 200, `Login failed for ${email}`);
      return res.data.data.token;
    };

    tokens.admin = await loginRole('admin@purchaseflow.com', 'Admin@123');
    tokens.manager = await loginRole('manager@purchaseflow.com', 'Manager@123');
    tokens.approver = await loginRole('approver@purchaseflow.com', 'Approver@123');
    tokens.vendor = await loginRole('vendor@purchaseflow.com', 'Vendor@123');
    tokens.warehouse = await loginRole('warehouse@purchaseflow.com', 'Warehouse@123');
    tokens.finance = await loginRole('finance@purchaseflow.com', 'Finance@123');

    vendor1 = await Vendor.findOne({ vendorCode: 'VEN-0001' });
    vendor2 = await Vendor.findOne({ vendorCode: 'VEN-0002' });
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & SESSION MANAGEMENT
  // =========================================================================
  test('TC01: Valid login returns JWT token and sanitized profile for all 6 roles', async () => {
    const roles = [
      { email: 'admin@purchaseflow.com', pass: 'Admin@123', expectedRole: 'ADMIN' },
      { email: 'manager@purchaseflow.com', pass: 'Manager@123', expectedRole: 'PURCHASE_MANAGER' },
      { email: 'approver@purchaseflow.com', pass: 'Approver@123', expectedRole: 'APPROVER' },
      { email: 'vendor@purchaseflow.com', pass: 'Vendor@123', expectedRole: 'VENDOR' },
      { email: 'warehouse@purchaseflow.com', pass: 'Warehouse@123', expectedRole: 'WAREHOUSE' },
      { email: 'finance@purchaseflow.com', pass: 'Finance@123', expectedRole: 'FINANCE' },
    ];

    for (const r of roles) {
      const res = await makeRequest(server, 'POST', '/api/auth/login', {}, { email: r.email, password: r.pass });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.user.role, r.expectedRole);
      assert.strictEqual(res.data.data.user.passwordHash, undefined);
    }
  });

  test('TC02: Rejects invalid passwords with HTTP 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/auth/login', {}, { email: 'admin@purchaseflow.com', password: 'WrongPassword' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  test('TC03: Rejects non-existent email accounts with HTTP 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/auth/login', {}, { email: 'nobody@purchaseflow.com', password: 'Password123' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  test('TC04: GET /api/auth/me returns current user identity with active token', async () => {
    const res = await makeRequest(server, 'GET', '/api/auth/me', { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.role, 'FINANCE');
  });

  test('TC05: Rejects unauthenticated requests with HTTP 401', async () => {
    const res = await makeRequest(server, 'GET', '/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  // =========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC)
  // =========================================================================
  test('TC06: APPROVER cannot create purchase requisitions (HTTP 403)', async () => {
    const res = await makeRequest(server, 'POST', '/api/requisitions', { Authorization: `Bearer ${tokens.approver}` }, {
      department: 'Finance', itemName: 'Unauthorized PR', quantity: 1, estimatedCost: 1000, requiredDate: '2026-12-01'
    });
    assert.strictEqual(res.status, 403);
  });

  test('TC07: VENDOR cannot create purchase requisitions (HTTP 403)', async () => {
    const res = await makeRequest(server, 'POST', '/api/requisitions', { Authorization: `Bearer ${tokens.vendor}` }, {
      department: 'Ops', itemName: 'Vendor PR', quantity: 1, estimatedCost: 500, requiredDate: '2026-12-01'
    });
    assert.strictEqual(res.status, 403);
  });

  test('TC08: PURCHASE_MANAGER cannot approve requisitions (HTTP 403)', async () => {
    const pr = await PurchaseRequisition.findOne({ status: 'PENDING_APPROVAL' });
    assert.ok(pr);
    const res = await makeRequest(server, 'POST', `/api/approvals/${pr._id}/approve`, { Authorization: `Bearer ${tokens.manager}` }, { remarks: 'Self approve' });
    assert.strictEqual(res.status, 403);
  });

  test('TC09: WAREHOUSE cannot approve requisitions (HTTP 403)', async () => {
    const pr = await PurchaseRequisition.findOne({ status: 'PENDING_APPROVAL' });
    assert.ok(pr);
    const res = await makeRequest(server, 'POST', `/api/approvals/${pr._id}/approve`, { Authorization: `Bearer ${tokens.warehouse}` }, { remarks: 'Warehouse approve' });
    assert.strictEqual(res.status, 403);
  });

  test('TC10: APPROVER cannot generate Purchase Orders (HTTP 403)', async () => {
    const res = await makeRequest(server, 'POST', '/api/purchase-orders', { Authorization: `Bearer ${tokens.approver}` }, {
      prId: new mongoose.Types.ObjectId(), vendorId: vendor1._id, items: [], deliveryDate: '2026-12-01'
    });
    assert.strictEqual(res.status, 403);
  });

  test('TC11: PURCHASE_MANAGER cannot record Goods Receipts (HTTP 403)', async () => {
    const res = await makeRequest(server, 'POST', '/api/receipts', { Authorization: `Bearer ${tokens.manager}` }, {
      poId: new mongoose.Types.ObjectId(), receivedItems: []
    });
    assert.strictEqual(res.status, 403);
  });

  test('TC12: Non-Finance roles cannot approve invoices (HTTP 403)', async () => {
    const inv = await Invoice.findOne();
    assert.ok(inv);
    const res = await makeRequest(server, 'POST', `/api/invoices/${inv._id}/approve`, { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(res.status, 403);
  });

  test('TC13: Non-Finance roles cannot process invoice payments (HTTP 403)', async () => {
    const inv = await Invoice.findOne();
    assert.ok(inv);
    const res = await makeRequest(server, 'POST', `/api/invoices/${inv._id}/pay`, { Authorization: `Bearer ${tokens.warehouse}` }, { paymentMethod: 'UPI' });
    assert.strictEqual(res.status, 403);
  });

  test('TC14: Non-Admin roles cannot view user directory /api/users (HTTP 403)', async () => {
    const res = await makeRequest(server, 'GET', '/api/users', { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(res.status, 403);
  });

  test('TC15: Non-Admin roles cannot view audit logs /api/audit-logs (HTTP 403)', async () => {
    const res = await makeRequest(server, 'GET', '/api/audit-logs', { Authorization: `Bearer ${tokens.approver}` });
    assert.strictEqual(res.status, 403);
  });

  // =========================================================================
  // 3. RESOURCE OWNERSHIP & VENDOR ISOLATION
  // =========================================================================
  test('TC16: Vendor cannot view Purchase Orders of other vendors (HTTP 403)', async () => {
    const otherPO = await PurchaseOrder.findOne({ vendorId: vendor2._id });
    assert.ok(otherPO);
    const res = await makeRequest(server, 'GET', `/api/purchase-orders/${otherPO._id}`, { Authorization: `Bearer ${tokens.vendor}` });
    assert.strictEqual(res.status, 403);
  });

  test('TC17: Vendor cannot download PDF for other vendors POs (HTTP 403)', async () => {
    const otherPO = await PurchaseOrder.findOne({ vendorId: vendor2._id });
    assert.ok(otherPO);
    const res = await makeRequest(server, 'GET', `/api/purchase-orders/${otherPO._id}/pdf`, { Authorization: `Bearer ${tokens.vendor}` });
    assert.strictEqual(res.status, 403);
  });

  test('TC18: Vendor cannot submit invoice against another vendors PO (Rule 12: HTTP 403)', async () => {
    const otherPO = await PurchaseOrder.findOne({ vendorId: vendor2._id });
    assert.ok(otherPO);
    const res = await makeRequest(server, 'POST', '/api/invoices', { Authorization: `Bearer ${tokens.vendor}` }, {
      invoiceNumber: `INV-CROSS-${Date.now()}`,
      poId: otherPO._id,
      invoiceDate: '2026-11-01',
      dueDate: '2026-12-01',
      amount: otherPO.totalAmount,
    });
    assert.strictEqual(res.status, 403);
  });

  test('TC19: Vendor listing orders only returns their own POs', async () => {
    const res = await makeRequest(server, 'GET', '/api/purchase-orders', { Authorization: `Bearer ${tokens.vendor}` });
    assert.strictEqual(res.status, 200);
    for (const po of res.data.data) {
      assert.strictEqual(po.vendorId._id.toString(), vendor1._id.toString());
    }
  });

  // =========================================================================
  // 4. PR CREATION, SUBMISSION, REJECTION & APPROVAL
  // =========================================================================
  test('TC20: PR creation validates required fields and negative numbers (HTTP 400)', async () => {
    const res1 = await makeRequest(server, 'POST', '/api/requisitions', { Authorization: `Bearer ${tokens.manager}` }, {
      department: 'IT', quantity: 0, estimatedCost: -100
    });
    assert.strictEqual(res1.status, 400);

    const res2 = await makeRequest(server, 'POST', '/api/requisitions', { Authorization: `Bearer ${tokens.manager}` }, {
      department: 'IT', itemName: 'Valid Item', quantity: 1, estimatedCost: -50, requiredDate: '2026-11-01'
    });
    assert.strictEqual(res2.status, 400);
  });

  test('TC21: PR Rejection requires mandatory remarks (HTTP 400)', async () => {
    const pr = await PurchaseRequisition.create({
      prNumber: `PR-REJTEST-${Date.now()}`,
      requestedBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      department: 'Operations',
      itemName: 'Discretionary Office Art',
      quantity: 2,
      estimatedCost: 80000,
      requiredDate: new Date(),
      status: 'PENDING_APPROVAL',
    });

    const res = await makeRequest(server, 'POST', `/api/approvals/${pr._id}/reject`, { Authorization: `Bearer ${tokens.approver}` }, { remarks: '   ' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('mandatory'));
  });

  test('TC22: Rejection successfully updates status to REJECTED with audit log and notification', async () => {
    const pr = await PurchaseRequisition.create({
      prNumber: `PR-REJ-${Date.now()}`,
      requestedBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      department: 'Operations',
      itemName: 'Luxury Coffee Machine',
      quantity: 1,
      estimatedCost: 120000,
      requiredDate: new Date(),
      status: 'PENDING_APPROVAL',
    });

    const res = await makeRequest(server, 'POST', `/api/approvals/${pr._id}/reject`, { Authorization: `Bearer ${tokens.approver}` }, { remarks: 'Outside Q4 operational budget.' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.requisition.status, 'REJECTED');

    const audit = await AuditLog.findOne({ entityId: pr._id, action: 'REJECT_REQUISITION' });
    assert.ok(audit);

    const notif = await Notification.findOne({ relatedEntityId: pr._id, type: 'PR_REJECTED' });
    assert.ok(notif);
  });

  test('TC23: Cannot approve an already rejected PR (HTTP 400)', async () => {
    const pr = await PurchaseRequisition.findOne({ status: 'REJECTED' });
    assert.ok(pr);
    const res = await makeRequest(server, 'POST', `/api/approvals/${pr._id}/approve`, { Authorization: `Bearer ${tokens.approver}` }, { remarks: 'Approve after reject' });
    assert.strictEqual(res.status, 400);
  });

  // =========================================================================
  // 5. FULL END-TO-END PROCUREMENT LIFECYCLE (SCENARIO 1)
  // =========================================================================
  test('TC24: Complete Procurement Lifecycle (PR -> Approval -> PO -> Dispatch -> Ack -> Ship -> GR -> Invoice -> 3-Way Match -> Payment -> PO Closure)', async () => {
    // 1. Create Draft PR
    const createPrRes = await makeRequest(server, 'POST', '/api/requisitions', { Authorization: `Bearer ${tokens.manager}` }, {
      department: 'Engineering',
      itemName: 'Datacenter Server Racks',
      description: '42U Server Racks with Smart PDU',
      quantity: 4,
      estimatedCost: 600000,
      requiredDate: '2026-12-15',
      submitDirectly: false,
    });
    assert.strictEqual(createPrRes.status, 201);
    const prId = createPrRes.data.data._id;
    assert.strictEqual(createPrRes.data.data.status, 'DRAFT');

    // 2. Submit PR
    const submitPrRes = await makeRequest(server, 'POST', `/api/requisitions/${prId}/submit`, { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(submitPrRes.status, 200);
    assert.strictEqual(submitPrRes.data.data.status, 'PENDING_APPROVAL');

    // 3. Approve PR
    const approvePrRes = await makeRequest(server, 'POST', `/api/approvals/${prId}/approve`, { Authorization: `Bearer ${tokens.approver}` }, { remarks: 'Datacenter expansion approved.' });
    assert.strictEqual(approvePrRes.status, 200);
    assert.strictEqual(approvePrRes.data.data.requisition.status, 'APPROVED');

    // 4. Generate PO
    const createPoRes = await makeRequest(server, 'POST', '/api/purchase-orders', { Authorization: `Bearer ${tokens.manager}` }, {
      prId,
      vendorId: vendor1._id,
      deliveryDate: '2026-12-15',
      items: [
        {
          itemName: 'Datacenter Server Racks',
          description: '42U Server Racks with Smart PDU',
          quantity: 4,
          unitPrice: 127118.64,
          taxRate: 18,
        },
      ],
    });
    assert.strictEqual(createPoRes.status, 201);
    const poId = createPoRes.data.data._id;
    const poNumber = createPoRes.data.data.poNumber;
    assert.strictEqual(createPoRes.data.data.status, 'GENERATED');

    // 5. PDF Generation check
    const pdfRes = await makeRequest(server, 'GET', `/api/purchase-orders/${poId}/pdf`, { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

    // 6. Send PO to Vendor
    const sendPoRes = await makeRequest(server, 'POST', `/api/purchase-orders/${poId}/send`, { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(sendPoRes.status, 200);
    assert.strictEqual(sendPoRes.data.data.status, 'SENT');

    // 7. Vendor Acknowledges PO
    const ackPoRes = await makeRequest(server, 'POST', `/api/purchase-orders/${poId}/acknowledge`, { Authorization: `Bearer ${tokens.vendor}` });
    assert.strictEqual(ackPoRes.status, 200);
    assert.strictEqual(ackPoRes.data.data.status, 'ACKNOWLEDGED');

    // 8. Vendor marks shipment In-Transit
    const shipRes = await makeRequest(server, 'POST', `/api/purchase-orders/${poId}/in-transit`, { Authorization: `Bearer ${tokens.vendor}` });
    assert.strictEqual(shipRes.status, 200);
    assert.strictEqual(shipRes.data.data.status, 'IN_TRANSIT');

    // 9. Warehouse records full Goods Receipt (4 units)
    const grRes = await makeRequest(server, 'POST', '/api/receipts', { Authorization: `Bearer ${tokens.warehouse}` }, {
      poId,
      condition: 'EXCELLENT',
      remarks: 'All 4 server racks received in pristine condition.',
      receivedItems: [
        { itemName: 'Datacenter Server Racks', orderedQuantity: 4, receivedQuantity: 4, damagedQuantity: 0 }
      ],
    });
    assert.strictEqual(grRes.status, 201);
    assert.strictEqual(grRes.data.data.poStatus, 'DELIVERED');

    // 10. Vendor submits matched invoice
    const invNumber = `INV-DC-${Date.now()}`;
    const submitInvRes = await makeRequest(server, 'POST', '/api/invoices', { Authorization: `Bearer ${tokens.vendor}` }, {
      invoiceNumber: invNumber,
      poId,
      invoiceDate: '2026-12-16',
      dueDate: '2027-01-16',
      amount: 600000,
      items: [
        { itemName: 'Datacenter Server Racks', quantity: 4, unitPrice: 150000, totalPrice: 600000 }
      ],
    });
    assert.strictEqual(submitInvRes.status, 201);
    const invoiceId = submitInvRes.data.data._id;
    assert.strictEqual(submitInvRes.data.data.matchStatus, 'MATCHED');

    // 11. Finance verifies 3-way match
    const matchRes = await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/match`, { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(matchRes.status, 200);
    assert.strictEqual(matchRes.data.data.invoice.matchStatus, 'MATCHED');

    // 12. Finance approves invoice
    const approveInvRes = await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/approve`, { Authorization: `Bearer ${tokens.finance}` }, { remarks: 'Verified against receipt GR.' });
    assert.strictEqual(approveInvRes.status, 200);
    assert.strictEqual(approveInvRes.data.data.status, 'APPROVED');

    // 13. Finance processes payment -> PO is marked CLOSED
    const payRes = await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/pay`, { Authorization: `Bearer ${tokens.finance}` }, {
      paymentMethod: 'BANK_TRANSFER', transactionReference: `UTR-${Date.now()}`
    });
    assert.strictEqual(payRes.status, 200);
    assert.strictEqual(payRes.data.data.invoice.paymentStatus, 'PAID');
    assert.strictEqual(payRes.data.data.purchaseOrder.status, 'CLOSED');
  });

  // =========================================================================
  // 6. WAREHOUSE RECEIPT VALIDATIONS (RULE 10)
  // =========================================================================
  test('TC25: Rule 10: Received quantity cannot exceed ordered quantity (HTTP 400)', async () => {
    const po = await PurchaseOrder.create({
      poNumber: `PO-EXCESS-${Date.now()}`,
      prId: new mongoose.Types.ObjectId(),
      vendorId: vendor1._id,
      createdBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      items: [{ itemName: 'Smart Projectors', quantity: 10, unitPrice: 40000, taxRate: 0, totalPrice: 400000 }],
      subtotal: 400000,
      tax: 0,
      totalAmount: 400000,
      deliveryDate: new Date(),
      status: 'IN_TRANSIT',
    });

    const res = await makeRequest(server, 'POST', '/api/receipts', { Authorization: `Bearer ${tokens.warehouse}` }, {
      poId: po._id,
      receivedItems: [{ itemName: 'Smart Projectors', orderedQuantity: 10, receivedQuantity: 15, damagedQuantity: 0 }],
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('exceeds ordered quantity'));
  });

  test('TC26: Rule 10: Cumulative receipts across partial deliveries cannot exceed ordered quantity (HTTP 400)', async () => {
    const po = await PurchaseOrder.create({
      poNumber: `PO-CUMULATIVE-${Date.now()}`,
      prId: new mongoose.Types.ObjectId(),
      vendorId: vendor1._id,
      createdBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      items: [{ itemName: 'Office Chairs', quantity: 10, unitPrice: 5000, taxRate: 0, totalPrice: 50000 }],
      subtotal: 50000,
      tax: 0,
      totalAmount: 50000,
      deliveryDate: new Date(),
      status: 'IN_TRANSIT',
    });

    // 1st delivery: 8 chairs
    const res1 = await makeRequest(server, 'POST', '/api/receipts', { Authorization: `Bearer ${tokens.warehouse}` }, {
      poId: po._id,
      receivedItems: [{ itemName: 'Office Chairs', orderedQuantity: 10, receivedQuantity: 8, damagedQuantity: 0 }],
    });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.data.data.poStatus, 'PARTIALLY_RECEIVED');

    // 2nd delivery: attempt 5 chairs (8 + 5 = 13 > 10)
    const res2 = await makeRequest(server, 'POST', '/api/receipts', { Authorization: `Bearer ${tokens.warehouse}` }, {
      poId: po._id,
      receivedItems: [{ itemName: 'Office Chairs', orderedQuantity: 10, receivedQuantity: 5, damagedQuantity: 0 }],
    });
    assert.strictEqual(res2.status, 400);
    assert.ok(res2.data.message.includes('exceeds ordered quantity'));
  });

  // =========================================================================
  // 7. THREE-WAY MISMATCH & PAYMENT LOCK ENFORCEMENT
  // =========================================================================
  test('TC27: Three-Way Mismatch flags quantity discrepancy and blocks payment without override', async () => {
    const po = await PurchaseOrder.create({
      poNumber: `PO-MISMATCH-TEST-${Date.now()}`,
      prId: new mongoose.Types.ObjectId(),
      vendorId: vendor1._id,
      createdBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      items: [{ itemName: 'SSD Drives 2TB', quantity: 20, unitPrice: 10000, taxRate: 0, totalPrice: 200000 }],
      subtotal: 200000,
      tax: 0,
      totalAmount: 200000,
      deliveryDate: new Date(),
      status: 'IN_TRANSIT',
    });

    // Warehouse receives 15
    await GoodsReceipt.create({
      receiptNumber: `GR-TEST-${Date.now()}`,
      poId: po._id,
      receivedBy: (await User.findOne({ role: 'WAREHOUSE' }))._id,
      receivedItems: [{ itemName: 'SSD Drives 2TB', orderedQuantity: 20, receivedQuantity: 15, damagedQuantity: 0 }],
      receivedDate: new Date(),
      condition: 'PARTIAL',
    });

    // Vendor submits invoice for full 20
    const invRes = await makeRequest(server, 'POST', '/api/invoices', { Authorization: `Bearer ${tokens.vendor}` }, {
      invoiceNumber: `INV-SSD-${Date.now()}`,
      poId: po._id,
      invoiceDate: '2026-11-01',
      dueDate: '2026-12-01',
      amount: 200000,
      items: [{ itemName: 'SSD Drives 2TB', quantity: 20, unitPrice: 10000, totalPrice: 200000 }],
    });
    assert.strictEqual(invRes.status, 201);
    const invoiceId = invRes.data.data._id;
    assert.strictEqual(invRes.data.data.matchStatus, 'MISMATCHED');

    // Approve invoice
    await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/approve`, { Authorization: `Bearer ${tokens.finance}` }, { remarks: 'Approved with discrepancy flag' });

    // Payment without override MUST BE BLOCKED
    const payBlockRes = await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/pay`, { Authorization: `Bearer ${tokens.finance}` }, {
      paymentMethod: 'BANK_TRANSFER'
    });
    assert.strictEqual(payBlockRes.status, 400);
    assert.ok(payBlockRes.data.message.includes('MISMATCHED'));

    // Payment WITH override is permitted
    const payAllowRes = await makeRequest(server, 'POST', `/api/invoices/${invoiceId}/pay`, { Authorization: `Bearer ${tokens.finance}` }, {
      paymentMethod: 'BANK_TRANSFER', overrideMismatch: true, transactionReference: 'UTR-OVERRIDE-01'
    });
    assert.strictEqual(payAllowRes.status, 200);
    assert.strictEqual(payAllowRes.data.data.invoice.paymentStatus, 'PAID');
  });

  test('TC28: Rule 14: Rejected invoice cannot be paid (HTTP 400)', async () => {
    const inv = await Invoice.create({
      invoiceNumber: `INV-REJ-PAY-${Date.now()}`,
      poId: new mongoose.Types.ObjectId(),
      vendorId: vendor1._id,
      invoiceDate: new Date(),
      dueDate: new Date(),
      amount: 50000,
      status: 'REJECTED',
      remarks: 'Incorrect billing rate',
    });

    const res = await makeRequest(server, 'POST', `/api/invoices/${inv._id}/pay`, { Authorization: `Bearer ${tokens.finance}` }, { paymentMethod: 'UPI' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('REJECTED'));
  });

  test('TC29: Rule 15: Already paid invoice cannot be paid again (HTTP 400)', async () => {
    const inv = await Invoice.create({
      invoiceNumber: `INV-DOUBLE-PAY-${Date.now()}`,
      poId: new mongoose.Types.ObjectId(),
      vendorId: vendor1._id,
      invoiceDate: new Date(),
      dueDate: new Date(),
      amount: 50000,
      status: 'APPROVED',
      paymentStatus: 'PAID',
    });

    const res = await makeRequest(server, 'POST', `/api/invoices/${inv._id}/pay`, { Authorization: `Bearer ${tokens.finance}` }, { paymentMethod: 'UPI' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('already been processed'));
  });

  // =========================================================================
  // 8. NOTIFICATIONS, AUDIT LOGS, REPORTS & PAGINATION
  // =========================================================================
  test('TC30: Notifications API allows fetching and marking read', async () => {
    const getRes = await makeRequest(server, 'GET', '/api/notifications', { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.data.data.length >= 0);

    const readAllRes = await makeRequest(server, 'PUT', '/api/notifications/read-all', { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(readAllRes.status, 200);
  });

  test('TC31: Dashboards return role-specific operational metrics for all roles', async () => {
    const roles = [tokens.admin, tokens.manager, tokens.approver, tokens.vendor, tokens.warehouse, tokens.finance];
    for (const tok of roles) {
      const res = await makeRequest(server, 'GET', '/api/reports/dashboard', { Authorization: `Bearer ${tok}` });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.data);
    }
  });

  test('TC32: Analytical Purchase Reports return valid aggregated metrics for Finance & Admin', async () => {
    const res = await makeRequest(server, 'GET', '/api/reports/purchases', { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.data.monthlySpend));
    assert.ok(Array.isArray(res.data.data.spendByVendor));
    assert.ok(Array.isArray(res.data.data.requisitionsByDept));
  });

  test('TC33: Search, filtering, and pagination operate seamlessly across all data tables', async () => {
    // 1. PR Search
    const prRes = await makeRequest(server, 'GET', '/api/requisitions?search=PR-&page=1&limit=5', { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(prRes.status, 200);
    assert.ok(prRes.data.pagination.limit === 5);

    // 2. PO Search & Status filter
    const poRes = await makeRequest(server, 'GET', '/api/purchase-orders?status=CLOSED&page=1&limit=5', { Authorization: `Bearer ${tokens.manager}` });
    assert.strictEqual(poRes.status, 200);
    assert.ok(poRes.data.pagination);

    // 3. Invoice Search & MatchStatus filter
    const invRes = await makeRequest(server, 'GET', '/api/invoices?matchStatus=MATCHED&page=1&limit=5', { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(invRes.status, 200);
    assert.ok(invRes.data.pagination);

    // 4. Goods Receipt search
    const grRes = await makeRequest(server, 'GET', '/api/receipts?page=1&limit=5', { Authorization: `Bearer ${tokens.warehouse}` });
    assert.strictEqual(grRes.status, 200);
    assert.ok(grRes.data.pagination);

    // 5. Payment ledger
    const payRes = await makeRequest(server, 'GET', '/api/payments?page=1&limit=5', { Authorization: `Bearer ${tokens.finance}` });
    assert.strictEqual(payRes.status, 200);
    assert.ok(payRes.data.pagination);
  });
});
