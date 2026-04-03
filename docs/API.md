# TeleMedic API Documentation

## Base URL
`/api`

## Authentication

All endpoints except `/auth/login` and `/auth/register` require a valid JWT token sent in a secure HttpOnly cookie named `token`.

### `POST /auth/login`
- **Body**: `{ "email": "admin@telemedic.local", "password": "password123" }`
- **Response**: `{ "user": { "id": 1, "role": "admin", ... } }` plus token cookie.

### `POST /auth/register`
- **Body**: `{ "email": "...", "password": "...", "full_name": "...", "role": "patient" }`
- **Response**: User object.

## Health Data Intake

### `POST /health-data`
Use this endpoint from the ESP32 to push real-time vitals.

**Headers:**
- `x-api-key`: The raw API key for the device (will be hashed and verified).

**Body:**
```json
{
  "device_id": "ESP32-001",
  "pulse": 75,
  "temperature": 36.5,
  "oxygen": 98
}
```

**Response:**
`201 Created` with reading inserted.
