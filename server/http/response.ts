import { ServerResponse } from 'node:http';
import { JsonResponseBody } from './types';

export function sendJson(res: ServerResponse, statusCode: number, body: JsonResponseBody): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}
