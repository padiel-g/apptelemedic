"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { VitalsGrid } from '@/components/dashboard/VitalsGrid';
import { ReadingsChart } from '@/components/dashboard/ReadingsChart';
import { ChatBox } from '@/components/dashboard/ChatBox';
import { Spinner } from '@/components/ui/Spinner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const BADGE_COLORS: Record<string, string> = {
  hypertension: 'bg-blue-100 text-blue-700 border-blue-200',
  diabetes: 'bg-green-100 text-green-700 border-green-200',
  asthma: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancer: 'bg-red-100 text-red-700 border-red-200',
  depression: 'bg-purple-100 text-purple-700 border-purple-200',
  anxiety: 'bg-pink-100 text-pink-700 border-pink-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

function parseList(str?: string) {
  return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
}

export default function DoctorPatientDetailPage() {
  const { patientId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${patientId}`)
      .then(res => res.json())
      .then(data => {
        setProfile(data.patient || null);
        setReadings(data.readings || []);
        setLoading(false);
      });
  }, [patientId]);

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!profile) return <div className="p-6 text-red-500">Patient not found or not assigned to you.</div>;

  const latestReading = readings[0] || null;
  const conditions = parseList(profile.conditions || profile.condition);
  const allergies = parseList(profile.allergies);
  const medications = parseList(profile.medications);
  const bmi = profile.height_cm && profile.weight_kg ? (profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1) : '';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/doctor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Patient Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700">
          {profile.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{profile.full_name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {conditions.map((c: string) => (
              <span key={c} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${BADGE_COLORS[c.toLowerCase()] || 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                {c}
              </span>
            ))}
            {profile.blood_type && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-slate-100 text-slate-600 border-slate-200">
                {profile.blood_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <VitalsGrid
        reading={latestReading}
        lastUpdated={latestReading?.recorded_at}
        showLabel
      />

      {/* Charts + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Trends</h3>
          <ReadingsChart data={readings} height={400} />
        </Card>
        <div className="lg:col-span-1">
          <ChatBox patientId={parseInt(patientId as string)} />
        </div>
      </div>

      {/* Medical Profile */}
      <Card className="p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Medical Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Date of Birth</div>
            <div className="font-medium text-slate-700">{profile.date_of_birth || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Gender</div>
            <div className="font-medium text-slate-700 capitalize">{profile.gender || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Height / Weight</div>
            <div className="font-medium text-slate-700">
              {profile.height_cm ? `${profile.height_cm} cm` : 'N/A'} / {profile.weight_kg ? `${profile.weight_kg} kg` : 'N/A'}
              {bmi && <span className="text-xs text-slate-500 ml-1">(BMI {bmi})</span>}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</div>
            <div className="font-medium text-slate-700">{profile.emergency_contact || 'N/A'}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Allergies</div>
            {allergies.length === 0 ? <span className="text-sm text-slate-400">None</span> : (
              <div className="flex flex-wrap gap-1">
                {allergies.map((a: string) => (
                  <span key={a} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-semibold rounded-full border border-red-100">{a}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Medications</div>
            {medications.length === 0 ? <span className="text-sm text-slate-400">None</span> : (
              <div className="flex flex-wrap gap-1">
                {medications.map((m: string) => (
                  <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-100">{m}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Medical Notes</div>
            <div className="text-sm text-slate-700 whitespace-pre-line">{profile.medical_notes || <span className="text-slate-400">None</span>}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
