import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { researchTypes } from '../src/lib/server/db/schema';
import { RESEARCH } from '../src/lib/game-config';

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('Seeding research types...');

  const researchData = [
    { id: 1, key: 'energy_tech', category: 'basic', icon: '⚡' },
    { id: 2, key: 'laser_tech', category: 'basic', icon: '🔫' },
    { id: 3, key: 'ion_tech', category: 'advanced', icon: '🌀' },
    { id: 4, key: 'hyperspace_tech', category: 'advanced', icon: '🌌' },
    { id: 5, key: 'plasma_tech', category: 'advanced', icon: '🔥' },
    { id: 6, key: 'combustion_drive', category: 'drive', icon: '🚀' },
    { id: 7, key: 'impulse_drive', category: 'drive', icon: '💨' },
    { id: 8, key: 'hyperspace_drive', category: 'drive', icon: '✨' },
    { id: 9, key: 'espionage_tech', category: 'basic', icon: '🕵️' },
    { id: 10, key: 'computer_tech', category: 'basic', icon: '💻' },
    { id: 11, key: 'astrophysics', category: 'advanced', icon: '🔭' },
    { id: 12, key: 'intergalactic_research_network', category: 'advanced', icon: '🌐' },
    { id: 13, key: 'graviton_tech', category: 'advanced', icon: '🍎' },
    { id: 14, key: 'weapons_tech', category: 'combat', icon: '⚔️' },
    { id: 15, key: 'shielding_tech', category: 'combat', icon: '🛡️' },
    { id: 16, key: 'armour_tech', category: 'combat', icon: '🔩' }
  ];

  for (const item of researchData) {
    const tech = RESEARCH[item.key];
    if (!tech) continue;

    console.log(`Inserting ${tech.name}...`);

    await db.insert(researchTypes).values({
      id: item.id,
      name: tech.name,
      description: tech.description,
      category: item.category,
      baseCost: tech.baseCost,
      icon: item.icon,
      baseResearchTime: 60,
      maxLevel: 100,
      prerequisites: {}
    }).onConflictDoUpdate({
      target: researchTypes.id,
      set: {
        name: tech.name,
        description: tech.description,
        category: item.category,
        baseCost: tech.baseCost,
        icon: item.icon
      }
    });
  }

  console.log('Seeding completed successfully');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed!');
  console.error(err);
  process.exit(1);
});
