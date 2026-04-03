"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Calendar, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'border-l-yellow-400 bg-white shadow-sm';
    case 'confirmed': return 'border-l-blue-500 bg-white shadow-sm';
    case 'completed': return 'border-l-emerald-500 opacity-80 bg-slate-50';
    case 'cancelled': 
    case 'declined': return 'border-l-red-500 opacity-80 bg-slate-50';
    case 'rescheduled': return 'border-l-purple-500 bg-white shadow-sm';
    default: return 'border-l-slate-300 bg-white';
  }
}

function getBadgeColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled': 
    case 'declined': return 'bg-red-100 text-red-800 border-red-200';
    case 'rescheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
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
      slots.push({ value: timeStr, label: `${displayH}:${m} ${isAm ? 'AM' : 'PM'}`, disabled });
    }
  }
  return slots;
}

type TabType = 'pending' | 'confirmed' | 'today' | 'all';

function AppointmentCard({ a, onAction }: { a: any; onAction: (action: string, appt: any) => void }) {
  const isPast = ['completed', 'cancelled', 'declined', 'rescheduled'].includes(a.status);
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
          <span className="font-bold text-lg text-slate-900">{a.patient_name}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border", 
            a.type === 'emergency' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>
            {a.type.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2">{a.reason}</p>
        {(a.status === 'declined' || a.status === 'cancelled' || a.status === 'completed') && a.notes && (
          <p className="text-sm italic text-slate-500 mt-2">Notes: {a.notes}</p>
        )}
      </div>
      
      <div className="mt-4 sm:mt-0 flex flex-col items-center justify-center sm:pl-5 gap-3 sm:w-[150px]">
        <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border", getBadgeColor(a.status))}>
          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </span>
        
        {a.status === 'pending' && (
          <div className="flex flex-col gap-2 w-full">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => onAction('confirm', a)}>Confirm</Button>
            <div className="flex gap-2 w-full">
               <Button size="sm" variant="ghost" className="bg-amber-50 text-amber-700 hover:bg-amber-100 flex-1 px-1" onClick={() => onAction('rescheduleModal', a)}>Reschedule</Button>
               <Button size="sm" variant="ghost" className="bg-red-50 text-red-700 hover:bg-red-100 flex-1 px-1" onClick={() => onAction('declineModal', a)}>Decline</Button>
            </div>
          </div>
        )}
        
        {a.status === 'confirmed' && (
          <div className="flex flex-col gap-2 w-full">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 w-full" onClick={() => onAction('completeModal', a)}>Complete</Button>
            <div className="flex gap-2 w-full">
               <Button size="sm" variant="ghost" className="bg-amber-50 text-amber-700 hover:bg-amber-100 flex-1 px-1" onClick={() => onAction('rescheduleModal', a)}>Reschedule</Button>
               <Button size="sm" variant="ghost" className="border border-red-200 text-red-600 hover:bg-red-50 flex-1 px-1" onClick={() => onAction('cancelModal', a)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  
  const [modalType, setModalType] = useState<'decline'|'reschedule'|'complete'|'cancel'|null>(null);
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [modalForm, setModalForm] = useState<any>({});
  const [modalLoading, setModalLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    const res = await fetch('/api/appointments');
    const data = await res.json();
    // Sort soonest ascending
    const sorted = (data.appointments || []).sort((a: any, b: any) => {
      const d1 = new Date(a.appointment_date + 'T' + a.appointment_time);
      const d2 = new Date(b.appointment_date + 'T' + b.appointment_time);
      return d1.getTime() - d2.getTime(); // soonest first
    });
    setAppointments(sorted);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleAction = async (action: string, appt: any) => {
    if (action.endsWith('Modal')) {
      const type = action.replace('Modal', '') as any;
      setModalType(type);
      setActiveAppt(appt);
      setModalForm({ 
        reason: '', 
        notes: '', 
        new_date: type === 'reschedule' ? new Date().toISOString().slice(0, 10) : '', 
        new_time: '' 
      });
      return;
    }

    if (action === 'confirm') {
      await respondToAppt(appt.id, { action: 'confirm' });
    }
  };

  const respondToAppt = async (id: number, payload: any) => {
    setModalLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to action appointment');
      setModalType(null);
      setActiveAppt(null);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const submitModal = (e: any) => {
    e.preventDefault();
    if (!activeAppt) return;
    const p: any = { action: modalType };
    if (modalType === 'decline' || modalType === 'cancel') p.reason = modalForm.reason;
    if (modalType === 'complete') p.notes = modalForm.notes;
    if (modalType === 'reschedule') {
      p.new_date = modalForm.new_date;
      p.new_time = modalForm.new_time;
      if (!p.new_time) return alert('Select a new time slot');
    }
    respondToAppt(activeAppt.id, p);
  };

  const filtered = appointments.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return a.status === 'pending';
    if (activeTab === 'confirmed') return a.status === 'confirmed';
    if (activeTab === 'today') {
      return a.appointment_date === new Date().toISOString().slice(0, 10) && ['pending', 'confirmed'].includes(a.status);
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 relative">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Appointments</h2>
          <p className="text-slate-500 mt-1">Review and action your patients' appointment requests.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {(['pending', 'confirmed', 'today', 'all'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
              activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({appointments.filter(a => {
              if (tab === 'all') return true;
              if (tab === 'pending') return a.status === 'pending';
              if (tab === 'confirmed') return a.status === 'confirmed';
              if (tab === 'today') return a.appointment_date === new Date().toISOString().slice(0, 10) && ['pending', 'confirmed'].includes(a.status);
            }).length})
          </button>
        ))}
      </div>

      <div className="space-y-4 min-h-[300px]">
        {loading && appointments.length === 0 ? (
          <div className="text-slate-500 italic p-6">Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-1">No {activeTab !== 'all' ? activeTab : ''} appointments found</h4>
            <p className="text-slate-500 text-sm max-w-sm mb-6">Looks like your schedule is clear for this category.</p>
          </div>
        ) : (
          filtered.map(a => <AppointmentCard key={a.id} a={a} onAction={handleAction} />)
        )}
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 {modalType === 'reschedule' && "Reschedule Appointment"}
                 {modalType === 'decline' && "Decline Appointment"}
                 {modalType === 'cancel' && "Cancel Appointment"}
                 {modalType === 'complete' && "Complete Appointment"}
               </h3>
               {activeAppt && (
                 <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                   <div className="font-bold text-slate-900">{activeAppt.patient_name}</div>
                   <div className="text-slate-600">{activeAppt.appointment_date} at {activeAppt.appointment_time}</div>
                   <div className="text-slate-500 italic mt-1 max-h-12 overflow-y-auto w-full break-words">Reason: {activeAppt.reason}</div>
                 </div>
               )}
            </div>

            <form onSubmit={submitModal} className="p-6 space-y-6">
               {(modalType === 'decline' || modalType === 'cancel') && (
                 <div>
                   <label className="block text-sm font-semibold mb-2">Reason</label>
                   <textarea required className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={modalForm.reason} onChange={e => setModalForm({...modalForm, reason: e.target.value})} placeholder="Please provide a reason..." />
                   {modalType === 'decline' && (
                     <div className="flex flex-wrap gap-2 mt-3">
                       {['Schedule conflict', 'Not my specialization', 'Patient should visit ER', 'Need more info'].map(r => (
                         <span key={r} onClick={() => setModalForm({...modalForm, reason: r})} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded-full text-xs font-semibold text-slate-700">{r}</span>
                       ))}
                     </div>
                   )}
                 </div>
               )}

               {modalType === 'complete' && (
                 <div>
                   <label className="block text-sm font-semibold mb-2">Consultation Notes (Optional)</label>
                   <textarea className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={4} value={modalForm.notes} onChange={e => setModalForm({...modalForm, notes: e.target.value})} placeholder="Add clinical notes..." />
                 </div>
               )}

               {modalType === 'reschedule' && (
                 <>
                   <div>
                     <label className="block text-sm font-semibold mb-2">New Date</label>
                     <Input required type="date" value={modalForm.new_date} min={new Date().toISOString().slice(0, 10)} onChange={e => setModalForm({...modalForm, new_date: e.target.value, new_time: ''})} />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold mb-2">New Time Slot</label>
                     <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {modalForm.new_date && getTimeSlots(modalForm.new_date).map(slot => (
                          <button
                            key={slot.value}
                            type="button"
                            disabled={slot.disabled}
                            onClick={() => setModalForm({...modalForm, new_time: slot.value})}
                            className={cn(
                              "px-2 py-2 text-xs font-semibold rounded-lg border transition-all text-center",
                              slot.disabled 
                                ? "opacity-50 bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" 
                                : modalForm.new_time === slot.value
                                  ? "border-blue-500 bg-blue-600 text-white shadow-md"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                            )}
                          >
                            {slot.label}
                          </button>
                        ))}
                     </div>
                   </div>
                 </>
               )}

               <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                 <Button type="button" variant="ghost" onClick={() => { setModalType(null); setActiveAppt(null); }}>Cancel</Button>
                 {modalType === 'decline' || modalType === 'cancel' ? (
                    <Button type="submit" className="bg-red-600 hover:bg-red-700" isLoading={modalLoading}>{modalType === 'decline' ? 'Decline' : 'Cancel'} Appointment</Button>
                 ) : modalType === 'complete' ? (
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" isLoading={modalLoading}>Mark as Completed</Button>
                 ) : (
                    <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" isLoading={modalLoading}>Confirm Reschedule</Button>
                 )}
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
