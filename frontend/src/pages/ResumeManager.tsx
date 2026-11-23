import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Resume } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  Trash2,
  Star,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const ResumeManager: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      if (res.data.success) {
        setResumes(res.data.data);
        if (res.data.data.length > 0 && !selectedResume) {
          setSelectedResume(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        await fetchResumes();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await api.put(`/resumes/${id}/primary`);
      await fetchResumes();
    } catch (err) {
      console.error('Error setting primary resume:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      if (selectedResume?.id === id) {
        setSelectedResume(null);
      }
      await fetchResumes();
    } catch (err) {
      console.error('Error deleting resume:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">AI Resume Management</h2>
        <p className="text-sm text-slate-400 mt-1">Upload PDF or DOCX resumes with automatic AI parsing and skill extraction.</p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center relative overflow-hidden">
        <input
          type="file"
          id="resume-file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <label
          htmlFor="resume-file"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
            <UploadCloud className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-100">
              {uploading ? 'Parsing with AI Engine...' : 'Click to upload your resume'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX (Max 10MB). Text and skills are extracted automatically.</p>
          </div>
          <span className="inline-flex px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20">
            Select Resume File
          </span>
        </label>
      </div>

      {/* Resume List and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Uploaded Resumes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Uploaded Files</h3>
          {resumes.length > 0 ? (
            resumes.map((resume) => (
              <div
                key={resume.id}
                onClick={() => setSelectedResume(resume)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedResume?.id === resume.id
                    ? 'bg-slate-800/80 border-indigo-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <h5 className="text-sm font-semibold text-slate-200 line-clamp-1">{resume.fileName}</h5>
                    <p className="text-[11px] text-slate-500">{(resume.fileSize / 1024).toFixed(1)} KB • {new Date(resume.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {resume.isPrimary ? (
                    <span className="p-1 rounded bg-amber-500/10 text-amber-400" title="Primary Resume">
                      <Star className="w-4 h-4 fill-amber-400" />
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetPrimary(resume.id); }}
                      className="p-1 rounded text-slate-500 hover:text-amber-400"
                      title="Set as Primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(resume.id); }}
                    className="p-1 rounded text-slate-500 hover:text-rose-400"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">No resumes uploaded yet.</p>
          )}
        </div>

        {/* Right: Parsed Skills & AI Extraction Breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">AI-Extracted Profile Data</h3>
          </div>

          {selectedResume?.parsedData ? (
            <div className="space-y-6">
              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">Extracted Name</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedResume.parsedData.name || 'Not detected'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Extracted Email</p>
                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{selectedResume.parsedData.email || 'Not detected'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Calculated Experience</p>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">{selectedResume.parsedData.experienceYears || 0} Years</p>
                </div>
              </div>

              {/* Skills Tags */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Extracted Technical Skills & Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.parsedData.skills && selectedResume.parsedData.skills.length > 0 ? (
                    selectedResume.parsedData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No technical skills detected automatically.</p>
                  )}
                </div>
              </div>

              {/* Education List */}
              {selectedResume.parsedData.education && selectedResume.parsedData.education.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Education</h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {selectedResume.parsedData.education.map((edu, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{edu.degree} {edu.institution ? `at ${edu.institution}` : ''} {edu.year ? `(${edu.year})` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              Select an uploaded resume from the left to view parsed skills and details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
