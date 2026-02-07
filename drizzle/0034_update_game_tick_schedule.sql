-- Migration: Update Game Tick Schedule
-- Updates the game-tick job to run every second using pg_cron interval syntax
-- This replaces the previous minute-based schedule

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Unschedule existing jobs (ignore errors if they don't exist)
        BEGIN
            PERFORM cron.unschedule('game-tick');
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            PERFORM cron.unschedule('game-tick-loop');
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

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
