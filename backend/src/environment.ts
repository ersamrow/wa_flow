import { config } from 'dotenv';
import { resolve } from 'node:path';
// Explicit process configuration takes precedence over the API environment file.
config({path:resolve(__dirname,'../.env'),quiet:true});
process.env.TZ = 'UTC';
process.env.NODE_ENV ||= process.env.APP_ENV === 'production' ? 'production' : 'development';
