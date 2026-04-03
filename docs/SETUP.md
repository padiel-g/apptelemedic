# TeleMedic Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn

## Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Make sure to copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *Note: Set your own `JWT_SECRET` for security.*

3. **Initialize Database**
   Since the app uses SQLite, the database doesn't require a dedicated server. Simply run the init script to create tables and insert seed data:
   ```bash
   npm run db:init
   ```

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
To connect an ESP32, you must first create it in the database and get the API key. In this MVP, device creation is done via the SQLite database directly, or via an admin interface when added in the future. Check the `devices` table for `api_key` to use in `ESP32_EXAMPLE.ino`.
