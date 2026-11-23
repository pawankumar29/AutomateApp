import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PlatformConnection } from '../types';
import {
  Share2,
  CheckCircle2,
  XCircle,
  KeyRound,
  ShieldAlert,
  Unlink,
  Lock,
} from 'lucide-react';

export const Integrations: React.FC = () => {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchConnections = async () => {
    try {
      const res = await api.get('/connections');
      if (res.data.success) {
        setConnections(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching platform connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingPlatform) return;
    setSaving(true);
    try {
      await api.post('/connections/connect', {
        platform: connectingPlatform,
        accountIdentifier: accountEmail,
        credentials: { email: accountEmail, password: accountPassword },
      });
      setConnectingPlatform(null);
      setAccountEmail('');
      setAccountPassword('');
      await fetchConnections();
    } catch (err) {
      console.error('Error connecting account:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}? Stored sessions will be revoked.`)) return;
    try {
      await api.post('/connections/disconnect', { platform });
      await fetchConnections();
    } catch (err) {
      console.error('Error disconnecting account:', err);
    }
  };

  const platformMeta: Record<string, { name: string; color: string; desc: string }> = {
    linkedin: {
      name: 'LinkedIn',
      color: 'text-sky-400 border-sky-500/20 bg-sky-500/10',
      desc: 'Automates LinkedIn Easy Apply applications. Uses Playwright persistent stealth sessions.',
    },
    naukri: {
      name: 'Naukri.com',
      color: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
      desc: 'Automates Naukri 1-Click apply, external portal detection, and automated profile bump.',
    },
    indeed: {
      name: 'Indeed',
      color: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
      desc: 'Automates Indeed Smart Apply with inline questionnaire completion.',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Platform Account Integrations</h2>
        <p className="text-sm text-slate-400 mt-1">Connect your platform credentials securely. Encrypted at rest using AES-256.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {connections.map((conn) => {
          const meta = platformMeta[conn.platform] || { name: conn.platform, color: '', desc: '' };
          const isConnected = conn.connectionStatus === 'connected' || conn.connectionStatus === 'session_active';

          return (
            <div key={conn.platform} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${meta.color}`}>
                    {meta.name}
                  </span>
                  {isConnected ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Disconnected</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{meta.desc}</p>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Account:</span>
                    <span className="font-medium text-slate-200">{conn.accountIdentifier || 'Not configured'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Synced:</span>
                    <span className="font-medium text-slate-200">
                      {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Encryption:</span>
                    <span className="font-medium text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> AES-256
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(conn.platform)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-sm font-medium transition border border-slate-700"
                  >
                    <Unlink className="w-4 h-4" />
                    <span>Disconnect & Revoke</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConnectingPlatform(conn.platform)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Connect Account</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {connectingPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleConnectSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white capitalize">
                Connect {connectingPlatform}
              </h3>
              <button
                type="button"
                onClick={() => setConnectingPlatform(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Credentials are encrypted with AES-256. Browser sessions are kept isolated per user.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Email / Username</label>
                <input
                  type="text"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConnectingPlatform(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
              >
                {saving ? 'Encrypting & Saving...' : 'Save & Connect'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
