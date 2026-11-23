import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sliders, Save, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Preferences: React.FC = () => {
  const { preferences, refreshUserData } = useAuth();
  const [titlesInput, setTitlesInput] = useState('Software Engineer, Full Stack Developer, Backend Developer');
  const [skillsInput, setSkillsInput] = useState('JavaScript, TypeScript, Node.js, Python, React, PostgreSQL');
  const [locationsInput, setLocationsInput] = useState('Mumbai, Bengaluru, Remote');
  const [minExp, setMinExp] = useState(1);
  const [maxExp, setMaxExp] = useState(5);
  const [matchScore, setMatchScore] = useState(70);
  const [cycleMinutes, setCycleMinutes] = useState(5);
  const [remote, setRemote] = useState(false);
  const [hybrid, setHybrid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (preferences) {
      if (preferences.preferredTitles?.length) {
        setTitlesInput(preferences.preferredTitles.join(', '));
      }
      if (preferences.preferredSkills?.length) {
        setSkillsInput(preferences.preferredSkills.join(', '));
      }
      if (preferences.preferredLocations?.length) {
        setLocationsInput(preferences.preferredLocations.join(', '));
      }
      setMinExp(preferences.minExperience ?? 1);
      setMaxExp(preferences.maxExperience ?? 5);
      setMatchScore(preferences.minMatchScore ?? 70);
      setCycleMinutes(preferences.cycleIntervalMinutes ?? 5);
      setRemote(Boolean(preferences.remotePreference));
      setHybrid(Boolean(preferences.hybridPreference));
    }
  }, [preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(false);

    const payload = {
      preferredTitles: titlesInput.split(',').map((t) => t.trim()).filter(Boolean),
      preferredSkills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
      preferredLocations: locationsInput.split(',').map((l) => l.trim()).filter(Boolean),
      minExperience: minExp,
      maxExperience: maxExp,
      minMatchScore: matchScore,
      cycleIntervalMinutes: cycleMinutes,
      remotePreference: remote,
      hybridPreference: hybrid,
    };

    try {
      const res = await api.put('/preferences', payload);
      if (res.data.success) {
        setSuccessMsg(true);
        await refreshUserData();
        setTimeout(() => setSuccessMsg(false), 3000);
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Job Preferences & Thresholds</h2>
          <p className="text-sm text-slate-400 mt-1">Configure search criteria, matching thresholds, and 5-minute cycle intervals.</p>
        </div>
        {successMsg && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Search Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">Target Search Criteria</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Target Job Titles (Comma-separated)
              </label>
              <input
                type="text"
                value={titlesInput}
                onChange={(e) => setTitlesInput(e.target.value)}
                placeholder="Software Engineer, MERN Stack Developer, Backend Developer"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Target Technical Skills (Comma-separated)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, JavaScript, TypeScript, React, Node.js, PostgreSQL"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Preferred Locations (Comma-separated)
              </label>
              <input
                type="text"
                value={locationsInput}
                onChange={(e) => setLocationsInput(e.target.value)}
                placeholder="Mumbai, Bengaluru, Remote"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Quality Controls & AI Thresholds */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-200">Quality Controls & Matching Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">Minimum Skill Match Threshold</label>
                <span className="text-xs font-bold text-indigo-400">{matchScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={matchScore}
                onChange={(e) => setMatchScore(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Jobs below {matchScore}% will be skipped automatically.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Monitoring Cycle Interval</label>
              <select
                value={cycleMinutes}
                onChange={(e) => setCycleMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>Every 5 Minutes (Standard Continuous)</option>
                <option value={10}>Every 10 Minutes</option>
                <option value={15}>Every 15 Minutes</option>
                <option value={30}>Every 30 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Min Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={minExp}
                onChange={(e) => setMinExp(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Max Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={maxExp}
                onChange={(e) => setMaxExp(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
