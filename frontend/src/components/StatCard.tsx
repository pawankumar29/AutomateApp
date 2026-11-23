import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-slate-900 border-slate-800 text-slate-100',
    success: 'bg-slate-900 border-emerald-500/30 text-emerald-400',
    warning: 'bg-slate-900 border-amber-500/30 text-amber-400',
    danger: 'bg-slate-900 border-rose-500/30 text-rose-400',
    info: 'bg-slate-900 border-indigo-500/30 text-indigo-400',
  };

  const iconBg = {
    default: 'bg-slate-800 text-slate-400',
    success: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    danger: 'bg-rose-500/10 text-rose-400',
    info: 'bg-indigo-500/10 text-indigo-400',
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm transition hover:border-slate-700 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-100">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconBg[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
