-- Migration: Add performance indexes and monitoring
-- This migration adds database indexes for better query performance
-- and creates monitoring tables for game tick analytics

-- Performance indexes for fleet processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fleets_arrival_time_status ON fleets (arrival_time, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fleets_user_mission ON fleets (user_id, mission);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_created ON messages (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planets_coordinates ON planets (galaxy_id, system_id, planet_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planet_resources_planet_id ON planet_resources (planet_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planet_ships_planet_id ON planet_ships (planet_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planet_defenses_planet_id ON planet_defenses (planet_id);--> statement-breakpoint

-- Game tick monitoring table
CREATE TABLE IF NOT EXISTS game_tick_metrics (
    id serial PRIMARY KEY,
    tick_time timestamp DEFAULT now(),
    fleets_processed int DEFAULT 0,
    auto_explore_fleets int DEFAULT 0,
    execution_time_ms int,
    errors_count int DEFAULT 0,
    error_messages text[]
);--> statement-breakpoint

-- Fleet audit log for debugging
CREATE TABLE IF NOT EXISTS fleet_audit_log (
    id serial PRIMARY KEY,
    fleet_id int REFERENCES fleets(id) ON DELETE CASCADE,
    action varchar(50) NOT NULL,
    old_state jsonb,
    new_state jsonb,
    changed_at timestamp DEFAULT now(),
    changed_by varchar(100) DEFAULT 'system'
);--> statement-breakpoint

-- Add error handling and logging to process_fleets
CREATE OR REPLACE PROCEDURE process_fleets() AS $$
DECLARE
    fleet_record record;
    users_to_update int[] := ARRAY[]::int[];
    target_user_id int;
    start_time timestamp;
    end_time timestamp;
    error_count int := 0;
    error_messages text[] := ARRAY[]::text[];
    fleets_processed int := 0;
BEGIN
    start_time := clock_timestamp();

    -- Process returning fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'returning' AND arrival_time <= now() LOOP
        BEGIN
            CALL process_returning_fleet(fleet_record.id);
            users_to_update := array_append(users_to_update, fleet_record.user_id);
            fleets_processed := fleets_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_messages := array_append(error_messages, format('Error processing returning fleet %s: %s', fleet_record.id, SQLERRM));
            RAISE WARNING 'Error processing returning fleet %: %', fleet_record.id, SQLERRM;
        END;
    END LOOP;

    -- Process arriving fleets
    FOR fleet_record IN SELECT * FROM fleets WHERE status = 'active' AND arrival_time <= now() LOOP
        BEGIN
            -- Get target user before processing
            SELECT user_id INTO target_user_id
            FROM planets
            WHERE galaxy_id = fleet_record.target_galaxy
              AND system_id = fleet_record.target_system
              AND planet_number = fleet_record.target_planet;

            CALL process_arriving_fleet(fleet_record.id);
            users_to_update := array_append(users_to_update, fleet_record.user_id);
            IF target_user_id IS NOT NULL AND target_user_id != fleet_record.user_id THEN
                users_to_update := array_append(users_to_update, target_user_id);
            END IF;
            fleets_processed := fleets_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_messages := array_append(error_messages, format('Error processing arriving fleet %s: %s', fleet_record.id, SQLERRM));
            RAISE WARNING 'Error processing arriving fleet %: %', fleet_record.id, SQLERRM;
        END;
    END LOOP;

    -- Update points for affected users
    FOR target_user_id IN SELECT DISTINCT unnest(users_to_update) LOOP
        BEGIN
            CALL update_user_points(target_user_id);
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_messages := array_append(error_messages, format('Error updating points for user %s: %s', target_user_id, SQLERRM));
            RAISE WARNING 'Error updating points for user %: %', target_user_id, SQLERRM;
        END;
    END LOOP;

    -- Log metrics
    end_time := clock_timestamp();
    INSERT INTO game_tick_metrics (fleets_processed, execution_time_ms, errors_count, error_messages)
    VALUES (fleets_processed, extract(epoch from (end_time - start_time)) * 1000, error_count, error_messages);

EXCEPTION WHEN OTHERS THEN
    -- Log critical errors
    INSERT INTO game_tick_metrics (execution_time_ms, errors_count, error_messages)
    VALUES (extract(epoch from (clock_timestamp() - start_time)) * 1000, 1, ARRAY[SQLERRM]);
    RAISE;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Add error handling to process_auto_explore
CREATE OR REPLACE PROCEDURE process_auto_explore() AS $$
DECLARE
    explorer record;
    dispatched_count int := 0;
    max_dispatch int := 5;
    target_galaxy int;
    target_system int;
    target_planet int := 16;
    ships jsonb;
    fleets_dispatched int := 0;
BEGIN
    FOR explorer IN
        SELECT aes.user_id, ft.ships, p.galaxy_id, p.system_id
        FROM auto_explore_settings aes
        INNER JOIN user_commanders uc ON aes.user_id = uc.user_id AND uc.commander_id = 'nebula_explorer' AND uc.expires_at > now()
        INNER JOIN fleet_templates ft ON aes.template_id = ft.id
        INNER JOIN planets p ON aes.origin_planet_id = p.id
        WHERE aes.enabled = true
    LOOP
        dispatched_count := 0;

        WHILE dispatched_count < max_dispatch LOOP
            target_galaxy := explorer.galaxy_id;
            target_system := explorer.system_id;

            BEGIN
                -- Insert fleet
                INSERT INTO fleets (user_id, origin_planet_id, target_galaxy, target_system, target_planet, mission, ships, resources, departure_time, arrival_time)
                VALUES (explorer.user_id, explorer.origin_planet_id, target_galaxy, target_system, target_planet, 'expedition', explorer.ships, '{}', now(), now() + interval '1 hour');

                RAISE NOTICE 'Auto-dispatched expedition for user %', explorer.user_id;
                dispatched_count := dispatched_count + 1;
                fleets_dispatched := fleets_dispatched + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Auto-explore failed for user %: %', explorer.user_id, SQLERRM;
                EXIT;
            END;
        END LOOP;
    END LOOP;

    -- Update metrics
    UPDATE game_tick_metrics
    SET auto_explore_fleets = fleets_dispatched
    WHERE tick_time = (SELECT MAX(tick_time) FROM game_tick_metrics);

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Auto-explore procedure failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Add fleet audit logging function
CREATE OR REPLACE FUNCTION log_fleet_change() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO fleet_audit_log (fleet_id, action, old_state, new_state)
        VALUES (NEW.id, 'update', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO fleet_audit_log (fleet_id, action, new_state)
        VALUES (NEW.id, 'insert', row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO fleet_audit_log (fleet_id, action, old_state)
        VALUES (OLD.id, 'delete', row_to_json(OLD)::jsonb);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Create trigger for fleet audit logging (optional - uncomment if needed)
-- CREATE TRIGGER fleet_audit_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON fleets
--     FOR EACH ROW EXECUTE FUNCTION log_fleet_change();--> statement-breakpoint

-- Add cleanup procedure for old data
CREATE OR REPLACE PROCEDURE cleanup_old_data() AS $$
DECLARE
    deleted_fleets int;
    deleted_messages int;
    deleted_audit int;
BEGIN
    -- Remove completed fleets older than 30 days
    DELETE FROM fleets WHERE status = 'completed' AND created_at < now() - interval '30 days';
    GET DIAGNOSTICS deleted_fleets = ROW_COUNT;

    -- Archive old messages (move to archive table if it exists)
    -- For now, just delete
    DELETE FROM messages WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;

    -- Clean up old audit logs (keep last 30 days)
    DELETE FROM fleet_audit_log WHERE changed_at < now() - interval '30 days';
    GET DIAGNOSTICS deleted_audit = ROW_COUNT;

    -- Clean up old metrics (keep last 7 days)
    DELETE FROM game_tick_metrics WHERE tick_time < now() - interval '7 days';

    RAISE NOTICE 'Cleanup completed: % fleets, % messages, % audit records deleted', deleted_fleets, deleted_messages, deleted_audit;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint