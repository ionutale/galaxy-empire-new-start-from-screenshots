import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	boolean,
	doublePrecision,
	jsonb,
	unique,
	primaryKey,
	varchar,
	index
} from 'drizzle-orm/pg-core';

// 1. Users & Auth
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).unique().notNull(),
	email: varchar('email', { length: 100 }).unique().notNull(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	avatarId: integer('avatar_id').default(1),
	darkMatter: integer('dark_matter').default(0),
	points: integer('points').default(0),
	role: varchar('role', { length: 20 }).default('player'), // 'player', 'moderator', 'admin'
	createdAt: timestamp('created_at').defaultNow(),
	lastLogin: timestamp('last_login'),
	allianceId: integer('alliance_id') // Foreign key added later in SQL, defining here
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	expiresAt: timestamp('expires_at').notNull()
});

export const passwordResets = pgTable('password_resets', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	token: varchar('token', { length: 255 }).unique().notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// 2. Universe & Map
export const galaxies = pgTable('galaxies', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 50 })
});

export const solarSystems = pgTable(
	'solar_systems',
	{
		id: serial('id').primaryKey(),
		galaxyId: integer('galaxy_id').references(() => galaxies.id),
		systemNumber: integer('system_number').notNull()
	},
	(t) => ({
		unq: unique().on(t.galaxyId, t.systemNumber)
	})
);

export const planets = pgTable(
	'planets',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id').references(() => users.id),
		galaxyId: integer('galaxy_id').notNull(),
		systemId: integer('system_id').notNull(),
		planetNumber: integer('planet_number').notNull(),
		name: varchar('name', { length: 50 }).default('Colony'),
		planetType: varchar('planet_type', { length: 20 }).notNull(),
		fieldsUsed: integer('fields_used').default(0),
		fieldsMax: integer('fields_max').default(163),
		temperatureMin: integer('temperature_min'),
		temperatureMax: integer('temperature_max'),
		imageVariant: integer('image_variant'),
		createdAt: timestamp('created_at').defaultNow()
	},
	(t) => ({
		unq: unique().on(t.galaxyId, t.systemId, t.planetNumber)
	})
);

// 3. Resources & Buildings
export const planetResources = pgTable('planet_resources', {
	planetId: integer('planet_id')
		.primaryKey()
		.references(() => planets.id),
	metal: doublePrecision('metal').default(500),
	crystal: doublePrecision('crystal').default(500),
	gas: doublePrecision('gas').default(0),
	energy: integer('energy').default(0),
	lastUpdate: timestamp('last_update').defaultNow()
});

export const planetBuildings = pgTable(
	'planet_buildings',
	{
		id: serial('id').primaryKey(),
		planetId: integer('planet_id').references(() => planets.id, { onDelete: 'cascade' }),
		buildingTypeId: integer('building_type_id').references(() => buildingTypes.id),
		level: integer('level').default(0),
		isUpgrading: boolean('is_upgrading').default(false),
		upgradeStartedAt: timestamp('upgrade_started_at'),
		upgradeCompletionAt: timestamp('upgrade_completion_at'),
		createdAt: timestamp('created_at').defaultNow()
	},
	(t) => ({
		unq: unique().on(t.planetId, t.buildingTypeId)
	})
);

// Building system tables
export const buildingTypes = pgTable('building_types', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	category: varchar('category', { length: 50 }).notNull(),
	baseCost: jsonb('base_cost').notNull(),
	baseProduction: jsonb('base_production'),
	baseEnergy: jsonb('base_energy'),
	maxLevel: integer('max_level').default(100),
	prerequisites: jsonb('prerequisites'),
	buildTimeFormula: varchar('build_time_formula', { length: 200 }),
	createdAt: timestamp('created_at').defaultNow()
});

export const buildingQueue = pgTable('building_queue', {
	id: serial('id').primaryKey(),
	planetId: integer('planet_id')
		.notNull()
		.references(() => planets.id, { onDelete: 'cascade' }),
	buildingTypeId: integer('building_type_id')
		.notNull()
		.references(() => buildingTypes.id),
	targetLevel: integer('target_level').notNull(),
	startedAt: timestamp('started_at').defaultNow(),
	completionAt: timestamp('completion_at').notNull(),
	resourcesReserved: jsonb('resources_reserved').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// 4. Research & Tech
export const userResearch = pgTable('user_research', {
	userId: integer('user_id')
		.primaryKey()
		.references(() => users.id),
	energyTech: integer('energy_tech').default(0),
	laserTech: integer('laser_tech').default(0),
	ionTech: integer('ion_tech').default(0),
	hyperspaceTech: integer('hyperspace_tech').default(0),
	plasmaTech: integer('plasma_tech').default(0),
	combustionDrive: integer('combustion_drive').default(0),
	impulseDrive: integer('impulse_drive').default(0),
	hyperspaceDrive: integer('hyperspace_drive').default(0),
	espionageTech: integer('espionage_tech').default(0),
	computerTech: integer('computer_tech').default(0),
	astrophysics: integer('astrophysics').default(0),
	weaponsTech: integer('weapons_tech').default(0),
	shieldingTech: integer('shielding_tech').default(0),
	armourTech: integer('armour_tech').default(0)
});

export const researchTypes = pgTable('research_types', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	category: varchar('category', { length: 50 }).notNull(),
	baseCost: jsonb('base_cost').notNull(),
	baseResearchTime: integer('base_research_time').default(60), // seconds
	maxLevel: integer('max_level').default(100),
	prerequisites: jsonb('prerequisites').default({}),
	icon: varchar('icon', { length: 10 }).default('🔬')
});

export const userResearchLevels = pgTable('user_research_levels', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	researchTypeId: integer('research_type_id').references(() => researchTypes.id),
	level: integer('level').default(0),
	isResearching: boolean('is_researching').default(false),
	researchCompletionAt: timestamp('research_completion_at'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
}, (t) => ({
	userResearchIdx: index('user_research_levels_user_research_idx').on(t.userId, t.researchTypeId),
	userResearchingIdx: index('user_research_levels_researching_idx').on(t.userId, t.isResearching)
}));

export const researchQueue = pgTable('research_queue', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	researchTypeId: integer('research_type_id').references(() => researchTypes.id),
	level: integer('level').notNull(),
	startedAt: timestamp('started_at').defaultNow(),
	completionAt: timestamp('completion_at').notNull(),
	planetId: integer('planet_id').references(() => planets.id)
}, (t) => ({
	userQueueIdx: index('research_queue_user_idx').on(t.userId),
	completionIdx: index('research_queue_completion_idx').on(t.completionAt)
}));

export const shipyardQueue = pgTable('shipyard_queue', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	planetId: integer('planet_id').references(() => planets.id),
	shipType: varchar('ship_type', { length: 50 }).notNull(),
	amount: integer('amount').notNull(),
	startedAt: timestamp('started_at').defaultNow(),
	completionAt: timestamp('completion_at').notNull()
}, (t) => ({
	userQueueIdx: index('shipyard_queue_user_idx').on(t.userId),
	planetQueueIdx: index('shipyard_queue_planet_idx').on(t.planetId),
	completionIdx: index('shipyard_queue_completion_idx').on(t.completionAt)
}));

// 5. Fleets & Ships
export const fleets = pgTable(
	'fleets',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id').references(() => users.id),
		originPlanetId: integer('origin_planet_id').references(() => planets.id),
		targetGalaxy: integer('target_galaxy'),
		targetSystem: integer('target_system'),
		targetPlanet: integer('target_planet'),
		mission: varchar('mission', { length: 20 }),
		ships: jsonb('ships'),
		resources: jsonb('resources'),
		departureTime: timestamp('departure_time').defaultNow(),
		arrivalTime: timestamp('arrival_time'),
		returnTime: timestamp('return_time'),
		status: varchar('status', { length: 20 }).default('active')
	},
	(t) => ({
		userIdIdx: index('fleets_user_id_idx').on(t.userId),
		statusArrivalTimeIdx: index('fleets_status_arrival_time_idx').on(t.status, t.arrivalTime),
		originPlanetIdIdx: index('fleets_origin_planet_id_idx').on(t.originPlanetId)
	})
);

export const planetShips = pgTable('planet_ships', {
	planetId: integer('planet_id')
		.primaryKey()
		.references(() => planets.id),
	lightFighter: integer('light_fighter').default(0),
	heavyFighter: integer('heavy_fighter').default(0),
	cruiser: integer('cruiser').default(0),
	battleship: integer('battleship').default(0),
	battleCruiser: integer('battle_cruiser').default(0),
	bomber: integer('bomber').default(0),
	destroyer: integer('destroyer').default(0),
	deathStar: integer('death_star').default(0),
	smallCargo: integer('small_cargo').default(0),
	largeCargo: integer('large_cargo').default(0),
	colonyShip: integer('colony_ship').default(0),
	espionageProbe: integer('espionage_probe').default(0),
	recycler: integer('recycler').default(0)
});

export const fleetTemplates = pgTable('fleet_templates', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull(),
	ships: jsonb('ships').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// 6. Defenses
export const planetDefenses = pgTable('planet_defenses', {
	planetId: integer('planet_id')
		.primaryKey()
		.references(() => planets.id),
	rocketLauncher: integer('rocket_launcher').default(0),
	lightLaser: integer('light_laser').default(0),
	heavyLaser: integer('heavy_laser').default(0),
	gaussCannon: integer('gauss_cannon').default(0),
	ionCannon: integer('ion_cannon').default(0),
	plasmaTurret: integer('plasma_turret').default(0),
	smallShieldDome: integer('small_shield_dome').default(0),
	largeShieldDome: integer('large_shield_dome').default(0)
});

// 7. Communication & Social
export const alliances = pgTable('alliances', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).unique().notNull(),
	tag: varchar('tag', { length: 10 }).unique().notNull(),
	ownerId: integer('owner_id').references(() => users.id),
	createdAt: timestamp('created_at').defaultNow()
});

export const allianceDiplomacy = pgTable(
	'alliance_diplomacy',
	{
		id: serial('id').primaryKey(),
		initiatorAllianceId: integer('initiator_alliance_id').references(() => alliances.id),
		targetAllianceId: integer('target_alliance_id').references(() => alliances.id),
		type: varchar('type', { length: 20 }).notNull(), // 'war', 'peace', 'nap', 'alliance'
		status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'active', 'expired'
		expiresAt: timestamp('expires_at'),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow()
	},
	(t) => ({
		uniqueDiplomacy: unique().on(t.initiatorAllianceId, t.targetAllianceId, t.type, t.status)
	})
);

export const messages = pgTable(
	'messages',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id').references(() => users.id),
		type: varchar('type', { length: 20 }),
		title: varchar('title', { length: 100 }),
		content: text('content'),
		isRead: boolean('is_read').default(false),
		createdAt: timestamp('created_at').defaultNow()
	},
	(t) => ({
		userIdIdx: index('messages_user_id_idx').on(t.userId),
		userIdReadIdx: index('messages_user_id_read_idx').on(t.userId, t.isRead),
		userIdCreatedIdx: index('messages_user_id_created_idx').on(t.userId, t.createdAt)
	})
);

// Private messaging between players
export const privateMessages = pgTable(
	'private_messages',
	{
		id: serial('id').primaryKey(),
		fromUserId: integer('from_user_id').references(() => users.id),
		toUserId: integer('to_user_id').references(() => users.id),
		subject: varchar('subject', { length: 100 }),
		content: text('content'),
		messageType: varchar('message_type', { length: 20 }).default('private'),
		isRead: boolean('is_read').default(false),
		createdAt: timestamp('created_at').defaultNow()
	},
	(t) => ({
		fromUserIdx: index('private_messages_from_user_idx').on(t.fromUserId),
		toUserIdx: index('private_messages_to_user_idx').on(t.toUserId),
		fromToIdx: index('private_messages_from_to_idx').on(t.fromUserId, t.toUserId),
		createdIdx: index('private_messages_created_idx').on(t.createdAt)
	})
);

// 6. Combat & Espionage
export const combatReports = pgTable('combat_reports', {
	id: serial('id').primaryKey(),
	attackerId: integer('attacker_id').references(() => users.id),
	defenderId: integer('defender_id').references(() => users.id),
	galaxy: integer('galaxy').notNull(),
	system: integer('system').notNull(),
	planet: integer('planet').notNull(),
	mission: varchar('mission', { length: 20 }).notNull(),
	attackerFleet: jsonb('attacker_fleet').notNull(),
	defenderFleet: jsonb('defender_fleet').notNull(),
	defenderDefenses: jsonb('defender_defenses').notNull(),
	attackerLosses: jsonb('attacker_losses').notNull(),
	defenderLosses: jsonb('defender_losses').notNull(),
	winner: varchar('winner', { length: 10 }).notNull(),
	rounds: integer('rounds').default(1),
	loot: jsonb('loot'),
	debris: jsonb('debris'),
	createdAt: timestamp('created_at').defaultNow()
});

export const espionageReports = pgTable('espionage_reports', {
	id: serial('id').primaryKey(),
	attackerId: integer('attacker_id').references(() => users.id),
	targetId: integer('target_id').references(() => users.id),
	galaxy: integer('galaxy').notNull(),
	system: integer('system').notNull(),
	planet: integer('planet').notNull(),
	resources: jsonb('resources'),
	buildings: jsonb('buildings'),
	fleet: jsonb('fleet'),
	defenses: jsonb('defenses'),
	research: jsonb('research'),
	createdAt: timestamp('created_at').defaultNow()
});

export const chatMessages = pgTable('chat_messages', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	channel: varchar('channel', { length: 20 }).default('global'),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// 8. Premium Features
export const userCommanders = pgTable(
	'user_commanders',
	{
		userId: integer('user_id').references(() => users.id),
		commanderId: varchar('commander_id', { length: 50 }).notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		level: integer('level').default(1),
		experience: integer('experience').default(0),
		totalExperience: integer('total_experience').default(0)
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.commanderId] })
	})
);

export const userBoosters = pgTable('user_boosters', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	boosterId: varchar('booster_id', { length: 50 }).notNull(),
	expiresAt: timestamp('expires_at').notNull()
});

export const autoExploreSettings = pgTable('auto_explore_settings', {
	userId: integer('user_id')
		.primaryKey()
		.references(() => users.id),
	enabled: boolean('enabled').default(false),
	templateId: integer('template_id').references(() => fleetTemplates.id),
	originPlanetId: integer('origin_planet_id').references(() => planets.id),
	lastRun: timestamp('last_run').defaultNow()
});

// 9. Chat Moderation
export const chatModeration = pgTable('chat_moderation', {
	id: serial('id').primaryKey(),
	messageId: integer('message_id').references(() => chatMessages.id, { onDelete: 'cascade' }),
	moderatorId: integer('moderator_id').references(() => users.id),
	action: varchar('action', { length: 20 }).notNull(), // 'delete', 'mute', 'ban'
	reason: text('reason'),
	createdAt: timestamp('created_at').defaultNow()
});

export const userMutes = pgTable('user_mutes', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	mutedBy: integer('muted_by').references(() => users.id),
	reason: text('reason'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').defaultNow()
});

export const bannedWords = pgTable('banned_words', {
	id: serial('id').primaryKey(),
	word: varchar('word', { length: 100 }).notNull().unique(),
	severity: varchar('severity', { length: 20 }).default('moderate'), // 'low', 'moderate', 'high'
	createdAt: timestamp('created_at').defaultNow()
});

// 10. Transaction History
export const transactions = pgTable('transactions', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	type: varchar('type', { length: 50 }).notNull(), // 'commander_purchase', 'booster_purchase', 'dark_matter_purchase'
	itemId: varchar('item_id', { length: 100 }), // commander id, booster id, etc.
	amount: integer('amount').notNull(), // cost in dark matter
	duration: integer('duration'), // for time-based purchases (days)
	description: varchar('description', { length: 255 }), // human readable description
	metadata: jsonb('metadata'), // additional data
	createdAt: timestamp('created_at').defaultNow()
});

// 11. Achievement System
export const achievements = pgTable('achievements', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 100 }).notNull().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description').notNull(),
	category: varchar('category', { length: 50 }).notNull(), // 'building', 'combat', 'economy', 'exploration', 'research', 'social'
	icon: varchar('icon', { length: 50 }).notNull(),
	rewardType: varchar('reward_type', { length: 50 }), // 'dark_matter', 'commander_xp', 'resource_bonus'
	rewardAmount: integer('reward_amount'),
	requirementType: varchar('requirement_type', { length: 50 }).notNull(), // 'stat_value', 'count_value', 'boolean_flag'
	requirementTarget: varchar('requirement_target', { length: 100 }).notNull(), // stat name or condition
	requirementValue: integer('requirement_value'), // threshold value
	isHidden: boolean('is_hidden').default(false),
	sortOrder: integer('sort_order').default(0),
	createdAt: timestamp('created_at').defaultNow()
});

export const userAchievements = pgTable('user_achievements', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	achievementId: integer('achievement_id').references(() => achievements.id),
	unlockedAt: timestamp('unlocked_at').defaultNow(),
	progress: integer('progress').default(0), // for progress-tracking achievements
	isCompleted: boolean('is_completed').default(false)
});

// 12. PvE & Fusion Features
export const broodTargets = pgTable('brood_targets', {
	id: serial('id').primaryKey(),
	galaxy: integer('galaxy').notNull(),
	system: integer('system').notNull(),
	planetSlot: integer('planet_slot').notNull(),
	level: integer('level').default(1),
	rewards: jsonb('rewards'),
	lastRaidedAt: timestamp('last_raided_at'),
	createdAt: timestamp('created_at').defaultNow()
}, (t) => ({
	uniqueTarget: unique().on(t.galaxy, t.system, t.planetSlot)
}));

export const galactoniteItems = pgTable('galactonite_items', {
	id: serial('id').primaryKey(),
	playerId: integer('player_id').references(() => users.id),
	type: varchar('type', { length: 50 }).notNull(), // 'gem', 'equipment'
	rarity: varchar('rarity', { length: 20 }).default('common'), // 'common', 'rare', 'epic', 'legendary'
	stats: jsonb('stats'), // e.g., { production_bonus: 0.1 }
	createdAt: timestamp('created_at').defaultNow()
});

export const fusionRecipes = pgTable('fusion_recipes', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	inputItems: jsonb('input_items').notNull(), // array of item types/rarities
	outputBoost: jsonb('output_boost').notNull(), // { type: 'production', value: 0.1, duration: 3600 }
	cost: integer('cost').default(0), // dark matter cost
	requiredResearch: varchar('required_research', { length: 100 }) // research name
});

export const activeBoosts = pgTable('active_boosts', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	planetId: integer('planet_id').references(() => planets.id),
	boostType: varchar('boost_type', { length: 50 }).notNull(), // 'production', 'combat'
	value: doublePrecision('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});
