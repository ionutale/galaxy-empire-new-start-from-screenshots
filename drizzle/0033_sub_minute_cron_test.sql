-- Migration: Sub-minute Cron Test
-- Creates a test table and schedules a job to run every second using pg_cron interval syntax

-- Create the test table if it doesn't exist
CREATE TABLE IF NOT EXISTS "cron-test-table" (
    "id" SERIAL PRIMARY KEY,
    "name" text NOT NULL,
    "value" bigint DEFAULT 0
);

-- Ensure the test record exists
INSERT INTO "cron-test-table" ("name", "value")
SELECT 'gogo', 0
WHERE NOT EXISTS (
    SELECT 1 FROM "cron-test-table" WHERE "name" = 'gogo'
);

-- Schedule the job safely
DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Unschedule existing job to avoid duplicates or updates
        PERFORM cron.unschedule('gogo_update');

        -- Schedule using pg_cron 1.6+ interval syntax ('1 seconds')
        -- We use $cmd$ delimiter for the SQL command string to handle internal quotes cleanly
        PERFORM cron.schedule(
            'gogo_update', 
            '1 seconds', 
            $cmd$
                UPDATE public."cron-test-table" 
                SET value = value + 1 
                WHERE "name" = 'gogo' 
            $cmd$
        );
        
        RAISE NOTICE 'Scheduled gogo_update with 1 second interval';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Skipping gogo_update schedule.';
    END IF;
END $$;
