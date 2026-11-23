import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { StatCard } from '../components/StatCard';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Mission Control Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time application pipeline and cross-platform metrics.</p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applications"
          value={data?.overview.total ?? 0}
          subtitle="Lifetime applications"
          icon={Briefcase}
          variant="default"
        />
        <StatCard
          title="Today's Submissions"
          value={data?.overview.today ?? 0}
          subtitle="Processed today"
          icon={Calendar}
          variant="info"
        />
        <StatCard
          title="Successfully Applied"
          value={data?.overview.successful ?? 0}
          subtitle="Verified submissions"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Needs Attention"
          value={data?.overview.needsAttention ?? 0}
          subtitle="CAPTCHA / Manual review"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Yesterday"
          value={data?.overview.yesterday ?? 0}
          subtitle="Submitted yesterday"
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="This Week"
          value={data?.overview.thisWeek ?? 0}
          subtitle="Last 7 calendar days"
          icon={Calendar}
          variant="default"
        />
        <StatCard
          title="This Month"
          value={data?.overview.thisMonth ?? 0}
          subtitle="Current calendar month"
          icon={Calendar}
          variant="default"
        />
        <StatCard
          title="Failed Submissions"
          value={data?.overview.failed ?? 0}
          subtitle="Technical errors"
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Platform Distribution Cards */}
      <div>
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Platform-Wise Distribution</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* LinkedIn Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider">LinkedIn</p>
                <h4 className="text-3xl font-extrabold text-white mt-1">{data?.platforms.linkedin ?? 0}</h4>
                <p className="text-xs text-slate-400 mt-1">Easy Apply automation</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-lg">
                in
              </div>
            </div>
          </div>

          {/* Naukri Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Naukri.com</p>
                <h4 className="text-3xl font-extrabold text-white mt-1">{data?.platforms.naukri ?? 0}</h4>
                <p className="text-xs text-slate-400 mt-1">Easy Apply + Profile bump</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                N
              </div>
            </div>
          </div>

          {/* Indeed Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Indeed</p>
                <h4 className="text-3xl font-extrabold text-white mt-1">{data?.platforms.indeed ?? 0}</h4>
                <p className="text-xs text-slate-400 mt-1">Smart Apply automation</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
                I
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Application Statistics Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-200">Daily Application Statistics</h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculated dynamically from verified application records.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">LinkedIn</th>
                <th className="py-3 px-4">Naukri</th>
                <th className="py-3 px-4">Indeed</th>
                <th className="py-3 px-4">Success</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {data?.dailyStats && data.dailyStats.length > 0 ? (
                data.dailyStats.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-200">{row.date}</td>
                    <td className="py-3.5 px-4 text-sky-400 font-medium">{row.linkedin}</td>
                    <td className="py-3.5 px-4 text-blue-400 font-medium">{row.naukri}</td>
                    <td className="py-3.5 px-4 text-amber-400 font-medium">{row.indeed}</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-medium">{row.success}</td>
                    <td className="py-3.5 px-4 text-rose-400 font-medium">{row.failed}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">{row.total}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                    No application statistics recorded yet. Start automated monitoring to see daily metrics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
