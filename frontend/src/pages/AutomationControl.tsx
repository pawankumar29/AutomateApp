import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AutomationStatus, AutomationLog } from '../types';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Terminal,
  Activity,
  CheckCircle,
  XCircle,
  Filter,
  AlertCircle,
} from 'lucide-react';

export const AutomationControl: React.FC = () => {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  const fetchStatusAndLogs = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        api.get('/automation/status'),
        api.get('/automation/logs?limit=50'),
      ]);
      if (statusRes.data.success) {
        setStatus(statusRes.data.data);
      }
      if (logsRes.data.success) {
        setLogs(logsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching automation status:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setActionInProgress(true);
    try {
      await api.post('/automation/start', { cycleIntervalMinutes: 5 });
      await fetchStatusAndLogs();
    } finally {
      setActionInProgress(false);
    }
  };

  const handlePause = async () => {
    setActionInProgress(true);
    try {
      await api.post('/automation/pause');
      await fetchStatusAndLogs();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResume = async () => {
    setActionInProgress(true);
    try {
      await api.post('/automation/resume');
      await fetchStatusAndLogs();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleStop = async () => {
    setActionInProgress(true);
    try {
      await api.post('/automation/stop');
      await fetchStatusAndLogs();
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTriggerNow = async () => {
    setActionInProgress(true);
    try {
      await api.post('/automation/trigger-now');
      await fetchStatusAndLogs();
    } finally {
      setActionInProgress(false);
    }
  };

  const isRunning = status?.status === 'RUNNING';
  const isPaused = status?.status === 'PAUSED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Automation Control Center</h2>
          <p className="text-sm text-slate-400 mt-1">Continuous 5-minute background monitoring & application runner.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerNow}
            disabled={actionInProgress}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${actionInProgress ? 'animate-spin' : ''}`} />
            <span>Trigger Cycle Now</span>
          </button>

          {!isRunning && !isPaused ? (
            <button
              onClick={handleStart}
              disabled={actionInProgress}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start 5-Min Monitoring</span>
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              disabled={actionInProgress}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Monitoring</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePause}
                disabled={actionInProgress}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStop}
                disabled={actionInProgress}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Engine Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : isPaused ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Engine State</span>
              <h3 className="text-xl font-bold text-white capitalize">{status?.status || 'STOPPED'}</h3>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Last Run: {status?.lastRunAt ? new Date(status.lastRunAt).toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Next Run: {status?.nextRunAt ? new Date(status.nextRunAt).toLocaleTimeString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Discovered</p>
            <h4 className="text-2xl font-bold text-slate-200 mt-1">{status?.jobsDiscovered ?? 0}</h4>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-indigo-400 uppercase">Matched (70%+)</p>
            <h4 className="text-2xl font-bold text-indigo-300 mt-1">{status?.jobsMatched ?? 0}</h4>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-emerald-400 uppercase">Applied</p>
            <h4 className="text-2xl font-bold text-emerald-400 mt-1">{status?.jobsApplied ?? 0}</h4>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-amber-400 uppercase">Skipped (Exp)</p>
            <h4 className="text-2xl font-bold text-amber-400 mt-1">{status?.jobsSkippedExperience ?? 0}</h4>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Skipped (&lt;70%)</p>
            <h4 className="text-2xl font-bold text-slate-400 mt-1">{status?.jobsSkippedScore ?? 0}</h4>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-semibold text-rose-400 uppercase">Failed</p>
            <h4 className="text-2xl font-bold text-rose-400 mt-1">{status?.jobsFailed ?? 0}</h4>
          </div>
        </div>
      </div>

      {/* Real-time Automation Logs Terminal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">Live Execution Log Stream</h3>
          </div>
          <span className="text-xs text-slate-400">Polling every 6s</span>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 h-80 overflow-y-auto space-y-2 border border-slate-800">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                <span
                  className={`font-semibold shrink-0 uppercase text-[10px] px-1.5 py-0.5 rounded ${
                    log.level === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-400'
                      : log.level === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {log.level}
                </span>
                {log.platform && (
                  <span className="text-indigo-400 font-semibold shrink-0">[{log.platform.toUpperCase()}]</span>
                )}
                <span className="text-slate-200 break-all">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              No automation logs recorded yet. Start monitoring to see live console output.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
