-- Fix ambiguous column references in cancel_ship_construction
-- Use p_ prefix for parameters

DROP FUNCTION IF EXISTS cancel_ship_construction(int, int);

CREATE OR REPLACE FUNCTION cancel_ship_construction(
    p_user_id int,
    p_queue_id int
) RETURNS jsonb AS $$
DECLARE
    queue_item RECORD;
    ship_cost jsonb;
    refund jsonb;
BEGIN
    -- Get the queue item
    SELECT sq.* INTO queue_item
    FROM shipyard_queue sq
    WHERE sq.id = p_queue_id AND sq.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Construction not found');
    END IF;

    -- Get ship cost (simplified - hardcoded)
    CASE queue_item.ship_type
        WHEN 'small_cargo' THEN
            ship_cost := jsonb_build_object('metal', 2000, 'crystal', 2000, 'gas', 0);
        WHEN 'large_cargo' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 6000, 'gas', 0);
        WHEN 'light_fighter' THEN
            ship_cost := jsonb_build_object('metal', 3000, 'crystal', 1000, 'gas', 0);
        WHEN 'heavy_fighter' THEN
            ship_cost := jsonb_build_object('metal', 6000, 'crystal', 4000, 'gas', 0);
        WHEN 'cruiser' THEN
            ship_cost := jsonb_build_object('metal', 20000, 'crystal', 7000, 'gas', 2000);
        WHEN 'battleship' THEN
            ship_cost := jsonb_build_object('metal', 45000, 'crystal', 15000, 'gas', 0);
        WHEN 'colony_ship' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 20000, 'gas', 10000);
        WHEN 'recycler' THEN
            ship_cost := jsonb_build_object('metal', 10000, 'crystal', 6000, 'gas', 2000);
        WHEN 'espionage_probe' THEN
            ship_cost := jsonb_build_object('metal', 0, 'crystal', 1000, 'gas', 0);
        WHEN 'bomber' THEN
            ship_cost := jsonb_build_object('metal', 50000, 'crystal', 25000, 'gas', 15000);
        WHEN 'destroyer' THEN
            ship_cost := jsonb_build_object('metal', 60000, 'crystal', 50000, 'gas', 15000);
        WHEN 'deathstar' THEN
            ship_cost := jsonb_build_object('metal', 5000000, 'crystal', 4000000, 'gas', 1000000);
        WHEN 'battlecruiser' THEN
            ship_cost := jsonb_build_object('metal', 30000, 'crystal', 40000, 'gas', 15000);
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid ship type');
    END CASE;

    -- Calculate refund (50% of resources)
    refund := jsonb_build_object(
        'metal', ((ship_cost->>'metal')::int * queue_item.amount) / 2,
        'crystal', ((ship_cost->>'crystal')::int * queue_item.amount) / 2,
        'gas', ((ship_cost->>'gas')::int * queue_item.amount) / 2
    );

    -- Refund resources
    UPDATE planet_resources
    SET metal = metal + (refund->>'metal')::int,
        crystal = crystal + (refund->>'crystal')::int,
        gas = gas + (refund->>'gas')::int
    WHERE planet_id = queue_item.planet_id;

    -- Remove from queue
    DELETE FROM shipyard_queue WHERE id = p_queue_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
