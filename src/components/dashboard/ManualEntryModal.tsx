import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { submitWithOfflineSupport } from '@/lib/sync-manager';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualEntryModal({ isOpen, onClose, onSuccess }: ManualEntryModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [offlineMsg, setOfflineMsg] = useState('');
  const [formData, setFormData] = useState({
    pulse: '',
    temperature: '',
    oxygen: '',
    bp_sys: '',
    bp_dia: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Client-side validation for required fields
    const pulse = Number(formData.pulse);
    const temperature = Number(formData.temperature);
    const oxygen = Number(formData.oxygen);
    if (
      isNaN(pulse) || pulse < 20 ||
      isNaN(temperature) || temperature < 30 ||
      isNaN(oxygen) || oxygen < 50
    ) {
      alert('Please enter valid values: Pulse ≥ 20, Temperature ≥ 30, Oxygen ≥ 50.');
      return;
    }

    setLoading(true);
    setOfflineMsg('');
    try {
      const result = await submitWithOfflineSupport('/api/health-data/manual', {
        pulse,
        temperature,
        oxygen,
        bp_sys: formData.bp_sys ? Number(formData.bp_sys) : undefined,
        bp_dia: formData.bp_dia ? Number(formData.bp_dia) : undefined,
        notes: formData.notes
      }, 'vital');

      if (result.offline) {
        setOfflineMsg('Saved offline — will sync when connection is restored.');
        setFormData({ pulse: '', temperature: '', oxygen: '', bp_sys: '', bp_dia: '', notes: '' });
        setTimeout(() => { setOfflineMsg(''); onClose(); }, 2000);
      } else {
        onSuccess();
        onClose();
        setFormData({ pulse: '', temperature: '', oxygen: '', bp_sys: '', bp_dia: '', notes: '' });
      }
    } catch (err: any) {
      alert(err.message || 'Error saving reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Health Reading">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Pulse Rate (bpm)" 
            type="number" 
            required 
            value={formData.pulse} 
            onChange={e => setFormData({...formData, pulse: e.target.value})} 
          />
          <Input 
            label="Temperature (°C)" 
            type="number" 
            step="0.1" 
            required 
            value={formData.temperature} 
            onChange={e => setFormData({...formData, temperature: e.target.value})} 
          />
          <Input 
            label="Oxygen SpO2 (%)" 
            type="number" 
            required 
            value={formData.oxygen} 
            onChange={e => setFormData({...formData, oxygen: e.target.value})} 
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Blood Pressure (Optional)</label>
            <div className="flex items-center space-x-2">
              <input 
                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="Sys" 
                type="number" 
                value={formData.bp_sys} 
                onChange={e => setFormData({...formData, bp_sys: e.target.value})} 
              />
              <span>/</span>
              <input 
                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="Dia" 
                type="number" 
                value={formData.bp_dia} 
                onChange={e => setFormData({...formData, bp_dia: e.target.value})} 
              />
            </div>
          </div>
        </div>
        <div className="pt-2">
           <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
           <textarea 
             className="w-full rounded-md border p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
             rows={2}
             value={formData.notes}
             onChange={e => setFormData({...formData, notes: e.target.value})}
           ></textarea>
        </div>
         <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          {offlineMsg && <div className="flex-1 text-amber-600 text-sm font-medium flex items-center">{offlineMsg}</div>}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>Save Reading</Button>
        </div>
      </form>
    </Modal>
  );
}
