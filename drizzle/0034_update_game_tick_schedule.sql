-- Migration: Update Game Tick Schedule
-- Updates the game-tick job to run every second using pg_cron interval syntax
-- This replaces the previous minute-based schedule

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Unschedule existing job to avoid duplicates
        -- We use unschedule with the job name to remove the old entry
        PERFORM cron.unschedule('game-tick');

        -- Schedule using pg_cron 1.6+ interval syntax ('1 seconds')
        PERFORM cron.schedule(
            'game-tick',           -- job name
            '1 seconds',           -- every second
            'CALL game_tick();'    -- command to execute
        );
        
        RAISE NOTICE 'Updated game-tick schedule to run every 1 second';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Skipping game-tick schedule update.';
    END IF;
END $$;
