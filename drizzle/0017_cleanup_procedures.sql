-- Migration: Add automated cleanup procedures
-- This migration creates stored procedures for cleaning up old data

-- Procedure to clean up expired fleets
CREATE OR REPLACE PROCEDURE cleanup_expired_fleets() AS $$
DECLARE
    expired_fleet record;
BEGIN
    -- Find fleets that should have returned but haven't been processed
    -- This handles cases where the game tick didn't process returning fleets
    FOR expired_fleet IN
        SELECT f.*
        FROM fleets f
        WHERE f.status = 'active'
          AND f.arrival_time < now() - interval '1 hour'  -- Fleets stuck for more than 1 hour
    LOOP
        -- Return the fleet
        PERFORM return_fleet(expired_fleet.id);
    END LOOP;

    -- Clean up very old fleets (more than 7 days old)
    DELETE FROM fleets
    WHERE status IN ('returning', 'active')
      AND arrival_time < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old messages
CREATE OR REPLACE PROCEDURE cleanup_old_messages() AS $$
BEGIN
    -- Delete messages older than 30 days
    DELETE FROM messages
    WHERE created_at < now() - interval '30 days';

    -- Keep only the last 100 messages per user to prevent spam
    DELETE FROM messages
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id,
                   row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM messages
        ) ranked
        WHERE rn <= 100
    );
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old combat and espionage reports
CREATE OR REPLACE PROCEDURE cleanup_old_reports() AS $$
BEGIN
    -- Delete combat reports older than 90 days
    DELETE FROM combat_reports
    WHERE created_at < now() - interval '90 days';

    -- Delete espionage reports older than 90 days
    DELETE FROM espionage_reports
    WHERE created_at < now() - interval '90 days';

    -- Keep only the last 50 reports per user for combat reports
    DELETE FROM combat_reports
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id,
                   row_number() OVER (PARTITION BY attacker_id ORDER BY created_at DESC) as rn
            FROM combat_reports
        ) ranked
        WHERE rn <= 50
    );

    -- Keep only the last 50 reports per user for espionage reports
    DELETE FROM espionage_reports
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id,
                   row_number() OVER (PARTITION BY attacker_id ORDER BY created_at DESC) as rn
            FROM espionage_reports
        ) ranked
        WHERE rn <= 50
    );
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up expired sessions
CREATE OR REPLACE PROCEDURE cleanup_expired_sessions() AS $$
BEGIN
    -- Delete sessions older than 30 days
    DELETE FROM sessions
    WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old fleet templates (keep only recent ones)
CREATE OR REPLACE PROCEDURE cleanup_old_fleet_templates() AS $$
BEGIN
    -- Keep only the last 10 templates per user
    DELETE FROM fleet_templates
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id,
                   row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM fleet_templates
        ) ranked
        WHERE rn <= 10
    );
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old building/research queues that are stuck
CREATE OR REPLACE PROCEDURE cleanup_stuck_queues() AS $$
BEGIN
    -- Clean up building queues that are past completion time by more than 1 hour
    -- (in case the game tick didn't process them)
    DELETE FROM building_queue
    WHERE completion_at < now() - interval '1 hour';

    -- Clean up research queues that are past completion time by more than 1 hour
    DELETE FROM research_queue
    WHERE completion_at < now() - interval '1 hour';

    -- Clean up shipyard queues that are past completion time by more than 1 hour
    DELETE FROM shipyard_queue
    WHERE completion_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Main cleanup procedure that runs all cleanup tasks
CREATE OR REPLACE PROCEDURE perform_database_cleanup() AS $$
BEGIN
    -- Run all cleanup procedures
    CALL cleanup_expired_fleets();
    CALL cleanup_old_messages();
    CALL cleanup_old_reports();
    CALL cleanup_expired_sessions();
    CALL cleanup_old_fleet_templates();
    CALL cleanup_stuck_queues();

    -- Log cleanup completion
    RAISE NOTICE 'Database cleanup completed at %', now();
END;
$$ LANGUAGE plpgsql;

-- Function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_cleanup_stats() RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'expired_fleets', (
            SELECT count(*) FROM fleets
            WHERE status = 'active' AND arrival_time < now() - interval '1 hour'
        ),
        'old_messages', (
            SELECT count(*) FROM messages
            WHERE created_at < now() - interval '30 days'
        ),
        'old_combat_reports', (
            SELECT count(*) FROM combat_reports
            WHERE created_at < now() - interval '90 days'
        ),
        'old_espionage_reports', (
            SELECT count(*) FROM espionage_reports
            WHERE created_at < now() - interval '90 days'
        ),
        'expired_sessions', (
            SELECT count(*) FROM sessions
            WHERE expires_at < now()
        ),
        'stuck_building_queues', (
            SELECT count(*) FROM building_queue
            WHERE completion_at < now() - interval '1 hour'
        ),
        'stuck_research_queues', (
            SELECT count(*) FROM research_queue
            WHERE completion_at < now() - interval '1 hour'
        ),
        'stuck_shipyard_queues', (
            SELECT count(*) FROM shipyard_queue
            WHERE completion_at < now() - interval '1 hour'
        )
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql;