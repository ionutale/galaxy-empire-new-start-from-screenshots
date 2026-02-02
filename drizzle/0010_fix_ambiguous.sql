-- Fix ambiguous column reference in combat function
CREATE OR REPLACE FUNCTION simulate_combat(
    attacker_ships jsonb,
    defender_ships jsonb,
    defender_defenses jsonb
) RETURNS jsonb AS $$
DECLARE
    attacker_power int := 0;
    defender_power int := 0;
    attacker_health int := 0;
    defender_health int := 0;
    winner text;
    attacker_loss_pct float := 0.5;
    defender_loss_pct float := 1.0;
    draw_loss_pct float := 0.8;
    attacker_losses jsonb := '{}';
    defender_losses jsonb := '{}';
    ship_type_var text;
    count int;
    stats record;
    config jsonb;
BEGIN
    -- Get combat configuration
    SELECT config_value INTO config FROM game_config WHERE config_key = 'combat_rules';
    IF config IS NOT NULL THEN
        attacker_loss_pct := (config->>'attacker_loss_multiplier')::float;
        defender_loss_pct := (config->>'defender_loss_multiplier')::float;
        draw_loss_pct := (config->>'draw_loss_multiplier')::float;
    END IF;

    -- Calculate attacker power and health
    FOR ship_type_var IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type_var)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats gss WHERE gss.ship_type = ship_type_var AND gss.category = 'ship';
            IF FOUND THEN
                attacker_power := attacker_power + stats.attack * count;
                attacker_health := attacker_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (ships)
    FOR ship_type_var IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type_var)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats gss WHERE gss.ship_type = ship_type_var AND gss.category = 'ship';
            IF FOUND THEN
                defender_power := defender_power + stats.attack * count;
                defender_health := defender_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Calculate defender power and health (defenses)
    FOR ship_type_var IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type_var)::int;
        IF count > 0 THEN
            SELECT * INTO stats FROM game_ship_stats gss WHERE gss.ship_type = ship_type_var AND gss.category = 'defense';
            IF FOUND THEN
                defender_power := defender_power + stats.attack * count + (stats.shield * count) / 10;
                defender_health := defender_health + stats.defense * count;
            END IF;
        END IF;
    END LOOP;

    -- Determine winner and loss percentages
    IF attacker_power > defender_health AND defender_power < attacker_health THEN
        winner := 'attacker';
    ELSIF defender_power > attacker_health AND attacker_power < defender_health THEN
        winner := 'defender';
        defender_loss_pct := LEAST(attacker_loss_pct, defender_power::float / GREATEST(defender_health, 1));
        attacker_loss_pct := defender_loss_pct;
    ELSE
        winner := 'draw';
        attacker_loss_pct := draw_loss_pct;
        defender_loss_pct := draw_loss_pct;
    END IF;

    -- Calculate losses
    FOR ship_type_var IN SELECT jsonb_object_keys(attacker_ships) LOOP
        count := (attacker_ships->>ship_type_var)::int;
        IF count > 0 THEN
            attacker_losses := jsonb_set(attacker_losses, ARRAY[ship_type_var], to_jsonb(floor(count * attacker_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type_var IN SELECT jsonb_object_keys(defender_ships) LOOP
        count := (defender_ships->>ship_type_var)::int;
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type_var], to_jsonb(floor(count * defender_loss_pct)::int));
        END IF;
    END LOOP;

    FOR ship_type_var IN SELECT jsonb_object_keys(defender_defenses) LOOP
        count := (defender_defenses->>ship_type_var)::int;
        IF count > 0 THEN
            defender_losses := jsonb_set(defender_losses, ARRAY[ship_type_var], to_jsonb(floor(count * defender_loss_pct)::int));
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