import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  History,
  FileText,
  User,
  Sliders,
  Share2,
  BarChart3,
  Terminal,
  Settings,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Control Center', path: '/automation', icon: PlayCircle },
  { label: 'Application History', path: '/history', icon: History },
  { label: 'Resume Management', path: '/resumes', icon: FileText },
  { label: 'Candidate Profile', path: '/profile', icon: User },
  { label: 'Job Preferences', path: '/preferences', icon: Sliders },
  { label: 'Platform Integrations', path: '/integrations', icon: Share2 },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Automation Logs', path: '/logs', icon: Terminal },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand logo */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight text-white tracking-tight">JobApply <span className="text-indigo-400">AI</span></h1>
          <p className="text-[11px] text-slate-400 font-medium">Multi-Platform SaaS</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Status banner */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">Continuous Monitoring</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">LinkedIn • Naukri • Indeed (5m)</p>
        </div>
      </div>
    </aside>
  );
};
