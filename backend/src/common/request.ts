import type { Request } from 'express';
import 'express-session';
declare module 'express-session' { interface SessionData { userId?: number; csrf?: string; } }
export interface AppRequest extends Request { user?: { id: number; name: string; email: string; [key: string]: unknown }; rawBody?: Buffer; }
