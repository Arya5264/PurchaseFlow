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
const { performThreeWayMatch } = require('../services/matchingService');

// Simple in-memory / HTTP request helper using the Express app
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

describe('PurchaseFlow Comprehensive Backend Test Suite', () => {
  let server;
  let tokens = {};
  let testVendor;
  let anotherVendor;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/purchaseflow';
    await mongoose.connect(mongoUri);

    // Launch temporary HTTP server for fetch tests
    await new Promise((resolve) => {
      server = app.listen(0, () => resolve());
    });

    // Helper login to acquire tokens
    const loginRole = async (email, password) => {
      const res = await makeRequest(server, 'POST', '/api/auth/login', {}, { email, password });
      assert.strictEqual(res.status, 200, `Login failed for ${email}: ${JSON.stringify(res.data)}`);
      return res.data.data.token;
    };

    tokens.admin = await loginRole('admin@purchaseflow.com', 'Admin@123');
    tokens.manager = await loginRole('manager@purchaseflow.com', 'Manager@123');
    tokens.approver = await loginRole('approver@purchaseflow.com', 'Approver@123');
    tokens.vendor = await loginRole('vendor@purchaseflow.com', 'Vendor@123');
    tokens.warehouse = await loginRole('warehouse@purchaseflow.com', 'Warehouse@123');
    tokens.finance = await loginRole('finance@purchaseflow.com', 'Finance@123');

    testVendor = await Vendor.findOne({ vendorCode: 'VEN-0001' });
    anotherVendor = await Vendor.findOne({ vendorCode: 'VEN-0002' });
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
  });

  // 1. AUTHENTICATION & PROFILE
  test('1. Authentication: Valid login returns JWT and user profile', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/auth/login',
      {},
      { email: 'manager@purchaseflow.com', password: 'Manager@123' }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.token);
    assert.strictEqual(res.data.data.user.role, 'PURCHASE_MANAGER');
  });

  test('2. Authentication: Rejects invalid password', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/auth/login',
      {},
      { email: 'manager@purchaseflow.com', password: 'WrongPassword' }
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  test('3. Authentication: GET /api/auth/me returns current user data', async () => {
    const res = await makeRequest(server, 'GET', '/api/auth/me', {
      Authorization: `Bearer ${tokens.manager}`,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.email, 'manager@purchaseflow.com');
  });

  // 2. ROLE-BASED ACCESS CONTROL (RBAC)
  test('4. RBAC: Approver cannot create purchase requisitions', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/requisitions',
      { Authorization: `Bearer ${tokens.approver}` },
      {
        department: 'HR',
        itemName: 'Unauthorized item',
        quantity: 1,
        estimatedCost: 100,
        requiredDate: '2026-10-01',
      }
    );
    assert.strictEqual(res.status, 403);
  });

  test('5. RBAC: Purchase Manager cannot approve purchase requisitions', async () => {
    const pr = await PurchaseRequisition.findOne({ status: 'PENDING_APPROVAL' });
    assert.ok(pr, 'Need a pending PR');
    const res = await makeRequest(
      server,
      'POST',
      `/api/approvals/${pr._id}/approve`,
      { Authorization: `Bearer ${tokens.manager}` },
      { remarks: 'Self approve attempt' }
    );
    assert.strictEqual(res.status, 403);
  });

  // 3. VENDOR ISOLATION / OWNERSHIP
  test('6. Vendor Ownership: Vendor cannot view purchase orders belonging to another vendor', async () => {
    // Find PO belonging to another vendor
    const otherPO = await PurchaseOrder.findOne({ vendorId: anotherVendor._id });
    assert.ok(otherPO, 'Other vendor PO must exist');

    const res = await makeRequest(
      server,
      'GET',
      `/api/purchase-orders/${otherPO._id}`,
      { Authorization: `Bearer ${tokens.vendor}` }
    );
    assert.strictEqual(res.status, 403);
  });

  // 4. COMPLETE USER JOURNEY (SCENARIO 1: STEP 1 TO STEP 15)
  test('7. Workflow Scenario 1: Complete Procurement Lifecycle from PR to PO Closure', async () => {
    // STEP 1 & 2: Purchase Manager creates PR
    const createPrRes = await makeRequest(
      server,
      'POST',
      '/api/requisitions',
      { Authorization: `Bearer ${tokens.manager}` },
      {
        department: 'Engineering',
        itemName: 'High-End AI Workstations',
        description: 'Workstations with NVIDIA RTX GPUs for Machine Learning models',
        quantity: 5,
        estimatedCost: 1500000,
        requiredDate: '2026-11-20',
        submitDirectly: false, // Start as DRAFT
      }
    );
    assert.strictEqual(createPrRes.status, 201);
    const prId = createPrRes.data.data._id;
    assert.strictEqual(createPrRes.data.data.status, 'DRAFT');

    // STEP 3: Submit PR -> PENDING_APPROVAL
    const submitPrRes = await makeRequest(
      server,
      'POST',
      `/api/requisitions/${prId}/submit`,
      { Authorization: `Bearer ${tokens.manager}` }
    );
    assert.strictEqual(submitPrRes.status, 200);
    assert.strictEqual(submitPrRes.data.data.status, 'PENDING_APPROVAL');

    // STEP 4: Approver logs in & approves PR
    const approvePrRes = await makeRequest(
      server,
      'POST',
      `/api/approvals/${prId}/approve`,
      { Authorization: `Bearer ${tokens.approver}` },
      { remarks: 'Approved for AI lab research setup.' }
    );
    assert.strictEqual(approvePrRes.status, 200);
    assert.strictEqual(approvePrRes.data.data.requisition.status, 'APPROVED');

    // Verify cannot approve twice
    const doubleApproveRes = await makeRequest(
      server,
      'POST',
      `/api/approvals/${prId}/approve`,
      { Authorization: `Bearer ${tokens.approver}` },
      { remarks: 'Double approve attempt' }
    );
    assert.strictEqual(doubleApproveRes.status, 400);

    // STEP 5: Purchase Manager generates PO from approved PR
    const createPoRes = await makeRequest(
      server,
      'POST',
      '/api/purchase-orders',
      { Authorization: `Bearer ${tokens.manager}` },
      {
        prId,
        vendorId: testVendor._id,
        deliveryDate: '2026-11-20',
        items: [
          {
            itemName: 'High-End AI Workstations',
            description: 'Workstations with NVIDIA RTX GPUs',
            quantity: 5,
            unitPrice: 254237.29,
            taxRate: 18,
          },
        ],
      }
    );
    assert.strictEqual(createPoRes.status, 201);
    const poId = createPoRes.data.data._id;
    const poNumber = createPoRes.data.data.poNumber;
    assert.strictEqual(createPoRes.data.data.status, 'GENERATED');

    // Verify cannot jump directly from GENERATED to PAID or CLOSED
    const invalidPayRes = await makeRequest(
      server,
      'POST',
      `/api/invoices/${poId}/pay`,
      { Authorization: `Bearer ${tokens.finance}` }
    );
    assert.strictEqual(invalidPayRes.status, 404); // invoice not found

    // STEP 6: Verify PDF generation for PO
    const pdfRes = await makeRequest(
      server,
      'GET',
      `/api/purchase-orders/${poId}/pdf`,
      { Authorization: `Bearer ${tokens.manager}` }
    );
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers.get('content-type'), 'application/pdf');

    // STEP 7: Purchase Manager sends PO to Vendor
    const sendPoRes = await makeRequest(
      server,
      'POST',
      `/api/purchase-orders/${poId}/send`,
      { Authorization: `Bearer ${tokens.manager}` }
    );
    assert.strictEqual(sendPoRes.status, 200);
    assert.strictEqual(sendPoRes.data.data.status, 'SENT');

    // STEP 8: Vendor logs in and acknowledges PO
    const ackPoRes = await makeRequest(
      server,
      'POST',
      `/api/purchase-orders/${poId}/acknowledge`,
      { Authorization: `Bearer ${tokens.vendor}` }
    );
    assert.strictEqual(ackPoRes.status, 200);
    assert.strictEqual(ackPoRes.data.data.status, 'ACKNOWLEDGED');

    // Mark IN_TRANSIT
    const inTransitRes = await makeRequest(
      server,
      'POST',
      `/api/purchase-orders/${poId}/in-transit`,
      { Authorization: `Bearer ${tokens.vendor}` }
    );
    assert.strictEqual(inTransitRes.status, 200);
    assert.strictEqual(inTransitRes.data.data.status, 'IN_TRANSIT');

    // STEP 9: Warehouse records receipt of 5 units
    const createGrRes = await makeRequest(
      server,
      'POST',
      '/api/receipts',
      { Authorization: `Bearer ${tokens.warehouse}` },
      {
        poId,
        condition: 'EXCELLENT',
        remarks: 'All 5 AI workstations received in perfect condition.',
        receivedItems: [
          {
            itemName: 'High-End AI Workstations',
            orderedQuantity: 5,
            receivedQuantity: 5,
            damagedQuantity: 0,
          },
        ],
      }
    );
    assert.strictEqual(createGrRes.status, 201);
    assert.strictEqual(createGrRes.data.data.poStatus, 'DELIVERED');

    // STEP 10: Vendor submits invoice
    const invAmount = 1500000;
    const invNumber = `INV-${Date.now()}`;
    const submitInvRes = await makeRequest(
      server,
      'POST',
      '/api/invoices',
      { Authorization: `Bearer ${tokens.vendor}` },
      {
        invoiceNumber: invNumber,
        poId,
        invoiceDate: '2026-11-21',
        dueDate: '2026-12-21',
        amount: invAmount,
        items: [
          {
            itemName: 'High-End AI Workstations',
            quantity: 5,
            unitPrice: 300000,
            totalPrice: 1500000,
          },
        ],
      }
    );
    assert.strictEqual(submitInvRes.status, 201);
    const invoiceId = submitInvRes.data.data._id;
    assert.strictEqual(submitInvRes.data.data.matchStatus, 'MATCHED');

    // STEP 11: Finance verifies 3-way match
    const matchRes = await makeRequest(
      server,
      'POST',
      `/api/invoices/${invoiceId}/match`,
      { Authorization: `Bearer ${tokens.finance}` }
    );
    assert.strictEqual(matchRes.status, 200);
    assert.strictEqual(matchRes.data.data.invoice.matchStatus, 'MATCHED');
    assert.strictEqual(matchRes.data.data.comparison.isMatched, true);

    // STEP 12: Finance approves invoice
    const approveInvRes = await makeRequest(
      server,
      'POST',
      `/api/invoices/${invoiceId}/approve`,
      { Authorization: `Bearer ${tokens.finance}` },
      { remarks: '3-way match passed 100%. Approved for disbursement.' }
    );
    assert.strictEqual(approveInvRes.status, 200);
    assert.strictEqual(approveInvRes.data.data.status, 'APPROVED');

    // STEP 13 & 14: Finance processes payment -> PO becomes CLOSED
    const payRes = await makeRequest(
      server,
      'POST',
      `/api/invoices/${invoiceId}/pay`,
      { Authorization: `Bearer ${tokens.finance}` },
      { paymentMethod: 'NEFT', transactionReference: 'NEFT-AI-2026-001' }
    );
    assert.strictEqual(payRes.status, 200);
    assert.strictEqual(payRes.data.data.invoice.paymentStatus, 'PAID');
    assert.strictEqual(payRes.data.data.purchaseOrder.status, 'CLOSED');
  });

  // 5. SCENARIO 2: THREE-WAY MISMATCH & PAYMENT LOCK
  test('8. Workflow Scenario 2: Three-Way Mismatch (Ordered 20, Received 18, Invoiced 20) blocks automatic payment', async () => {
    // 1. Create and approve PR for 20 laptops
    const pr = await PurchaseRequisition.create({
      prNumber: `PR-MISMATCH-${Date.now()}`,
      requestedBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      department: 'IT',
      itemName: 'Testing Laptops',
      quantity: 20,
      estimatedCost: 1000000,
      requiredDate: new Date(),
      status: 'APPROVED',
    });

    // 2. Generate PO for 20 laptops
    const po = await PurchaseOrder.create({
      poNumber: `PO-MISMATCH-${Date.now()}`,
      prId: pr._id,
      vendorId: testVendor._id,
      createdBy: (await User.findOne({ role: 'PURCHASE_MANAGER' }))._id,
      items: [
        {
          itemName: 'Testing Laptops',
          quantity: 20,
          unitPrice: 50000,
          taxRate: 0,
          totalPrice: 1000000,
        },
      ],
      subtotal: 1000000,
      tax: 0,
      totalAmount: 1000000,
      deliveryDate: new Date(),
      status: 'SENT',
    });

    // 3. Warehouse receives only 18 units (partial delivery)
    const gr = await GoodsReceipt.create({
      receiptNumber: `GR-MISMATCH-${Date.now()}`,
      poId: po._id,
      receivedBy: (await User.findOne({ role: 'WAREHOUSE' }))._id,
      receivedItems: [
        {
          itemName: 'Testing Laptops',
          orderedQuantity: 20,
          receivedQuantity: 18,
          damagedQuantity: 0,
        },
      ],
      receivedDate: new Date(),
      condition: 'PARTIAL',
      remarks: '2 units delayed in customs',
    });

    // 4. Vendor submits invoice billing for full 20 units (₹10,00,000)
    const inv = await Invoice.create({
      invoiceNumber: `INV-MISMATCH-${Date.now()}`,
      poId: po._id,
      vendorId: testVendor._id,
      invoiceDate: new Date(),
      dueDate: new Date(),
      amount: 1000000,
      items: [
        {
          itemName: 'Testing Laptops',
          quantity: 20,
          unitPrice: 50000,
          totalPrice: 1000000,
        },
      ],
      status: 'PENDING',
    });

    // Run 3-way match
    const matchResult = await performThreeWayMatch(inv, po);
    assert.strictEqual(matchResult.matchStatus, 'MISMATCHED');
    assert.ok(matchResult.discrepancyDetails.length > 0);

    const qtyDiscrepancy = matchResult.discrepancyDetails.find((d) => d.field.includes('Quantity'));
    assert.ok(qtyDiscrepancy, 'Should flag quantity discrepancy');
    assert.ok(qtyDiscrepancy.message.includes('18 units received'));

    inv.matchStatus = 'MISMATCHED';
    inv.status = 'APPROVED'; // Even if someone mistakenly approved the invoice
    await inv.save();

    // 5. Payment MUST BE BLOCKED without explicit override
    const payRes = await makeRequest(
      server,
      'POST',
      `/api/invoices/${inv._id}/pay`,
      { Authorization: `Bearer ${tokens.finance}` },
      { paymentMethod: 'BANK_TRANSFER' }
    );
    assert.strictEqual(payRes.status, 400);
    assert.ok(payRes.data.message.includes('MISMATCHED'));
  });

  // 6. DASHBOARD & REPORTING METRICS
  test('9. Dashboards: Returns role-tailored metrics for Admin and Finance', async () => {
    const adminDashRes = await makeRequest(server, 'GET', '/api/reports/dashboard', {
      Authorization: `Bearer ${tokens.admin}`,
    });
    assert.strictEqual(adminDashRes.status, 200);
    assert.ok(adminDashRes.data.data.totalUsers >= 6);
    assert.ok(adminDashRes.data.data.totalVendors >= 5);

    const financeDashRes = await makeRequest(server, 'GET', '/api/reports/dashboard', {
      Authorization: `Bearer ${tokens.finance}`,
    });
    assert.strictEqual(financeDashRes.status, 200);
    assert.ok(financeDashRes.data.data.pendingInvoices !== undefined);
  });
});
