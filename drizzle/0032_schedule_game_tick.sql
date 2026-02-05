-- Migration: Schedule Game Tick
-- This migration attempts to schedule the game_tick procedure using pg_cron if available
-- If pg_cron is not available, the game tick will need to be run manually or via external scheduler

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Schedule the game tick to run every minute
        PERFORM cron.schedule(
            'game-tick',           -- job name
            '* * * * *',          -- every minute
            'CALL game_tick();'   -- command to execute
        );
        RAISE NOTICE 'Game tick scheduled with pg_cron to run every minute';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Game tick will need to be run manually or via external scheduler';
    END IF;
END;
$$ LANGUAGE plpgsql;