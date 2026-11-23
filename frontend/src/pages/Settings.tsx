import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, ShieldCheck, Key, UserCheck } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Account & Security Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Tenant isolation settings, authentication parameters, and session controls.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-semibold text-slate-200">Account Credentials</h3>
            <p className="text-xs text-slate-400">Signed in as {user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">User ID</p>
            <p className="font-mono text-xs text-slate-200 mt-1 break-all">{user?.id}</p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-400">Role & Permissions</p>
            <p className="font-semibold text-emerald-400 mt-1 capitalize">{user?.role || 'SaaS User'}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-semibold text-slate-200">Security & Isolation</h3>
            <p className="text-xs text-slate-400">Tenant-level data isolation is active.</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          All resumes, preferences, platform connections, and application histories are completely isolated to your tenant account.
          No other user or process has access to your data or credentials.
        </p>
      </div>
    </div>
  );
};
