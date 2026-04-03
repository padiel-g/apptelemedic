"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ClipboardList, ClipboardX, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitWithOfflineSupport } from '@/lib/sync-manager';

const SEVERITIES = [
  { id: 'mild', label: 'Mild', desc: 'Slight discomfort', activeClass: 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' },
  { id: 'moderate', label: 'Moderate', desc: 'Noticeable pain', activeClass: 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500' },
  { id: 'severe', label: 'Severe', desc: 'Significant pain', activeClass: 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500' },
  { id: 'critical', label: 'Critical', desc: 'Emergency level', activeClass: 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500' },
];

const BODY_AREAS = [
  'Head', 'Eyes', 'Ears/Nose/Throat', 'Chest', 'Abdomen', 'Back', 'Arms', 'Legs', 'Skin', 'General/Whole Body'
];

function getSevColor(s: string) {
  switch (s) {
    case 'mild': return 'border-l-green-500';
    case 'moderate': return 'border-l-amber-500';
    case 'severe': return 'border-l-orange-500';
    case 'critical': return 'border-l-red-500';
    default: return 'border-l-slate-300';
  }
}

function getSevBadge(s: string) {
  switch (s) {
    case 'mild': return 'bg-green-100 text-green-800 border-green-200';
    case 'moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'severe': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200 text-red-900 shadow-sm border';
    default: return 'bg-slate-100 text-slate-800';
  }
}

function SymptomCard({ symptom, onResolve, onDelete }: { symptom: any; onResolve?: (id: number) => void; onDelete?: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isResolved = symptom.is_resolved;
  
  return (
    <div className={cn(
      "p-5 rounded-xl border border-slate-200 shadow-sm transition-all border-l-4", 
      getSevColor(symptom.severity),
      isResolved ? "opacity-75 bg-slate-50" : "bg-white hover:shadow-md"
    )}>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{symptom.title}</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border", getSevBadge(symptom.severity))}>
              {symptom.severity}
            </span>
            {symptom.body_area && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-slate-100 text-slate-600 border-slate-200">
                {symptom.body_area}
              </span>
            )}
            {isResolved && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-emerald-100 text-emerald-800 border-emerald-200">
                Resolved
              </span>
            )}
          </div>
        </div>
        <div className="text-sm font-medium text-slate-500 whitespace-nowrap bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg h-fit">
          Started: {new Date(symptom.onset_date || symptom.created_at).toLocaleDateString()}
        </div>
      </div>
      
      <div className="mb-4">
        <p className={cn("text-slate-600 text-sm", !expanded && "line-clamp-2")}>
          {symptom.description}
        </p>
        {(symptom.description?.length > 100 || symptom.description?.includes('\n')) && (
          <button 
            type="button"
            onClick={() => setExpanded(!expanded)} 
            className="text-blue-600 hover:text-blue-800 text-xs font-semibold mt-1"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="text-xs font-medium text-slate-400">
          Reported on {new Date(symptom.created_at).toLocaleDateString()}
        </div>
        <div>
          {!isResolved && onResolve && (
            <Button size="sm" variant="secondary" className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => onResolve(symptom.id)}>
              Mark as Resolved
            </Button>
          )}
          {isResolved && onDelete && (
            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => onDelete(symptom.id)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientSymptomsPage() {
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const defaultDate = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ severity: 'mild', body_area: 'General/Whole Body', onset_date: defaultDate });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offlineMsg, setOfflineMsg] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const fetchSymptoms = async () => {
    const res = await fetch('/api/symptoms');
    const data = await res.json();
    setSymptoms(data.symptoms || []);
  };

  useEffect(() => { fetchSymptoms(); }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOfflineMsg('');
    try {
      const result = await submitWithOfflineSupport('/api/symptoms', form, 'symptom');
      if (result.offline) {
        setOfflineMsg('Saved offline — will sync when connection is restored.');
        setForm({ title: '', description: '', severity: 'mild', body_area: 'General/Whole Body', onset_date: defaultDate });
        setTimeout(() => { setOfflineMsg(''); setShowForm(false); }, 2000);
      } else {
        setForm({ title: '', description: '', severity: 'mild', body_area: 'General/Whole Body', onset_date: defaultDate });
        setShowForm(false);
        fetchSymptoms();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id: number) => {
    await fetch(`/api/symptoms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true })
    });
    fetchSymptoms();
  };

  const deleteSymptom = async (id: number) => {
    if (!window.confirm("Permanently delete this symptom record?")) return;
    try {
      const res = await fetch(`/api/symptoms/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Fallback for missing backend DELETE route (as requested but maybe not existing)
        alert('Backend route for DELETE may not exist. Changes will revert on refresh.');
        setSymptoms(curr => curr.filter(s => s.id !== id));
      } else {
        fetchSymptoms();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const active = symptoms.filter(s => !s.is_resolved);
  const resolved = symptoms.filter(s => s.is_resolved);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Symptoms</h2>
          </div>
          <p className="text-slate-500 mt-1">Track and report your symptoms to your medical provider.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? 'Cancel Report' : 'Report Symptom'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Report a New Symptom
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Symptom Title</label>
              <Input 
                placeholder="e.g., Chest pain, Headache, Shortness of breath"
                value={form.title || ''} 
                onChange={e => handleChange('title', e.target.value)} 
                required 
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Severity Level</label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {SEVERITIES.map(s => {
                  const isActive = form.severity === s.id;
                  return (
                    <div 
                      key={s.id}
                      onClick={() => handleChange('severity', s.id)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all text-center sm:text-left flex flex-col items-center sm:items-start",
                        isActive ? s.activeClass : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <h4 className="font-bold text-sm mb-1">{s.label}</h4>
                      <p className={cn("text-xs", isActive ? "opacity-90" : "text-slate-500")}>{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body Area */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Body Area</label>
              <div className="flex flex-wrap gap-2">
                {BODY_AREAS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleChange('body_area', b)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                      form.body_area === b
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Onset Date</label>
              <div className="max-w-[200px]">
                <Input 
                  type="date" 
                  value={form.onset_date || ''} 
                  onChange={e => handleChange('onset_date', e.target.value)} 
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Detailed Description</label>
              <textarea 
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y" 
                placeholder="Describe your symptoms in detail — when they occur, what makes them better or worse..."
                value={form.description || ''} 
                onChange={e => handleChange('description', e.target.value)} 
                required 
              />
            </div>

            {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
            {offlineMsg && <div className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">{offlineMsg}</div>}
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" className="text-slate-600 hover:bg-slate-100" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" isLoading={loading}>Submit Report</Button>
            </div>
          </form>
        </div>
      )}

      {/* Active Symptoms */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          Active Symptoms
          {active.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{active.length}</span>}
        </h3>
        
        {active.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <ClipboardX className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-1">No symptoms reported</h4>
            <p className="text-slate-500 text-sm max-w-sm mb-6">Report a symptom to keep your doctor informed about your health condition.</p>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">Report Now</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map(s => <SymptomCard key={s.id} symptom={s} onResolve={markResolved} />)}
          </div>
        )}
      </section>

      {/* Resolved Symptoms */}
      {resolved.length > 0 && (
        <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <button 
            type="button"
            className="flex items-center justify-between w-full focus:outline-none group"
            onClick={() => setShowResolved(!showResolved)}
          >
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 group-hover:text-slate-900 transition-colors">
              Resolved Symptoms
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{resolved.length}</span>
            </h3>
            <div className="p-1 bg-white rounded-md shadow-sm text-slate-400 group-hover:text-slate-600 transition-colors">
              {showResolved ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </button>
          
          {showResolved && (
            <div className="space-y-4 mt-6 pt-6 border-t border-slate-200">
              {resolved.map(s => <SymptomCard key={s.id} symptom={s} onDelete={deleteSymptom} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
