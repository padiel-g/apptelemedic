"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, CalendarX2, Info, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitWithOfflineSupport } from '@/lib/sync-manager';
import { useRouter } from 'next/navigation';

const TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'emergency', label: 'Emergency' },
];

function getTimeSlots(dateStr: string) {
  const slots = [];
  const now = new Date();
  const isToday = dateStr === now.toISOString().slice(0, 10);
  
  for (let h = 8; h <= 17; h++) {
    for (const m of ['00', '30']) {
      if (h === 17 && m === '30') continue;
      
      const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
      
      let disabled = false;
      if (isToday) {
        if (h < now.getHours() || (h === now.getHours() && parseInt(m) <= now.getMinutes())) {
          disabled = true;
        }
      }
      
      const isAm = h < 12;
      const displayH = h <= 12 ? h : h - 12;
      const label = `${displayH}:${m} ${isAm ? 'AM' : 'PM'}`;
      
      slots.push({ value: timeStr, label, disabled });
    }
  }
  return slots;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'border-l-yellow-400 bg-white shadow-sm';
    case 'confirmed': return 'border-l-blue-500 bg-white shadow-sm';
    case 'completed': return 'border-l-emerald-500 opacity-60 bg-slate-50';
    case 'cancelled': 
    case 'declined': return 'border-l-red-500 opacity-60 bg-slate-50';
    case 'rescheduled': return 'border-l-purple-500 opacity-60 bg-slate-50';
    default: return 'border-l-slate-300 bg-white';
  }
}

function getBadgeColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled': 
    case 'declined': return 'bg-red-100 text-red-800 border-red-200 line-through';
    case 'rescheduled': return 'bg-purple-100 text-purple-800 border-purple-200 line-through';
    default: return 'bg-slate-100 text-slate-800';
  }
}

function getMonthAbbr(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'short' }).toUpperCase();
}

function getDayNum(dateStr: string) {
  const date = new Date(dateStr);
  return date.getDate().toString();
}

function AppointmentCard({ a, onCancel, isPast, onVideoCall }: { a: any; onCancel?: (id: number) => void; isPast?: boolean; onVideoCall?: (appt: any) => void }) {
  return (
    <div className={cn("flex flex-col sm:flex-row p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow duration-200 border-l-4", getStatusColor(a.status))}>
      <div className="flex flex-row sm:flex-col items-center justify-center min-w-[100px] mb-4 sm:mb-0 sm:pr-5 sm:border-r border-slate-100 gap-3 sm:gap-1">
        <div className={cn("flex flex-col items-center justify-center rounded-lg p-2 w-16 h-16", isPast ? 'bg-slate-200' : 'bg-blue-50 text-blue-700')}>
          <span className="text-2xl font-black leading-none">{getDayNum(a.appointment_date)}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{getMonthAbbr(a.appointment_date)}</span>
        </div>
        <div className="text-xs font-semibold text-slate-500">{a.appointment_time}</div>
      </div>
      
      <div className="flex-1 sm:pl-5 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-lg text-slate-900">Dr. {a.doctor_name}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border", 
            a.type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>
            {a.type.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{a.reason}</p>
        
        {/* Support rendering doctor notes / decline reason directly under condition */}
        {a.notes && (a.status === 'declined' || a.status === 'cancelled') && (
           <p className="text-xs text-red-600 mt-2 font-medium italic">Reason: {a.notes}</p>
        )}
        {a.notes && a.status === 'completed' && (
           <p className="text-xs text-slate-600 mt-2 font-medium italic">Doctor's Note: {a.notes}</p>
        )}
      </div>
      
      <div className="mt-4 sm:mt-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center sm:pl-5 gap-3">
        <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", getBadgeColor(a.status))}>
          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </span>
        {a.status === 'confirmed' && onVideoCall && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5" onClick={() => onVideoCall(a)}>
            <Video className="w-3.5 h-3.5" /> Join Call
          </Button>
        )}
        {a.status === 'pending' && onCancel && (
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onCancel(a.id)}>
            Cancel Booking
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const defaultDate = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ type: 'consultation', appointment_date: defaultDate, appointment_time: '', reason: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offlineMsg, setOfflineMsg] = useState('');

  const isAssigned = !!(user as any)?.patient?.assigned_doctor_id;
  const doctorName = (user as any)?.patient?.doctor_name || '';
  const doctorSpec = (user as any)?.patient?.doctor_spec || 'Specialist';
  
  const initials = doctorName ? doctorName.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase() : '?';

  const fetchAppointments = async () => {
    const res = await fetch('/api/appointments');
    const data = await res.json();
    setAppointments(data.appointments || []);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!form.appointment_time) {
      setError('Please select a time slot.');
      return;
    }
    setLoading(true);
    setError('');
    setOfflineMsg('');
    try {
      const result = await submitWithOfflineSupport('/api/appointments', form, 'appointment');
      if (result.offline) {
        setOfflineMsg('Saved offline — will sync when connection is restored.');
        setForm({ type: 'consultation', appointment_date: defaultDate, appointment_time: '', reason: '' });
        setTimeout(() => { setOfflineMsg(''); setShowForm(false); }, 2000);
      } else {
        setForm({ type: 'consultation', appointment_date: defaultDate, appointment_time: '', reason: '' });
        setShowForm(false);
        fetchAppointments();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id: number) => {
    if (!window.confirm("Cancel this appointment?")) return;
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    });
    fetchAppointments();
  };

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => ['completed', 'cancelled', 'declined', 'rescheduled'].includes(a.status));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
          </div>
          <p className="text-slate-500 mt-1">Manage your medical appointments securely.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          onClick={() => setShowForm(v => !v)}
          disabled={!isAssigned}
        >
          {showForm ? 'Cancel Booking' : 'Book Appointment'}
        </Button>
      </div>

      {!isAssigned && (
        <div className="flex gap-4 bg-yellow-50 text-yellow-800 p-5 rounded-xl border border-yellow-200 font-medium text-sm shadow-sm">
          <Info className="w-5 h-5 flex-shrink-0" />
          <p>You cannot book an appointment until a doctor is assigned to your case. A medical specialist will review your profile shortly.</p>
        </div>
      )}

      {showForm && isAssigned && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Schedule New Appointment</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Assigned Doctor Display */}
            <div>
               <label className="block text-sm font-semibold text-slate-900 mb-2">Assigned Doctor</label>
               <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                   {initials}
                 </div>
                 <div>
                   <div className="font-bold text-slate-900">Dr. {doctorName}</div>
                   <div className="text-xs text-slate-500 uppercase tracking-wider">{doctorSpec}</div>
                 </div>
               </div>
            </div>

            {/* Type Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Appointment Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleChange('type', t.value)}
                    className={cn(
                      "px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-center",
                      form.type === t.value 
                        ? (t.value === 'emergency' ? "border-red-500 bg-red-50 text-red-700 shadow-sm" : "border-blue-500 bg-blue-50 text-blue-700 shadow-sm")
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Date</label>
              <Input 
                type="date"
                icon={<Calendar className="w-4 h-4" />}
                value={form.appointment_date} 
                onChange={e => {
                  handleChange('appointment_date', e.target.value);
                  handleChange('appointment_time', ''); // reset time on date change
                }} 
                required 
                min={new Date().toISOString().slice(0,10)} 
              />
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Time Slot</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {getTimeSlots(form.appointment_date).map(slot => (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={slot.disabled}
                    onClick={() => handleChange('appointment_time', slot.value)}
                    className={cn(
                      "px-2 py-2 text-xs font-semibold rounded-lg border transition-all text-center",
                      slot.disabled 
                        ? "opacity-50 bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" 
                        : form.appointment_time === slot.value
                          ? "border-blue-500 bg-blue-600 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Reason for Visit</label>
              <textarea 
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y" 
                placeholder="Briefly describe the reason for your visit..."
                value={form.reason || ''} 
                onChange={e => handleChange('reason', e.target.value)} 
                required
              />
            </div>

            {error && <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
            {offlineMsg && <div className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">{offlineMsg}</div>}
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" className="text-slate-600 hover:bg-slate-100" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" isLoading={loading}>Book Appointment</Button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          Upcoming
          {upcoming.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{upcoming.length}</span>}
        </h3>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <CalendarX2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-1">No upcoming appointments</h4>
            <p className="text-slate-500 text-sm max-w-sm mb-6">Book an appointment with your doctor to get started with your medical care.</p>
            <Button onClick={() => setShowForm(true)} disabled={!isAssigned}>Book Now</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map(a => <AppointmentCard key={a.id} a={a} onCancel={cancelAppointment} onVideoCall={(appt) => router.push(`/patient/video-call?appointmentId=${appt.id}&doctorName=${encodeURIComponent(appt.doctor_name)}`)} />)}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-4 text-opacity-80">Past</h3>
        {past.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No past appointments yet.</p>
        ) : (
          <div className="space-y-4">
            {past.map(a => <AppointmentCard key={a.id} a={a} isPast />)}
          </div>
        )}
      </section>
    </div>
  );
}
