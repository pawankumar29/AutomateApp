import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/dashboard/analytics');
        if (res.data.success) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const trends = analytics?.dailyTrends || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Application Intelligence & Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">Deep analysis of submission success rates, daily throughput, and conversion metrics.</p>
      </div>

      {/* Main Trends Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">Daily Submission Throughput (Last 30 Days)</h3>
          </div>
          <span className="text-xs text-slate-400">Total data points: {trends.length}</span>
        </div>

        {trends.length > 0 ? (
          <div className="h-64 flex items-end gap-2 pt-8 pb-2 border-b border-slate-800 overflow-x-auto">
            {trends.map((item: any, i: number) => {
              const maxVal = Math.max(...trends.map((t: any) => t.total), 10);
              const heightPct = Math.round((item.total / maxVal) * 100);

              return (
                <div key={i} className="flex-1 min-w-[28px] flex flex-col items-center gap-2 group">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">
                    {item.total}
                  </div>
                  <div className="w-full bg-slate-800 rounded-t-md overflow-hidden h-44 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all group-hover:from-indigo-500 group-hover:to-indigo-300"
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            No daily statistics recorded yet. Start continuous monitoring to generate throughput data.
          </div>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-200">Platform Performance Summary</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            The multi-platform bot independently runs LinkedIn Easy Apply, Naukri.com, and Indeed Smart Apply without cross-platform contention.
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>LinkedIn Easy Apply</span>
                <span className="text-sky-400 font-semibold">Active</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 w-3/4" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Naukri 1-Click + Bump</span>
                <span className="text-blue-400 font-semibold">Active</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-4/5" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Indeed Smart Apply</span>
                <span className="text-amber-400 font-semibold">Active</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-2/3" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">Priority Enforcement Rules</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
              <span><strong>Rule A: Latest Jobs First</strong> — Strict posting timestamp descending order. Process newest eligible job first.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Rule B: 1-Company-1-Application</strong> — Permanent lock across LinkedIn, Naukri, and Indeed combined.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span><strong>Rule C: Duplicate Check</strong> — Strict URL & platform job ID deduplication across restarts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
              <span><strong>Rule D: 70%+ Skill Match</strong> — Job description evaluated against actual candidate resume.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
