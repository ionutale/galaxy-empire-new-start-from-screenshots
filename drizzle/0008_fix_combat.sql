-- Migration: Fix combat simulation function
-- Correct the syntax errors in the simulate_combat function

CREATE OR REPLACE FUNCTION simulate_combat(
    attacker_ships jsonb,
    defender_ships jsonb,
    defender_defenses jsonb
) RETURNS jsonb AS $$
DECLARE
    -- Ship stats (hardcoded from game-config.ts)
    ships_stats jsonb := '{
        "light_fighter": {"attack": 50, "defense": 10, "capacity": 50},
        "heavy_fighter": {"attack": 150, "defense": 25, "capacity": 100},
        "cruiser": {"attack": 400, "defense": 50, "capacity": 800},
        "battleship": {"attack": 1000, "defense": 200, "capacity": 1500},
        "small_cargo": {"attack": 5, "defense": 10, "capacity": 5000},
        "colony_ship": {"attack": 50, "defense": 100, "capacity": 7500},
        "large_cargo": {"attack": 5, "defense": 50, "capacity": 25000},
        "recycler": {"attack": 1, "defense": 10, "capacity": 20000},
        "espionage_probe": {"attack": 0, "defense": 0, "capacity": 5},
        "bomber": {"attack": 1000, "defense": 500, "capacity": 500},
        "destroyer": {"attack": 2000, "defense": 2000, "capacity": 2000},
        "death_star": {"attack": 200000, "defense": 100000, "capacity": 1000000},
        "battle_cruiser": {"attack": 700, "defense": 200, "capacity": 750}
    }'::jsonb;

    defenses_stats jsonb := '{
        "rocket_launcher": {"attack": 80, "defense": 20, "shield": 20},
        "light_laser": {"attack": 100, "defense": 25, "shield": 25},
        "heavy_laser": {"attack": 250, "defense": 100, "shield": 100},
        "gauss_cannon": {"attack": 1100, "defense": 200, "shield": 200},
        "ion_cannon": {"attack": 150, "defense": 500, "shield": 500},
        "plasma_turret": {"attack": 3000, "defense": 300, "shield": 300},
        "small_shield_dome": {"attack": 0, "defense": 2000, "shield": 2000},
        "large_shield_dome": {"attack": 0, "defense": 10000, "shield": 10000}
    }'::jsonb;

    attacker_power int := 0;
    defender_power int := 0;
    attacker_health int := 0;
    defender_health int := 0;
    winner text;
    attacker_loss_pct float := 0;
    defender_loss_pct float := 0;
    attacker_losses jsonb := '{}';
    defender_losses jsonb := '{}';
    ship_type text;
    count int;
    stats jsonb;
BEGIN
    -- Calculate attacker power and health
    FOR ship_type IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type)::int;
        IF count > 0 THEN
            stats := ships_stats->ship_type;
            IF stats IS NOT NULL THEN
                attacker_power := attacker_power + (stats->>'attack')::int * count;
                attacker_health := attacker_health + (stats->>'defense')::int * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (ships)
    FOR ship_type IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type)::int;
        IF count > 0 THEN
            stats := ships_stats->ship_type;
            IF stats IS NOT NULL THEN
                defender_power := defender_power + (stats->>'attack')::int * count;
                defender_health := defender_health + (stats->>'defense')::int * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (defenses)
    FOR ship_type IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type)::int;
        IF count > 0 THEN
            stats := defenses_stats->ship_type;
            IF stats IS NOT NULL THEN
                defender_power := defender_power + (stats->>'attack')::int * count + ((stats->>'shield')::int * count) / 10;
                defender_health := defender_health + (stats->>'defense')::int * count;
            END IF;
        END IF;
    END LOOP;

    -- Determine winner and loss percentages
    IF attacker_power > defender_health AND defender_power < attacker_health THEN
        winner := 'attacker';
    ELSIF defender_power > attacker_health AND attacker_power < defender_health THEN
        winner := 'defender';
        defender_loss_pct := LEAST(0.5, defender_power::float / GREATEST(defender_health, 1));
        attacker_loss_pct := defender_loss_pct;
    ELSE
        winner := 'draw';
        attacker_loss_pct := 0.8;
        defender_loss_pct := 0.8;
    END IF;

    -- Calculate losses
    FOR ship_type IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type)::int;
        IF count > 0 THEN
            attacker_losses := jsonb_set(attacker_losses, ARRAY[ship_type], to_jsonb(floor(count * attacker_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type)::int;
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type)::int;
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'winner', winner,
        'attackerLosses', attacker_losses,
        'defenderLosses', defender_losses,
        'rounds', 1
    );
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint