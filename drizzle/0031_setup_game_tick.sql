-- Migration: Setup Game Tick with pg_cron
-- This migration creates the necessary procedures to run the game loop via pg_cron

-- Wrapper to process research for all users (since original procedure takes user_id)
CREATE OR REPLACE PROCEDURE process_all_completed_research() AS $$
DECLARE
    u_id int;
BEGIN
    FOR u_id IN 
        SELECT DISTINCT user_id FROM research_queue WHERE completion_at <= now()
    LOOP
        CALL process_completed_research(u_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Main Game Tick Procedure
-- Calls all available SQL-based processing procedures
CREATE OR REPLACE PROCEDURE game_tick() AS $$
BEGIN
    -- Process Buildings
    CALL process_completed_buildings();
    
    -- Process Ship Construction
    CALL process_completed_ship_construction();
    
    -- Process Research
    CALL process_all_completed_research();
    
    -- Note: Fleet movements and other logic currently handled in Node.js
    -- would need to be ported to PL/pgSQL to be included here.
END;
$$ LANGUAGE plpgsql;

-- 1-Second Loop Function for pg_cron
-- This runs the game tick repeatedly for ~60 seconds
CREATE OR REPLACE FUNCTION run_game_tick_every_second() RETURNS void AS $$
BEGIN
    -- Run 59 times with 1s sleep
    FOR i IN 1..59 LOOP
        CALL game_tick();
        PERFORM pg_sleep(1);
    END LOOP;
    
    -- Run one last time
    CALL game_tick();
END;
$$ LANGUAGE plpgsql;

-- Schedule the job to run every minute
-- The job itself loops for 60s, achieving ~1s interval
SELECT cron.schedule('game-tick-loop', '* * * * *', 'SELECT run_game_tick_every_second()');
