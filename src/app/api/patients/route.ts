import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Reading } from '@/types';
import { CONDITION_TO_SPECIALIZATION } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role === 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'mine';
    const search = searchParams.get('search') || '';
    const condition = searchParams.get('condition') || '';
    const status = searchParams.get('status') || '';

    let query = `
      SELECT p.*,
             u.full_name as user_full_name,
             u.email as user_email,
             d.full_name as doctor_name,
             d.specialization as doctor_specialization,
             r.id as reading_id,
             r.pulse, r.temperature, r.oxygen, r.bp_sys, r.bp_dia, r.source, r.recorded_at as last_reading_at, r.is_abnormal,
             dev.last_seen_at as device_last_seen_at
      FROM patients p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN users d ON p.assigned_doctor_id = d.id
      LEFT JOIN readings r ON r.id = (
        SELECT r2.id FROM readings r2 WHERE r2.patient_id = p.id ORDER BY r2.recorded_at DESC LIMIT 1
      )
      LEFT JOIN devices dev ON dev.patient_id = p.id AND dev.is_active = 1
      WHERE u.is_active = 1
    `;
    const params: any[] = [];

    // Mode handling for Doctors
    if (user.role === 'doctor') {
       if (view === 'mine') {
         query += ` AND p.assigned_doctor_id = ?`;
         params.push(user.id);
       }
    }
    
    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (condition && condition !== 'All Conditions' && condition !== 'all') {
      query += ` AND p.conditions LIKE ?`;
      params.push(`%${condition}%`);
    }

    if (status && status !== 'all') {
      if (status === 'unassigned') {
        query += ` AND p.assigned_doctor_id IS NULL`;
      } else if (status === 'mine' && user.role === 'doctor') {
        query += ` AND p.assigned_doctor_id = ?`;
        params.push(user.id);
      } else if (status === 'other' && user.role === 'doctor') {
        query += ` AND p.assigned_doctor_id IS NOT NULL AND p.assigned_doctor_id != ?`;
        params.push(user.id);
      }
    }

    const patientsRaw = db.prepare(query).all(...params) as any[];

    const patientsWithData = patientsRaw.map(p => {
      const latestReading = p.reading_id ? {
        id: p.reading_id,
        patient_id: p.id,
        pulse: p.pulse,
        temperature: p.temperature,
        oxygen: p.oxygen,
        bp_sys: p.bp_sys,
        bp_dia: p.bp_dia,
        source: p.source,
        recorded_at: p.last_reading_at,
        is_abnormal: p.is_abnormal
      } : null;
      return {
        id: p.id,
        user_id: p.user_id,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        blood_type: p.blood_type,
        emergency_contact: p.emergency_contact,
        assigned_doctor_id: p.assigned_doctor_id,
        conditions: p.conditions,
        created_at: p.created_at,
        user: {
          id: p.user_id,
          full_name: p.user_full_name,
          email: p.user_email
        },
        doctor: p.doctor_name ? {
          full_name: p.doctor_name,
          specialization: p.doctor_specialization
        } : null,
        latestReading,
        deviceLastSeenAt: p.device_last_seen_at || null,
      };
    });

    // Calculate overall stats regardless of current view/filter
    let myPatientsCount = 0;
    let unassignedCount = 0;
    let actionRequiredCount = 0;
    let activeDevicesCount = 0;
    
    if (user.role === 'doctor') {
      const allRaw = db.prepare(`SELECT assigned_doctor_id, r.is_abnormal, dev.id as dev_id 
        FROM patients p 
        LEFT JOIN (SELECT patient_id, is_abnormal FROM readings r1 WHERE id = (SELECT MAX(id) FROM readings r2 WHERE r2.patient_id = r1.patient_id)) r ON r.patient_id = p.id
        LEFT JOIN devices dev ON dev.patient_id = p.id AND dev.is_active = 1
      `).all() as any[];
      
      allRaw.forEach(p => {
        if (p.assigned_doctor_id === user.id) {
          myPatientsCount++;
          if (p.is_abnormal) actionRequiredCount++;
          if (p.dev_id) activeDevicesCount++;
        }
        if (p.assigned_doctor_id === null) {
          unassignedCount++;
        }
      });
    }

    return NextResponse.json({ 
      data: patientsWithData,
      stats: {
        myPatients: myPatientsCount,
        unassigned: unassignedCount,
        actionRequired: actionRequiredCount,
        activeDevices: activeDevicesCount
      }
    });
  } catch (error) {
    console.error('Patients GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
