-- Migration: Enable pg_cron extension
-- This migration attempts to enable the pg_cron extension if available

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        RAISE NOTICE 'pg_cron extension enabled successfully';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Scheduled tasks will need to be run manually or via external scheduler';
    END IF;
END;
$$ LANGUAGE plpgsql;