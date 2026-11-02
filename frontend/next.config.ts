import type { NextConfig } from 'next';
import path from 'node:path';
// Trailing slashes in API_INTERNAL_URL would produce //api/v1/... and a 404 from the API.
const apiUrl = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').trim().replace(/\/+$/, '');
const config: NextConfig = {
  output: 'standalone',
  // npm workspaces hoist Next and React above frontend/.
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` }];
  },
};
export default config;
