import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { platformConnections } from '../../db/schema.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

export class ConnectionsService {
  async getConnections(userId: string) {
    const list = await db.select().from(platformConnections).where(eq(platformConnections.userId, userId));
    const platforms = ['linkedin', 'naukri', 'indeed'];

    return platforms.map(platform => {
      const conn = list.find(c => c.platform === platform);
      return {
        platform,
        connectionStatus: conn?.connectionStatus || 'disconnected',
        accountIdentifier: conn?.accountIdentifier || null,
        lastSyncedAt: conn?.lastSyncedAt || null,
        lastError: conn?.lastError || null,
        hasCredentials: Boolean(conn?.encryptedCredentials),
        hasSessionCookies: Boolean(conn?.sessionCookies),
      };
    });
  }

  async connectAccount(userId: string, data: {
    platform: 'linkedin' | 'naukri' | 'indeed';
    accountIdentifier?: string;
    credentials?: { email?: string; password?: string };
    sessionCookies?: string;
  }) {
    const existing = await db.select().from(platformConnections)
      .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, data.platform)))
      .limit(1);

    const encryptedCredentials = data.credentials ? encrypt(JSON.stringify(data.credentials)) : undefined;
    const sessionCookies = data.sessionCookies ? encrypt(data.sessionCookies) : undefined;

    if (existing.length === 0) {
      const [newConn] = await db.insert(platformConnections).values({
        userId,
        platform: data.platform,
        connectionStatus: 'connected',
        accountIdentifier: data.accountIdentifier || data.credentials?.email || null,
        encryptedCredentials,
        sessionCookies,
        lastSyncedAt: new Date(),
      }).returning();
      return {
        platform: newConn.platform,
        connectionStatus: newConn.connectionStatus,
        accountIdentifier: newConn.accountIdentifier,
      };
    }

    const [updated] = await db.update(platformConnections)
      .set({
        connectionStatus: 'connected',
        accountIdentifier: data.accountIdentifier || data.credentials?.email || existing[0].accountIdentifier,
        ...(encryptedCredentials ? { encryptedCredentials } : {}),
        ...(sessionCookies ? { sessionCookies } : {}),
        lastSyncedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(platformConnections.id, existing[0].id))
      .returning();

    return {
      platform: updated.platform,
      connectionStatus: updated.connectionStatus,
      accountIdentifier: updated.accountIdentifier,
    };
  }

  async disconnectAccount(userId: string, platform: 'linkedin' | 'naukri' | 'indeed') {
    await db.update(platformConnections)
      .set({
        connectionStatus: 'disconnected',
        encryptedCredentials: null,
        sessionCookies: null,
        updatedAt: new Date(),
      })
      .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)));

    return { success: true };
  }

  async getDecryptedCredentials(userId: string, platform: 'linkedin' | 'naukri' | 'indeed') {
    const [conn] = await db.select().from(platformConnections)
      .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)))
      .limit(1);

    if (!conn) return null;

    let creds = null;
    if (conn.encryptedCredentials) {
      try {
        creds = JSON.parse(decrypt(conn.encryptedCredentials));
      } catch (e) {}
    }

    let cookies = null;
    if (conn.sessionCookies) {
      try {
        cookies = decrypt(conn.sessionCookies);
      } catch (e) {}
    }

    return {
      platform: conn.platform,
      accountIdentifier: conn.accountIdentifier,
      credentials: creds,
      sessionCookies: cookies,
      connectionStatus: conn.connectionStatus,
    };
  }
}

export const connectionsService = new ConnectionsService();
