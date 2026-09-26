require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const serverHandler = require('../api/index');
const rootHandler = require('../../api/index');

async function testServerless() {
  console.log('--- Testing Vercel Serverless Function Entry Points ---');

  // 1. Test Server Directory Handler (server/api/index.js)
  const server = http.createServer((req, res) => {
    serverHandler(req, res);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Serverless handler test server listening on port ${port}`);

  // 2. Test Root Directory Handler (api/index.js)
  const rootServer = http.createServer((req, res) => {
    rootHandler(req, res);
  });
  await new Promise((resolve) => rootServer.listen(0, resolve));
  const rootPort = rootServer.address().port;
  console.log(`Root serverless handler test server listening on port ${rootPort}`);

  try {
    // 1. Test Root endpoint /
    const rootRes = await fetch(`http://127.0.0.1:${port}/`);
    const rootData = await rootRes.json();
    console.log('1a. GET / response:', rootRes.status, rootData.message);
    if (rootRes.status !== 200 || !rootData.success) throw new Error('Root endpoint failed');

    const rootRes2 = await fetch(`http://127.0.0.1:${port}/api`);
    const rootData2 = await rootRes2.json();
    console.log('1b. GET /api response:', rootRes2.status, rootData2.message);
    if (rootRes2.status !== 200 || !rootData2.success) throw new Error('GET /api endpoint failed');

    // 2. Test Health endpoint /api/health
    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    const healthData = await healthRes.json();
    console.log('2a. GET /api/health response:', healthRes.status, healthData.message, 'DB:', healthData.database);
    if (healthRes.status !== 200 || !healthData.success) throw new Error('Healthcheck /api/health failed');

    // 2b. Test Health endpoint /health (in case Vercel rewrites stripped /api)
    const healthRes2 = await fetch(`http://127.0.0.1:${port}/health`);
    const healthData2 = await healthRes2.json();
    console.log('2b. GET /health response:', healthRes2.status, healthData2.message, 'DB:', healthData2.database);
    if (healthRes2.status !== 200 || !healthData2.success) throw new Error('Healthcheck /health failed');

    // 2c. Test root handler delegates correctly for /api/health
    const rootHealthRes = await fetch(`http://127.0.0.1:${rootPort}/api/health`);
    const rootHealthData = await rootHealthRes.json();
    console.log('2c. Root Handler GET /api/health response:', rootHealthRes.status, rootHealthData.message);
    if (rootHealthRes.status !== 200 || !rootHealthData.success) throw new Error('Root Handler /api/health failed');

    // 3. Test Auth Login endpoint /api/auth/login
    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@purchaseflow.com', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    console.log('3a. POST /api/auth/login response:', loginRes.status, 'Success:', loginData.success, 'Token:', loginData.data?.token ? 'OK' : 'MISSING');
    if (loginRes.status !== 200 || !loginData.data?.token) throw new Error('Serverless Login failed');

    // 3b. Test prefix-stripped login /auth/login (verifying path prefix normalization middleware)
    const loginRes2 = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@purchaseflow.com', password: 'Admin@123' })
    });
    const loginData2 = await loginRes2.json();
    console.log('3b. POST /auth/login (stripped prefix) response:', loginRes2.status, 'Success:', loginData2.success);
    if (loginRes2.status !== 200 || !loginData2.data?.token) throw new Error('Prefix normalization failed');

    // 4. Test PDF download endpoint through serverless handler
    const poListRes = await fetch(`http://127.0.0.1:${port}/api/purchase-orders`, {
      headers: { Authorization: `Bearer ${loginData.data.token}` }
    });
    const poListData = await poListRes.json();
    if (poListData.data && poListData.data.length > 0) {
      const samplePO = poListData.data[0];
      const pdfRes = await fetch(`http://127.0.0.1:${port}/api/purchase-orders/${samplePO._id}/pdf`, {
        headers: { Authorization: `Bearer ${loginData.data.token}` }
      });
      const pdfBuffer = await pdfRes.arrayBuffer();
      console.log(`4. GET /api/purchase-orders/${samplePO._id}/pdf response:`, pdfRes.status, 'Content-Type:', pdfRes.headers.get('content-type'), 'Bytes:', pdfBuffer.byteLength);
      if (pdfRes.status !== 200 || !pdfRes.headers.get('content-type')?.includes('application/pdf') || pdfBuffer.byteLength < 500) {
        throw new Error('Serverless PDF download failed');
      }
    }

    console.log('>> ALL VERCEL SERVERLESS HANDLER VERIFICATION TESTS PASSED SUCCESSFULLY! <<');
  } finally {
    server.close();
    rootServer.close();
    await mongoose.disconnect();
  }
}

testServerless().catch((err) => {
  console.error('Serverless test failed:', err);
  process.exit(1);
});
