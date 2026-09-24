# PURCHASEFLOW: Purchase Requisition & Procurement Management System

> **Enterprise-Grade MERN Procurement Solution with Automated Three-Way Matching (PO ↔ Goods Receipt ↔ Invoice), Strict Role-Based Access Control, Real-Time Notifications, and Vector PDF Generation.**

---

## 1. Executive Summary & Objective

**PURCHASEFLOW** is a full-stack, enterprise-grade procurement management web application designed to digitize, automate, and strictly govern the entire purchasing lifecycle of an enterprise. It eliminates paper trails, human fraud, rogue spending, and receipt tampering by enforcing strict multi-level approvals, physical warehouse inward inspections, automated three-way reconciliation, and auditable financial disbursements.

### Complete Purchasing Lifecycle:
```
User Authentication
        ↓
Role-Based Access Control (RBAC)
        ↓
Purchase Requisition (PR)
        ↓
Managerial Approval / Rejection
        ↓
Purchase Order (PO) & PDF Generation
        ↓
Vendor Portal (Acknowledge & Ship)
        ↓
Warehouse Goods Receipt (Inspection & Defect Counting)
        ↓
Commercial Invoice Submission
        ↓
Automated Three-Way Matching Engine (PO ↔ GR ↔ Invoice)
        ↓
Finance Payment Disbursement (Mismatch Guarded)
        ↓
Purchase Order Closure & Audit Trail
```

---

## 2. Technology Stack & Architecture

- **Frontend**:
  - **Framework**: React 18 (SPA) via Vite
  - **Styling**: Tailwind CSS (custom dashboard design system, responsive layouts)
  - **Routing**: React Router v6 (`BrowserRouter`, `ProtectedRoute`, `RoleRoute`)
  - **State & Context**: `AuthContext` (JWT session management), `NotificationContext` (live polling & alerts)
  - **Data Visualization**: Recharts (Monthly spend area charts, vendor volume bar charts, department pie charts)
  - **Icons**: Lucide React
  - **HTTP Client**: Axios with Bearer token injection and centralized 401 interceptors

- **Backend**:
  - **Runtime**: Node.js
  - **Web Framework**: Express.js
  - **Authentication**: JWT (JSON Web Tokens) with 24-hour expiration & bcryptjs password hashing (salt factor 10)
  - **Document Generation**: PDFKit (server-side vector generation and streaming of Purchase Order documents)
  - **Architecture**: Modular Controller-Service-Repository pattern with centralized error handling middleware

- **Database**:
  - **Engine**: MongoDB with Mongoose ODM
  - **Connection**: `mongodb://127.0.0.1:27017/purchaseflow` (with configurable MongoDB Atlas URI via `.env`)
  - **Features**: Indexed queries, sequential number generators (`PR-YYYY-XXXX`, `PO-YYYY-XXXX`, `GR-YYYY-XXXX`, `VEN-XXXX`), cascading updates, and schema-level validation

---

## 3. System Design & Diagram Alignment

This implementation directly mirrors the software engineering artifacts located in the workspace:
1. `UseCaseDiagram.drawio`: Functional actors (`ADMIN`, `PURCHASE_MANAGER`, `APPROVER`, `VENDOR`, `WAREHOUSE`, `FINANCE`) mapped to granular permissions.
2. `ClassDiagram.drawio`: Model attributes and relational references translated into Mongoose schemas (`User`, `Vendor`, `PurchaseRequisition`, `Approval`, `PurchaseOrder`, `GoodsReceipt`, `Invoice`, `Notification`, `AuditLog`).
3. `ERDiagram.drawio`: Strict relational constraints with unique compound indexes and referential integrity.
4. `DFD_Level0.drawio` & `DFD_Level1.drawio`: Procurement data flows from departments to vendors, warehouse docks, and finance ledgers.
5. `SequenceDiagram.drawio`: Chronological sequence of synchronous and asynchronous API calls across procurement phases.
6. `StateChartDiagram.drawio`: State transitions governing the lifecycle of PRs, POs, Invoices, and Payments.
7. `ComponentDiagram.drawio`: Component boundaries across React UI, REST API, Database, and PDF Generation engines.

---

## 4. Role Matrix & Access Control (RBAC)

| Role | Access Rights & Responsibilities | Accessible Routes |
| :--- | :--- | :--- |
| **`ADMIN`** | System administrator with global visibility, user credential management, vendor directory administration, and immutable audit log inspection. | `/admin/dashboard`, `/admin/users`, `/admin/vendors`, `/admin/audit-logs`, `/reports`, `/notifications` |
| **`PURCHASE_MANAGER`** | Creates and submits PRs, converts approved PRs into formal POs, dispatches POs to vendors, downloads PDF orders, monitors fulfillment. | `/purchase/dashboard`, `/purchase/requisitions`, `/purchase/orders`, `/purchase/vendors`, `/reports`, `/notifications` |
| **`APPROVER`** | Evaluates pending departmental purchase requisitions, approves or rejects with mandatory justification notes. | `/approver/dashboard`, `/approver/pending`, `/approver/history`, `/notifications` |
| **`VENDOR`** | External supplier portal. Reviews assigned POs, acknowledges orders, marks shipments as in-transit, and submits commercial invoices. Strict data isolation prevents viewing other suppliers' records. | `/vendor/dashboard`, `/vendor/orders`, `/vendor/orders/:id`, `/vendor/invoices`, `/notifications` |
| **`WAREHOUSE`** | Receiving dock. Tracks expected deliveries, performs physical item inspections, counts received vs. damaged units, and generates Goods Receipts. | `/warehouse/dashboard`, `/warehouse/deliveries`, `/warehouse/receipts`, `/warehouse/receipts/record`, `/notifications` |
| **`FINANCE`** | Accounts payable officer. Executes Three-Way Matching reconciliation, approves/rejects vendor bills, and disburses payments. | `/finance/dashboard`, `/finance/invoices`, `/finance/invoices/:id`, `/finance/payments`, `/reports`, `/notifications` |

---

## 5. Core Business Rules & Matching Logic

1. **Sequential Identification**:
   - Sequential identifier generators ensure race-condition safe sequence numbering (`PR-2026-0001`, `PO-2026-0001`, `GR-2026-0001`, `VEN-0001`).
2. **Purchase Requisition State Machine**:
   - `DRAFT` → `PENDING_APPROVAL` → `APPROVED` / `REJECTED`.
   - Only `APPROVED` requisitions can transition to `PO_GENERATED`. Cannot be approved twice or rejected post-approval.
3. **Purchase Order State Machine**:
   - `GENERATED` → `SENT` → `ACKNOWLEDGED` → `IN_TRANSIT` → `PARTIALLY_RECEIVED` / `DELIVERED` → `INVOICE_PENDING` → `PAYMENT_PENDING` → `PAID` → `CLOSED`.
   - Arbitrary state jumps are strictly rejected by the backend guard logic.
4. **Rule 10 — Physical Receipt Quantities**:
   - Goods receipt cannot record a cumulative received quantity exceeding the ordered quantity in the PO. Damaged quantities are tracked alongside acceptable units.
5. **Rule 12 — Vendor Data Isolation**:
   - Vendor users can only view and submit invoices for Purchase Orders specifically addressed to their vendor ID. Cross-tenant access returns HTTP 403.
6. **Automated Three-Way Matching Engine**:
   - Compares:
     1. **PO Ordered**: Quantities and unit prices agreed upon in the purchase contract.
     2. **Warehouse Receipts**: Sum of actual physically inspected items received at the warehouse.
     3. **Vendor Invoice**: Quantities billed and grand invoice total.
   - Outcome is marked `MATCHED` only when:
     - Cumulative received quantity >= invoiced quantity for every item.
     - Invoiced quantity <= ordered quantity.
     - Invoice total amount matches PO total amount within a ₹1 rounding tolerance.
   - Otherwise, flagged as `MISMATCHED` with granular line-item discrepancy breakdowns.
7. **Rule 13 & 14 — Payment Discrepancy Guard**:
   - Payment cannot be processed for rejected invoices or unapproved invoices.
   - For `MISMATCHED` invoices, payment processing is blocked by default. Finance officers must provide an explicit override justification to process payment.
8. **Automated PO Closure**:
   - Upon successful payment disbursement, the invoice is set to `PAID` and the parent Purchase Order automatically transitions to `CLOSED`.

---

## 6. Pre-Seeded Demo Credentials

All test accounts are pre-seeded and available for one-click demo access on the Login page:

| Role | Email Address | Password | Function |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@purchaseflow.com` | `Admin@123` | System Admin & User Management |
| **Purchase Manager** | `manager@purchaseflow.com` | `Manager@123` | PR Creation & PO Generation |
| **Approver** | `approver@purchaseflow.com` | `Approver@123` | Department Budget Approval |
| **Vendor** | `vendor@purchaseflow.com` | `Vendor@123` | Supplier Order & Invoice Portal |
| **Warehouse** | `warehouse@purchaseflow.com` | `Warehouse@123` | Inward Dock Inspection & Receipts |
| **Finance** | `finance@purchaseflow.com` | `Finance@123` | 3-Way Match & Payment Disbursement |

---

## 7. Installation & Running Instructions

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local instance running at `mongodb://127.0.0.1:27017` (or cloud MongoDB Atlas connection string)

### Quick Start

1. **Clone or Navigate to the Workspace**:
   ```bash
   cd "a:\5-lab\software\mine project"
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   # Seed the database with demo users, vendors, PRs, POs, and receipts:
   npm run seed
   # Start the Express server (runs on http://localhost:5000):
   npm start
   ```

3. **Frontend Setup**:
   ```bash
   cd ../client
   npm install
   # Start the Vite development server (runs on http://localhost:5173):
   npm run dev
   ```

4. **Run Automated Test Suite**:
   ```bash
   cd ../server
   npm test
   ```
   *Runs the 9-scenario automated test suite verifying Auth, RBAC, Vendor Isolation, State Machines, Three-Way Matching, and Mismatch Payment Blockages.*

5. **Build for Production**:
   ```bash
   cd ../client
   npm run build
   ```

---

## 8. Step-by-Step Procurement Walkthroughs

### Scenario 1: Happy Path Procurement (Zero Variances)
1. **Requisition**: Purchase Manager logs in (`manager@purchaseflow.com`), creates a PR for 20 Dell UltraSharp Monitors (₹12,00,000), and submits for approval.
2. **Approval**: Approver logs in (`approver@purchaseflow.com`), reviews the requisition, and clicks **Approve**.
3. **PO Creation**: Purchase Manager opens approved PR, clicks **Generate PO**, selects TechCorp India, and clicks **Send to Vendor**.
4. **PDF Generation**: Purchase Manager exports the digitally generated vector PDF of the PO.
5. **Vendor Confirmation**: Vendor logs in (`vendor@purchaseflow.com`), acknowledges the order, and clicks **Ship Order** (sets status to `IN_TRANSIT`).
6. **Warehouse Receiving**: Warehouse staff logs in (`warehouse@purchaseflow.com`), opens Expected Deliveries, records 20 received units in GOOD condition, and submits. PO status updates to `DELIVERED`.
7. **Billing**: Vendor submits invoice `INV-2026-0001` for ₹12,00,000 (20 units).
8. **3-Way Match & Settlement**: Finance logs in (`finance@purchaseflow.com`), opens Invoice Details. The 3-Way Match Engine verifies PO (20) = GR (20) = Invoice (20). Result is `MATCHED`. Finance clicks **Approve**, then clicks **Disburse Payment**. The PO is automatically marked `CLOSED`.

### Scenario 2: Three-Way Mismatch Detection & Payment Blockage
1. **Delivery Discrepancy**: Warehouse receives a shipment where only 18 units arrived intact. Warehouse records 18 units received (PO status becomes `PARTIALLY_RECEIVED`).
2. **Overbilling**: Vendor mistakenly bills for 20 units (₹12,00,000).
3. **Discrepancy Flagging**: When the invoice is submitted, the matching engine instantly marks it `MISMATCHED` with variance flags:
   - Line variance: *Received (18) is less than Invoiced (20)*.
4. **Payment Blockage**: Finance reviews the invoice. The **Disburse Payment** action is blocked with an alert: *Payment blocked: Invoice has 3-way matching discrepancies*.
5. **Resolution**: Finance can either reject the invoice requesting a revised bill of 18 units, or execute a documented management override with explicit justification.

---

## 9. API Reference Overview

- **Auth**: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/register`
- **Users**: `GET /api/users`, `POST /api/users`, `PUT /api/users/:id/status`
- **Vendors**: `GET /api/vendors`, `POST /api/vendors`, `PUT /api/vendors/:id`
- **Requisitions**: `GET /api/requisitions`, `POST /api/requisitions`, `GET /api/requisitions/:id`, `POST /api/requisitions/:id/submit`
- **Approvals**: `POST /api/approvals`, `GET /api/approvals/history`
- **Purchase Orders**: `GET /api/purchase-orders`, `POST /api/purchase-orders`, `GET /api/purchase-orders/:id`, `GET /api/purchase-orders/:id/pdf`, `POST /api/purchase-orders/:id/send`, `POST /api/purchase-orders/:id/acknowledge`, `POST /api/purchase-orders/:id/in-transit`
- **Goods Receipts**: `GET /api/receipts`, `POST /api/receipts`, `GET /api/receipts/:id`
- **Invoices**: `GET /api/invoices`, `POST /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/:id/match`, `POST /api/invoices/:id/approve`, `POST /api/invoices/:id/reject`, `POST /api/invoices/:id/pay`
- **Payments**: `GET /api/payments`
- **Notifications**: `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`
- **Reports**: `GET /api/reports/dashboard`, `GET /api/reports/purchases`
- **Audit Logs**: `GET /api/audit-logs`

---

## 10. Verification & Quality Assurance

- **Unit & Integration Tests**: Node.js automated test runner covering all critical business rules (`npm test` in `server`).
- **Production Build**: Vite bundle optimization completed with zero compile warnings or missing modules (`npm run build` in `client`).
- **Security**: Parameterized Mongoose queries protect against SQL/NoSQL injection; passwords hashed with salt rounds; JWT verified on all private endpoints; vendor multi-tenancy isolated via tenant ownership checks.
