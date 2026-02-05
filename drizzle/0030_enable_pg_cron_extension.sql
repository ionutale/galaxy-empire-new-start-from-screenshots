-- Migration: Enable pg_cron extension
-- This migration enables the pg_cron extension for scheduled database tasks

CREATE EXTENSION IF NOT EXISTS pg_cron;