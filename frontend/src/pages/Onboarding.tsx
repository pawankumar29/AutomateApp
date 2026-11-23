import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, ArrowRight, UploadCloud, User, Sliders } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [currentLocation, setCurrentLocation] = useState('Mumbai, India');
  const [currentDesignation, setCurrentDesignation] = useState('Software Engineer');
  const [totalExperienceYears, setTotalExperienceYears] = useState(3.5);
  const [expectedSalary, setExpectedSalary] = useState('15 LPA');
  const [noticePeriod, setNoticePeriod] = useState('30 days');
  const [targetTitle, setTargetTitle] = useState('Software Engineer');
  const [targetSkills, setTargetSkills] = useState('Python, JavaScript, React, Node.js');
  const [saving, setSaving] = useState(false);

  const { refreshUserData } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Update Profile
      await api.put('/profile', {
        currentLocation,
        currentDesignation,
        totalExperienceYears,
        expectedSalary,
        noticePeriod,
      });

      // 2. Update Preferences
      await api.put('/preferences', {
        preferredTitles: targetTitle.split(',').map((t) => t.trim()),
        preferredSkills: targetSkills.split(',').map((s) => s.trim()),
        minMatchScore: 70,
        cycleIntervalMinutes: 5,
      });

      await refreshUserData();
      navigate('/');
    } catch (err) {
      console.error('Error during onboarding:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
          <span className="font-semibold text-indigo-400">Step {step} of 2</span>
          <span>{step === 1 ? 'Profile Information' : 'Job Preferences'}</span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Let's set up your profile</h3>
            <p className="text-xs text-slate-400">This data informs the AI questionnaire engine when answering screening questions.</p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Current Location</label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Current Designation</label>
                <input
                  type="text"
                  value={currentDesignation}
                  onChange={(e) => setCurrentDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Total Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={totalExperienceYears}
                    onChange={(e) => setTotalExperienceYears(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Notice Period</label>
                  <input
                    type="text"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Expected Salary</label>
                <input
                  type="text"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Target Job Preferences</h3>
            <p className="text-xs text-slate-400">Configure what jobs you want the system to continuously fetch and apply for.</p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Job Titles</label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Key Technical Skills</label>
                <input
                  type="text"
                  value={targetSkills}
                  onChange={(e) => setTargetSkills(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p><strong>Minimum Match Score:</strong> 70% (Configured)</p>
                <p><strong>Monitoring Interval:</strong> 5 minutes (Continuous)</p>
                <p><strong>Priority Order:</strong> Latest jobs first (Date Descending)</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20"
              >
                <span>{saving ? 'Saving...' : 'Complete Onboarding & Go to Dashboard'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
