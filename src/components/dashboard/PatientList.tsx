import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { PatientRow, PatientWithData } from './PatientRow';

interface PatientListProps {
  patients: PatientWithData[];
}

export function PatientList({ patients }: PatientListProps) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Pulse (bpm)</TableHead>
            <TableHead>Temp (°C)</TableHead>
            <TableHead>SpO2 (%)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Last Update</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                No patients found.
              </TableCell>
            </TableRow>
          ) : (
            patients.map(patient => (
              <PatientRow key={patient.id} patient={patient} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
