-- Migration: Fix process_completed_ship_construction procedure
-- This migration fixes the column name resolution for ship types with underscores

-- Procedure to process completed ship constructions
CREATE OR REPLACE PROCEDURE process_completed_ship_construction() AS $$
DECLARE
    completed_ship RECORD;
    ship_column_name text;
BEGIN
    -- Get all completed ship constructions
    FOR completed_ship IN
        SELECT sq.id, sq.planet_id, sq.ship_type, sq.amount
        FROM shipyard_queue sq
        WHERE sq.completion_at <= now()
    LOOP
        -- Ensure planet_ships row exists
        INSERT INTO planet_ships (planet_id)
        VALUES (completed_ship.planet_id)
        ON CONFLICT (planet_id) DO NOTHING;

        -- Use ship_type directly as column name
        ship_column_name := completed_ship.ship_type;

        -- Use dynamic SQL to update the correct column
        EXECUTE format(
            'UPDATE planet_ships SET %I = COALESCE(%I, 0) + $1 WHERE planet_id = $2',
            ship_column_name, ship_column_name
        ) USING completed_ship.amount, completed_ship.planet_id;

        -- Remove from queue
        DELETE FROM shipyard_queue WHERE id = completed_ship.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
