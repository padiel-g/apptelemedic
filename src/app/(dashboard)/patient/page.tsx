"use client";

import { useVitals } from '@/hooks/useVitals';
import { VitalsGrid } from '@/components/dashboard/VitalsGrid';
import { ReadingsChart } from '@/components/dashboard/ReadingsChart';
import { AbnormalAlert } from '@/components/dashboard/AbnormalAlert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ManualEntryModal } from '@/components/dashboard/ManualEntryModal';
import { ChatBox } from '@/components/dashboard/ChatBox';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function PatientDashboard() {
  const { data, isLoading, refetch } = useVitals();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { user } = useAuth();

  const latestReading = data?.latestReading || null;
  const readings = data?.readings || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Your Health Overview</h2>
        <p className="text-slate-500">Live monitoring of your vital signs.</p>
      </div>

      <AbnormalAlert reading={latestReading} />

      <VitalsGrid reading={latestReading} />

      {/* Assigned Doctor Card */}
      <Card className="bg-white border-blue-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center space-x-4">
             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shadow-sm border border-blue-200">
               👨‍⚕️
             </div>
             <div>
               <h3 className="text-xl font-semibold text-slate-800">
                 {(user as any)?.patient?.doctor_name ? `Your Doctor: Dr. ${(user as any).patient.doctor_name}` : "No doctor assigned yet"}
               </h3>
               <p className="text-sm font-medium text-slate-500 mt-1">
                 {(user as any)?.patient?.doctor_spec ? (user as any).patient.doctor_spec : "A specialist will be assigned soon based on your condition."}
               </p>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Vitals (Last 6 Hours)</CardTitle>
            <Link href="/patient/history">
              <Button variant="ghost" size="sm">View History</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <ReadingsChart data={readings.slice(0, 50)} height={300} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Quick Stats</CardTitle>
            <Button size="sm" onClick={() => setIsManualModalOpen(true)}>Add Vitals</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Last Updated</p>
              <p className="mt-1 text-lg font-semibold">
                {latestReading ? new Date(latestReading.recorded_at).toLocaleTimeString() : 'Never'}
                {latestReading && <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded capitalize">{latestReading.source}</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Device Status</p>
              <div className="flex items-center mt-1">
                {latestReading && latestReading.source === 'device' ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></div>
                    <span className="text-lg font-semibold text-emerald-700">Online Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 mr-2"></div>
                    <span className="text-lg font-semibold text-slate-600">Idle / Manual</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Readings</p>
              <p className="mt-1 text-lg font-semibold">{readings.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ChatBox patientId={latestReading?.patient_id || data?.readings?.[0]?.patient_id} />
      </div>

      <ManualEntryModal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        onSuccess={refetch}
      />
    </div>
  );
}
