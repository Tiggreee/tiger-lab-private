import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { IncomingMessage } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { sendJson } from '../response';
import { HttpRoute } from '../types';

type AccessMethod = 'github' | 'qr';
type AccessActor = 'owner' | 'owner-mobile' | 'automation-bot';

interface AccessSessionRecord {
  readonly token: string;
  readonly method: AccessMethod;
  readonly actor: AccessActor;
  readonly canManageChecklist: boolean;
  readonly canDeleteRecords: boolean;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

interface QrChallengeRecord {
  readonly challengeId: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  approvedAtMs?: number;
  sessionToken?: string;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const QR_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const DELETE_UNLOCK_TTL_MS = 30 * 60 * 1000;

const sessions = new Map<string, AccessSessionRecord>();
const qrChallenges = new Map<string, QrChallengeRecord>();
const deleteUnlockBySession = new Map<string, number>();

const PROD_GATE_REPORT_PATH = path.resolve('ops/runtime/production-go-no-go-report.json');

function nowMs(): number {
  return Date.now();
}

function parseQuery(req: IncomingMessage): URLSearchParams {
  const url = new URL(req.url || '/', 'http://localhost');
  return url.searchParams;
}

function cleanExpiredRecords(): void {
  const now = nowMs();

  for (const [token, session] of sessions.entries()) {
    if (Date.parse(session.expiresAt) <= now) {
      sessions.delete(token);
    }
  }

  for (const [challengeId, challenge] of qrChallenges.entries()) {
    if (challenge.expiresAtMs <= now) {
      qrChallenges.delete(challengeId);
    }
  }

  for (const [sessionToken, unlockUntil] of deleteUnlockBySession.entries()) {
    if (unlockUntil <= now) {
      deleteUnlockBySession.delete(sessionToken);
    }
  }
}

function buildPublicBaseUrl(req: IncomingMessage): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' && forwardedProto.length > 0 ? forwardedProto : 'http';
  const host = typeof req.headers.host === 'string' && req.headers.host.length > 0 ? req.headers.host : 'localhost:8787';

  return `${protocol}://${host}`;
}

function issueSession(
  method: AccessMethod,
  actor: AccessActor,
  canManageChecklist: boolean,
  canDeleteRecords: boolean
): AccessSessionRecord {
  const issuedAtMs = nowMs();
  const record: AccessSessionRecord = {
    token: randomUUID(),
    method,
    actor,
    canManageChecklist,
    canDeleteRecords,
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(issuedAtMs + SESSION_TTL_MS).toISOString()
  };

  sessions.set(record.token, record);
  return record;
}

function readSession(token: string | null): AccessSessionRecord | null {
  cleanExpiredRecords();
  if (!token) {
    return null;
  }

  return sessions.get(token) || null;
}

function resolveCanDeleteRecords(session: AccessSessionRecord): boolean {
  if (session.canDeleteRecords) {
    return true;
  }

  const unlockUntil = deleteUnlockBySession.get(session.token);
  return typeof unlockUntil === 'number' && unlockUntil > nowMs();
}

function getOwnerQrPin(): string {
  return String(process.env.DEV_OWNER_QR_PIN || '').trim();
}

function isProdGateGreen(): { ok: boolean; detail: string } {
  try {
    if (!fs.existsSync(PROD_GATE_REPORT_PATH)) {
      return { ok: false, detail: 'No existe production-go-no-go-report.json.' };
    }

    const report = JSON.parse(fs.readFileSync(PROD_GATE_REPORT_PATH, 'utf8')) as {
      gateStatus?: string;
      summary?: { pass?: number; warn?: number; fail?: number };
      generatedAt?: string;
    };

    const gateStatus = String(report.gateStatus || '').toUpperCase();
    const pass = Number(report.summary?.pass || 0);
    const fail = Number(report.summary?.fail || 0);
    const generatedAt = Date.parse(String(report.generatedAt || ''));
    const freshnessOk = Number.isFinite(generatedAt) && nowMs() - generatedAt <= 36 * 60 * 60 * 1000;

    if (gateStatus !== 'GO' || fail > 0 || pass < 10 || !freshnessOk) {
      return {
        ok: false,
        detail: `Gate no valido para desbloqueo (gateStatus=${gateStatus || 'n/a'}, pass=${pass}, fail=${fail}, fresh=${freshnessOk}).`
      };
    }

    return { ok: true, detail: `Gate validado (${gateStatus}, pass=${pass}, fail=${fail}).` };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'No se pudo leer el reporte de gate.'
    };
  }
}

function resolveNetworkHost(port: number): string {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return `${entry.address}:${port}`;
      }
    }
  }

  return `localhost:${port}`;
}

function parsePortFromOrigin(origin: string): number | null {
  try {
    const url = new URL(origin);
    if (url.port) {
      return Number(url.port);
    }

    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    return null;
  }
}

function runGitHubAuthStatus(): Promise<{ ok: boolean; account?: string; detail: string }> {
  return new Promise((resolve) => {
    execFile('gh', ['auth', 'status'], { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      const output = `${stdout || ''}\n${stderr || ''}`.trim();

      if (error) {
        resolve({
          ok: false,
          detail: output || 'No fue posible validar autenticacion con GitHub CLI (gh).'
        });
        return;
      }

      const accountMatch =
        output.match(/Logged in to github\\.com as ([A-Za-z0-9-]+)/i) ||
        output.match(/as ([A-Za-z0-9-]+) /i);

      resolve({
        ok: true,
        account: accountMatch ? accountMatch[1] : undefined,
        detail: output || 'GitHub CLI autenticado.'
      });
    });
  });
}

export function buildDevAccessRoutes(): readonly HttpRoute[] {
  return [
    {
      method: 'POST',
      path: '/dev-access/unlock/github',
      handler: async (ctx) => {
        cleanExpiredRecords();
        const status = await runGitHubAuthStatus();

        if (!status.ok) {
          sendJson(ctx.res, 401, {
            status: 'error',
            error: `GitHub no autenticado en esta maquina. Ejecuta: gh auth login. Detalle: ${status.detail}`
          });
          return;
        }

        const session = issueSession('github', 'owner', true, false);
        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-unlock-github',
          result: {
            sessionToken: session.token,
            method: session.method,
            actor: session.actor,
            canManageChecklist: session.canManageChecklist,
            canDeleteRecords: resolveCanDeleteRecords(session),
            issuedAt: session.issuedAt,
            expiresAt: session.expiresAt,
            githubAccount: status.account || 'authenticated'
          }
        });
      }
    },
    {
      method: 'POST',
      path: '/dev-access/unlock/qr/start',
      handler: async (ctx) => {
        cleanExpiredRecords();

        const createdAtMs = nowMs();
        const challengeId = randomUUID();
        const record: QrChallengeRecord = {
          challengeId,
          createdAtMs,
          expiresAtMs: createdAtMs + QR_CHALLENGE_TTL_MS
        };

        qrChallenges.set(challengeId, record);

        const baseUrl = buildPublicBaseUrl(ctx.req);
        const approveUrl = `${baseUrl}/dev-access/unlock/qr/approve?challengeId=${encodeURIComponent(challengeId)}`;

        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-qr-start',
          result: {
            challengeId,
            approveUrl,
            ownerPinRequired: Boolean(getOwnerQrPin()),
            expiresAt: new Date(record.expiresAtMs).toISOString(),
            pollIntervalMs: 2000
          }
        });
      }
    },
    {
      method: 'GET',
      path: '/dev-access/unlock/qr/approve',
      handler: async (ctx) => {
        cleanExpiredRecords();
        const challengeId = parseQuery(ctx.req).get('challengeId');
        const ownerPin = parseQuery(ctx.req).get('ownerPin');

        if (!challengeId) {
          ctx.res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
          ctx.res.end('<h1>Solicitud invalida</h1><p>Falta challengeId.</p>');
          return;
        }

        const challenge = qrChallenges.get(challengeId);
        if (!challenge || challenge.expiresAtMs <= nowMs()) {
          ctx.res.writeHead(410, { 'content-type': 'text/html; charset=utf-8' });
          ctx.res.end('<h1>Codigo expirado</h1><p>Regresa al panel y genera otro QR.</p>');
          return;
        }

        const configuredPin = getOwnerQrPin();
        if (!configuredPin) {
          ctx.res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
          ctx.res.end('<h1>QR deshabilitado</h1><p>Configura DEV_OWNER_QR_PIN en el server para permitir owner mobile unlock.</p>');
          return;
        }

        if (!ownerPin) {
          ctx.res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          ctx.res.end(
            `<h1>Validacion owner</h1><p>Ingresa tu PIN para aprobar esta sesion.</p><form method="GET" action="/dev-access/unlock/qr/approve"><input type="hidden" name="challengeId" value="${challengeId}"/><input name="ownerPin" type="password" placeholder="Owner PIN" /><button type="submit">Aprobar</button></form>`
          );
          return;
        }

        if (ownerPin !== configuredPin) {
          ctx.res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
          ctx.res.end('<h1>PIN invalido</h1><p>Solo el owner puede aprobar este acceso.</p>');
          return;
        }

        if (!challenge.sessionToken) {
          const session = issueSession('qr', 'owner-mobile', true, false);
          challenge.approvedAtMs = nowMs();
          challenge.sessionToken = session.token;
          qrChallenges.set(challengeId, challenge);
        }

        ctx.res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        ctx.res.end(
          '<h1>Acceso aprobado</h1><p>Ya puedes volver al dashboard en tu computadora. Esta aprobacion desbloqueo el acceso.</p>'
        );
      }
    },
    {
      method: 'GET',
      path: '/dev-access/unlock/qr/status',
      handler: async (ctx) => {
        cleanExpiredRecords();
        const challengeId = parseQuery(ctx.req).get('challengeId');

        if (!challengeId) {
          sendJson(ctx.res, 400, {
            status: 'error',
            error: 'challengeId es requerido.'
          });
          return;
        }

        const challenge = qrChallenges.get(challengeId);
        if (!challenge) {
          sendJson(ctx.res, 404, {
            status: 'error',
            error: 'Challenge no encontrado o expirado.'
          });
          return;
        }

        if (!challenge.sessionToken) {
          sendJson(ctx.res, 200, {
            status: 'ok',
            action: 'dev-access-qr-status',
            result: {
              approved: false,
              expiresAt: new Date(challenge.expiresAtMs).toISOString()
            }
          });
          return;
        }

        const session = readSession(challenge.sessionToken);
        if (!session) {
          sendJson(ctx.res, 410, {
            status: 'error',
            error: 'La sesion aprobada ya expiro.'
          });
          return;
        }

        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-qr-status',
          result: {
            approved: true,
            sessionToken: session.token,
            method: session.method,
            actor: session.actor,
            canManageChecklist: session.canManageChecklist,
            canDeleteRecords: resolveCanDeleteRecords(session),
            issuedAt: session.issuedAt,
            expiresAt: session.expiresAt
          }
        });
      }
    },
    {
      method: 'GET',
      path: '/dev-access/session/validate',
      handler: async (ctx) => {
        cleanExpiredRecords();
        const token = parseQuery(ctx.req).get('token');
        const session = readSession(token);

        if (!session) {
          sendJson(ctx.res, 401, {
            status: 'error',
            error: 'Sesion invalida o expirada.'
          });
          return;
        }

        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-session-validate',
          result: {
            valid: true,
            sessionToken: session.token,
            method: session.method,
            actor: session.actor,
            canManageChecklist: session.canManageChecklist,
            canDeleteRecords: resolveCanDeleteRecords(session),
            issuedAt: session.issuedAt,
            expiresAt: session.expiresAt
          }
        });
      }
    },
    {
      method: 'GET',
      path: '/dev-access/delete-lock/validate',
      handler: async (ctx) => {
        cleanExpiredRecords();
        const token = parseQuery(ctx.req).get('token');
        const session = readSession(token);

        if (!session) {
          sendJson(ctx.res, 401, {
            status: 'error',
            error: 'Sesion invalida o expirada.'
          });
          return;
        }

        const gate = isProdGateGreen();
        if (!gate.ok) {
          sendJson(ctx.res, 412, {
            status: 'error',
            error: `No se desbloquea borrado: ${gate.detail}`
          });
          return;
        }

        const unlockUntil = nowMs() + DELETE_UNLOCK_TTL_MS;
        deleteUnlockBySession.set(session.token, unlockUntil);

        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-delete-lock-validate',
          result: {
            valid: true,
            canDeleteRecords: true,
            deleteUnlockedUntil: new Date(unlockUntil).toISOString(),
            detail: gate.detail
          }
        });
      }
    },
    {
      method: 'GET',
      path: '/dev-access/discovery',
      handler: async (ctx) => {
        const reqHost = typeof ctx.req.headers.host === 'string' ? ctx.req.headers.host : 'localhost:8787';
        const hostPort = Number(reqHost.split(':')[1] || 8787);
        const networkHost = resolveNetworkHost(hostPort);
        const originHeader = typeof ctx.req.headers.origin === 'string' ? ctx.req.headers.origin : '';
        const query = parseQuery(ctx.req);
        const explicitUiPort = Number(query.get('uiPort') || 0);
        const uiPort = explicitUiPort > 0 ? explicitUiPort : parsePortFromOrigin(originHeader) || 5173;
        const desktopUiUrl = originHeader || `http://localhost:${uiPort}/`;
        const mobileHostOnly = networkHost.replace(/:\d+$/, '');

        sendJson(ctx.res, 200, {
          status: 'ok',
          action: 'dev-access-discovery',
          result: {
            desktopUiUrl,
            mobileUiUrl: `http://${mobileHostOnly}:${uiPort}/`,
            apiBaseUrl: `http://${reqHost}`,
            mobileApiBaseUrl: `http://${networkHost}`
          }
        });
      }
    }
  ];
}
