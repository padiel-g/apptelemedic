import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PATIENT_CONDITIONS } from '@/lib/constants';

interface PatientFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
}

export function PatientFilterBar({ search, setSearch, condition, setCondition, status, setStatus }: PatientFilterBarProps) {
  const handleClear = () => {
    setSearch('');
    setCondition('all');
    setStatus('all');
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
      <div className="w-full md:flex-1">
        <Input 
          placeholder="Search by name or email..." 
          icon={<Search className="w-4 h-4" />} 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="w-full md:w-[220px]">
        <select 
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          value={condition}
          onChange={e => setCondition(e.target.value)}
        >
          <option value="all">All Conditions</option>
          {PATIENT_CONDITIONS.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.conditions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="w-full md:w-[220px]">
        <select 
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="all">Any Assignment Status</option>
          <option value="unassigned">Unassigned Only</option>
          <option value="mine">Assigned to Me</option>
          <option value="other">Assigned to Other Doctor</option>
        </select>
      </div>
      <Button variant="secondary" className="w-full md:w-auto" onClick={handleClear}>Clear</Button>
    </div>
  );
}
