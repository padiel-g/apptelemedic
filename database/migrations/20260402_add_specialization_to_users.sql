-- Migration: Add specialization column to users table for doctor specialization feature
ALTER TABLE users ADD COLUMN specialization TEXT;