import { db } from './db';
import { eq, sql } from 'drizzle-orm';
import { users, planets, planetResources } from './db/schema';

// Define types for cached data
type PlanetData = {
	id: number;
	name: string | null;
	galaxyId: number;
	systemId: number;
	planetNumber: number;
	planetType: string;
	fieldsUsed: number | null;
	fieldsMax: number | null;
	metal: number | null;
	crystal: number | null;
	gas: number | null;
	energy: number | null;
}[];

// Simple in-memory cache with TTL
class MemoryCache {
	private cache = new Map<string, { value: unknown; expires: number }>();

	set(key: string, value: unknown, ttlMs: number = 300000) {
		// 5 minutes default
		this.cache.set(key, {
			value,
			expires: Date.now() + ttlMs
		});
	}

	get(key: string): unknown | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return null;
		}

		return item.value;
	}

	delete(key: string) {
		this.cache.delete(key);
	}

	clear() {
		this.cache.clear();
	}

	// Clean expired items
	cleanup() {
		const now = Date.now();
		for (const [key, item] of this.cache.entries()) {
			if (now > item.expires) {
				this.cache.delete(key);
			}
		}
	}
}

const cache = new MemoryCache();

// Clean up expired cache entries every 5 minutes
setInterval(() => cache.cleanup(), 300000);

export class CacheService {
	/**
	 * Get user planets with caching
	 */
	static async getUserPlanets(userId: number) {
		const cacheKey = `user_planets_${userId}`;
		let result: PlanetData | null = cache.get(cacheKey) as PlanetData | null;

		if (!result) {
			result = await db
				.select({
					id: planets.id,
					name: planets.name,
					galaxyId: planets.galaxyId,
					systemId: planets.systemId,
					planetNumber: planets.planetNumber,
					planetType: planets.planetType,
					fieldsUsed: planets.fieldsUsed,
					fieldsMax: planets.fieldsMax,
					metal: planetResources.metal,
					crystal: planetResources.crystal,
					gas: planetResources.gas,
					energy: planetResources.energy
				})
				.from(planets)
				.leftJoin(planetResources, eq(planets.id, planetResources.planetId))
				.where(eq(planets.userId, userId))
				.orderBy(planets.id);

			cache.set(cacheKey, result, 60000); // Cache for 1 minute
		}

		return result;
	}

	/**
	 * Get user data with caching
	 */
	static async getUserData(userId: number) {
		const cacheKey = `user_data_${userId}`;
		let userData = cache.get(cacheKey);

		if (!userData) {
			const result = await db
				.select({
					id: users.id,
					username: users.username,
					darkMatter: users.darkMatter,
					points: users.points
				})
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			userData = result[0] || null;
			if (userData) {
				cache.set(cacheKey, userData, 300000); // Cache for 5 minutes
			}
		}

		return userData;
	}

	/**
	 * Invalidate user cache
	 */
	static invalidateUserCache(userId: number) {
		cache.delete(`user_planets_${userId}`);
		cache.delete(`user_data_${userId}`);
	}

	/**
	 * Invalidate planet cache for user
	 */
	static invalidatePlanetCache(userId: number) {
		cache.delete(`user_planets_${userId}`);
	}

	/**
	 * Get expensive calculation results with caching
	 */
	static async getResourceProduction(planetId: number) {
		const cacheKey = `resource_production_${planetId}`;
		let production = cache.get(cacheKey);

		if (!production) {
			// This is an expensive calculation
			const result = await db.execute(sql`
				SELECT
					COALESCE(SUM(
						CASE
							WHEN bt.name = 'Metal Mine' THEN pb.level * 30
							WHEN bt.name = 'Crystal Mine' THEN pb.level * 20
							WHEN bt.name = 'Gas Extractor' THEN pb.level * 10
							ELSE 0
						END
					), 0) as metal_production,
					COALESCE(SUM(
						CASE
							WHEN bt.name = 'Solar Plant' THEN pb.level * 20
							WHEN bt.name = 'Fusion Reactor' THEN pb.level * 30
							ELSE 0
						END
					), 0) as energy_production
				FROM planet_buildings pb
				JOIN building_types bt ON pb.building_type_id = bt.id
				WHERE pb.planet_id = ${planetId}
			`);

			production = result.rows[0];
			cache.set(cacheKey, production, 120000); // Cache for 2 minutes
		}

		return production;
	}
}
