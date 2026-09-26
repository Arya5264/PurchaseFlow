/**
 * Root Vercel Serverless Function entry point.
 * Enables zero-config deployment when Vercel project is deployed directly from repository root.
 */
const serverlessHandler = require('../server/api/index');

module.exports = (req, res) => {
  return serverlessHandler(req, res);
};
