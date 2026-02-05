-- Create resource production procedure
CREATE OR REPLACE PROCEDURE process_resource_production() AS $$
DECLARE
    planet_rec RECORD;
    building_rec RECORD;
    prod_metal float := 0;
    prod_crystal float := 0;
    prod_gas float := 0;
    prod_energy float := 0;
    energy_cons float := 0;
    energy_prod float := 0;
    temp_mult float := 1;
    level_mult float := 1;
BEGIN
    -- Process each planet with buildings
    FOR planet_rec IN
        SELECT DISTINCT p.id, p.temperature_max
        FROM planets p
        JOIN planet_buildings pb ON pb.planet_id = p.id
        WHERE pb.level > 0
    LOOP
        -- Reset counters
        prod_metal := 0;
        prod_crystal := 0;
        prod_gas := 0;
        energy_cons := 0;
        energy_prod := 0;

        -- Calculate production from all buildings on this planet
        FOR building_rec IN
            SELECT
                bt.base_production,
                bt.base_energy,
                pb.level,
                planet_rec.temperature_max as temperature
            FROM planet_buildings pb
            JOIN building_types bt ON bt.id = pb.building_type_id
            WHERE pb.planet_id = planet_rec.id AND pb.level > 0
        LOOP
            level_mult := power(1.1, building_rec.level);

            IF building_rec.base_production IS NOT NULL THEN
                IF (building_rec.base_production->>'metal')::float > 0 THEN
                    prod_metal := prod_metal + floor((building_rec.base_production->>'metal')::float * level_mult);
                END IF;
                IF (building_rec.base_production->>'crystal')::float > 0 THEN
                    prod_crystal := prod_crystal + floor((building_rec.base_production->>'crystal')::float * level_mult);
                END IF;
                IF (building_rec.base_production->>'gas')::float > 0 THEN
                    temp_mult := 1.44 - 0.004 * COALESCE(building_rec.temperature, 50);
                    prod_gas := prod_gas + floor((building_rec.base_production->>'gas')::float * level_mult * temp_mult);
                END IF;
            END IF;

            IF building_rec.base_energy IS NOT NULL THEN
                IF (building_rec.base_energy->>'consumption')::float > 0 THEN
                    energy_cons := energy_cons + floor((building_rec.base_energy->>'consumption')::float * level_mult);
                END IF;
                IF (building_rec.base_energy->>'production')::float > 0 THEN
                    energy_prod := energy_prod + floor((building_rec.base_energy->>'production')::float * level_mult);
                END IF;
            END IF;
        END LOOP;

        prod_energy := energy_prod - energy_cons;

        -- Update planet resources
        UPDATE planet_resources
        SET
            metal = LEAST(metal + prod_metal, 10000),  -- Basic storage limit
            crystal = LEAST(crystal + prod_crystal, 10000),
            gas = LEAST(gas + prod_gas, 10000),
            energy = GREATEST(LEAST(energy + prod_energy, 10000), 0),
            last_updated = now()
        WHERE planet_id = planet_rec.id;

    END LOOP;
END;
$$ LANGUAGE plpgsql;