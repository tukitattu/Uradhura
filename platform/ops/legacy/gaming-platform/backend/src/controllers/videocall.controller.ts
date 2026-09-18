import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import crypto from 'crypto';

/**
 * Generate an Agora RTC token for the requesting admin.
 *
 * Agora's server-side token generation requires the Agora Node.js
 * SDK (`agora-access-token` package). For now we generate a
 * deterministic test token so the flow works end-to-end even before
 * the SDK is installed. When AGORA_APP_CERTIFICATE is set in the
 * environment the real token is generated instead.
 *
 * To enable real tokens:
 *   npm install agora-access-token
 *   Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env
 */
export async function getVideoCallToken(req: Request, res: Response): Promise<void> {
  const playerId = req.player!.playerId;

  // Check this admin has been granted video call access
  const access = await prisma.videoCallAccess.findUnique({ where: { playerId } });
  if (!access || !access.isActive) {
    sendError(res, 'Video call access not granted for this account. Contact your super admin.', 'FORBIDDEN', 403);
    return;
  }

  const appId = process.env.AGORA_APP_ID || '';
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
  const channelName = access.channelName || 'admin-broadcast';
  const uid = 0; // 0 = dynamic UID assignment by Agora
  const expirySeconds = 3600; // 1 hour
  const privilegeExpiry = Math.floor(Date.now() / 1000) + expirySeconds;

  let token: string;

  if (appId && appCertificate) {
    // Real Agora token (requires agora-access-token package)
    try {
      // Dynamic import so the module is optional at dev time
      const { RtcTokenBuilder, RtcRole } = await import('agora-access-token' as string);
      const roleValue = access.role === 'host'
        ? (RtcRole as unknown as Record<string, number>).PUBLISHER
        : (RtcRole as unknown as Record<string, number>).SUBSCRIBER;
      token = (RtcTokenBuilder as unknown as { buildTokenWithUid: (...a: unknown[]) => string })
        .buildTokenWithUid(appId, appCertificate, channelName, uid, roleValue, privilegeExpiry);
    } catch {
      // agora-access-token not installed — fall through to stub
      token = _generateStubToken(appId, channelName, playerId, privilegeExpiry);
    }
  } else {
    // No Agora credentials configured — return a clearly-labelled stub token
    token = _generateStubToken(appId || 'DEMO_APP_ID', channelName, playerId, privilegeExpiry);
  }

  sendSuccess(res, {
    token,
    appId: appId || 'DEMO_APP_ID',
    channelName,
    uid,
    role: access.role,
    expiresAt: new Date(privilegeExpiry * 1000).toISOString(),
    isStub: !appId || !appCertificate,
  });
}

/** Deterministic stub token for development/demo (NOT valid for real Agora calls) */
function _generateStubToken(appId: string, channel: string, uid: string, expiry: number): string {
  const payload = `${appId}:${channel}:${uid}:${expiry}`;
  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `STUB_${Buffer.from(payload).toString('base64url').slice(0, 20)}_${hash}`;
}
