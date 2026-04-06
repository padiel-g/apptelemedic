# TeleMedic Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn

## Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

### Database Setup (Supabase)
1. Go to https://supabase.com and create a free project
2. Go to SQL Editor in the Supabase dashboard
3. Paste and run the contents of database/supabase-schema.sql
4. Paste and run the contents of database/supabase-seed.sql
5. Go to Settings > API and copy:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY
6. Add these to your .env.local file

### Netlify Deployment
1. Push code to GitHub
2. Connect repo to Netlify
3. Set build command: npm run build
4. Set publish directory: .next
5. Add environment variables in Netlify dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - JWT_SECRET
6. Deploy

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Default Accounts
(From seed script):
- **Admin**: `admin@telemedic.local` / `telemedic2024`
- **Doctor**: `doctor@telemedic.local` / `telemedic2024`
- **Patient**: `patient@telemedic.local` / `telemedic2024`

## ESP32 Device Registration
To connect an ESP32, you must first create it via the admin interface when added in the future. Check the `devices` table for `api_key` to use in `ESP32_EXAMPLE.ino`.
