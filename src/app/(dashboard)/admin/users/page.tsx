"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Trash2, Edit } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<{id: number; full_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<{open: boolean; user: any; patientDoctorId: string}>({open: false, user: null, patientDoctorId: ''});

  const fetchUsers = () => {
    fetch(`/api/admin/users?search=${search}`)
      .then(res => res.json())
      .then(d => { setUsers(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchDoctors = () => {
    fetch('/api/admin/users?role=doctor')
      .then(res => res.json())
      .then(d => setDoctors(d.data || []))
      .catch(console.error);
  };

  const openEditModal = (user: any) => {
    fetchDoctors();
    const currentDoctorId = user.patient?.assigned_doctor_id || '';
    setEditModal({ open: true, user, patientDoctorId: currentDoctorId.toString() });
  };

  const saveEdit = async () => {
    const body: any = {};
    if (editModal.patientDoctorId && editModal.patientDoctorId !== '') {
      body.assigned_doctor_id = parseInt(editModal.patientDoctorId);
    }
    await fetch(`/api/admin/users/${editModal.user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setEditModal({ open: false, user: null, patientDoctorId: '' });
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const toggleActive = async (id: number, current: number) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: current === 1 ? 0 : 1 })
    });
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users Management</h2>
          <p className="text-slate-500">Manage platform access and roles.</p>
        </div>
        <Button className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="w-full max-w-sm">
              <Input 
                placeholder="Search user..." 
                icon={<Search className="w-4 h-4" />} 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>
                      {u.is_active === 1 ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="secondary" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                         {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                       </Button>
                       {u.role === 'patient' && (
                         <Button variant="ghost" size="sm" onClick={() => openEditModal(u)}>
                           Assign Doctor
                         </Button>
                       )}
                       <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={editModal.open} onClose={() => setEditModal({open: false, user: null, patientDoctorId: ''})} title={`Edit ${editModal.user?.full_name}`}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="doctor-select">Assigned Doctor</Label>
              <Select
              id="doctor-select"
              value={editModal.patientDoctorId}
              onChange={(val) => setEditModal({...editModal, patientDoctorId: val})}
              options={[
                ...doctors.map(d => ({value: d.id.toString(), label: d.full_name})),
                {value: '', label: 'Unassigned'}
              ]}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditModal({open: false, user: null, patientDoctorId: ''})}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
