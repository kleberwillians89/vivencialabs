import { createLeadHandler } from '../server/leads.mjs';
const handle = createLeadHandler();
export function POST(request) { return handle(request); }
export function GET(request) { return handle(request); }
