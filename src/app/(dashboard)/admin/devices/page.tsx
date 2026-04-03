"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Trash2, Edit, Cpu } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';

interface DeviceRow {
  id: number;
  device_id: string;
  label: string | null;
  is_active: number;
  last_seen_at: string | null;
  created_at: string;
  patient_id: number | null;
  patient_name: string | null;
  patient_email: string | null;
}

interface PatientOption {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}

function formatDate(dt: string | null) {
  if (!dt) return 'Never';
  return new Date(dt).toLocaleString();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Register modal
  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState({ device_id: '', patient_id: '', label: '' });
  const [saving, setSaving] = useState(false);

  // API key reveal modal
  const [apiKeyModal, setApiKeyModal] = useState<{ open: boolean; key: string; deviceId: string }>({
    open: false, key: '', deviceId: ''
  });
  const [copied, setCopied] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<{ open: boolean; device: DeviceRow | null; patient_id: string; label: string }>({
    open: false, device: null, patient_id: '', label: ''
  });

  const fetchDevices = useCallback(() => {
    fetch('/api/admin/devices')
      .then(r => r.json())
      .then(d => { setDevices(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fetchPatients = useCallback(() => {
    fetch('/api/admin/users?role=patient')
      .then(r => r.json())
      .then(d => setPatients(d.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchPatients();
  }, [fetchDevices, fetchPatients]);

  const handleRegister = async () => {
    if (!form.device_id.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: form.device_id.trim(),
        patient_id: form.patient_id ? parseInt(form.patient_id) : null,
        label: form.label.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setRegisterOpen(false);
      setForm({ device_id: '', patient_id: '', label: '' });
      fetchDevices();
      setApiKeyModal({ open: true, key: data.api_key, deviceId: data.device_id });
      setCopied(false);
    } else {
      alert(data.error || 'Failed to register device');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKeyModal.key);
    setCopied(true);
  };

  const openEdit = (device: DeviceRow) => {
    setEditModal({
      open: true,
      device,
      patient_id: device.patient_id?.toString() || '',
      label: device.label || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.device) return;
    await fetch(`/api/admin/devices/${editModal.device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: editModal.patient_id ? parseInt(editModal.patient_id) : null,
        label: editModal.label.trim() || null,
      }),
    });
    setEditModal({ open: false, device: null, patient_id: '', label: '' });
    fetchDevices();
  };

  const toggleActive = async (device: DeviceRow) => {
    await fetch(`/api/admin/devices/${device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: device.is_active === 1 ? 0 : 1 }),
    });
    fetchDevices();
  };

  const handleDelete = async (device: DeviceRow) => {
    if (!confirm(`Delete device "${device.device_id}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/devices/${device.id}`, { method: 'DELETE' });
    fetchDevices();
  };

  const patientOptions = [
    { value: '', label: 'Unassigned' },
    ...patients.map(p => ({ value: p.id.toString(), label: `${p.full_name} (${p.email})` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devices</h2>
          <p className="text-slate-500">Register and manage ESP32 monitoring devices.</p>
        </div>
        <Button className="flex items-center" onClick={() => { setRegisterOpen(true); fetchPatients(); }}>
          <Plus className="w-4 h-4 mr-2" /> Register New Device
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Assigned Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                      No devices registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-4 h-4 text-slate-400" />
                          <span>{d.device_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{d.label || <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell>
                        {d.patient_name ? (
                          <div>
                            <div className="text-sm font-medium">{d.patient_name}</div>
                            <div className="text-xs text-slate-500">{d.patient_email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.is_active === 1
                          ? <Badge variant="success">Active</Badge>
                          : <Badge variant="neutral">Inactive</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {isOnline(d.last_seen_at)
                          ? <Badge variant="success">Online</Badge>
                          : <Badge variant="danger">Offline</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{formatDate(d.last_seen_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => toggleActive(d)}>
                          {d.is_active === 1 ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(d)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register Device Modal */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register New Device">
        <div className="space-y-4">
          <div>
            <Label htmlFor="device-id">Device ID</Label>
            <Input
              id="device-id"
              placeholder="e.g. esp32-nano-001"
              value={form.device_id}
              onChange={e => setForm({ ...form, device_id: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="device-label">Label</Label>
            <Input
              id="device-label"
              placeholder="e.g. Ward 3 Bed 12"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="device-patient">Assign to Patient</Label>
            <Select
              id="device-patient"
              value={form.patient_id}
              onChange={val => setForm({ ...form, patient_id: val })}
              options={patientOptions}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={saving || !form.device_id.trim()}>
              {saving ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* API Key Reveal Modal */}
      <Modal isOpen={apiKeyModal.open} onClose={() => setApiKeyModal({ ...apiKeyModal, open: false })} title="Device Registered">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            <strong>Copy this API key now.</strong> It will not be shown again. Store it securely and enter it in the ESP32 captive portal setup page.
          </div>
          <div>
            <Label>Device ID</Label>
            <div className="font-mono text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 mt-1">
              {apiKeyModal.deviceId}
            </div>
          </div>
          <div>
            <Label>API Key</Label>
            <div className="flex space-x-2 mt-1">
              <div className="flex-1 font-mono text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 break-all select-all">
                {apiKeyModal.key}
              </div>
              <Button variant="secondary" onClick={handleCopyKey}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setApiKeyModal({ ...apiKeyModal, open: false })}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, device: null, patient_id: '', label: '' })}
        title={`Edit ${editModal.device?.device_id}`}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-label">Label</Label>
            <Input
              id="edit-label"
              placeholder="e.g. Ward 3 Bed 12"
              value={editModal.label}
              onChange={e => setEditModal({ ...editModal, label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-patient">Assign to Patient</Label>
            <Select
              id="edit-patient"
              value={editModal.patient_id}
              onChange={val => setEditModal({ ...editModal, patient_id: val })}
              options={patientOptions}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={() => setEditModal({ open: false, device: null, patient_id: '', label: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
