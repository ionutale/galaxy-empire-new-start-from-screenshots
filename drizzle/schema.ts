import {
	pgTable,
	unique,
	serial,
	varchar,
	text,
	integer,
	boolean,
	timestamp,
	foreignKey,
	index,
	jsonb,
	doublePrecision,
	primaryKey
} from 'drizzle-orm/pg-core';

export const achievements = pgTable(
	'achievements',
	{
		id: serial().primaryKey().notNull(),
		code: varchar({ length: 100 }).notNull(),
		name: varchar({ length: 255 }).notNull(),
		description: text().notNull(),
		category: varchar({ length: 50 }).notNull(),
		icon: varchar({ length: 50 }).notNull(),
		rewardType: varchar('reward_type', { length: 50 }),
		rewardAmount: integer('reward_amount'),
		requirementType: varchar('requirement_type', { length: 50 }).notNull(),
		requirementTarget: varchar('requirement_target', { length: 100 }).notNull(),
		requirementValue: integer('requirement_value'),
		isHidden: boolean('is_hidden').default(false),
		sortOrder: integer('sort_order').default(0),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [unique('achievements_code_unique').on(table.code)]
);

export const userAchievements = pgTable('user_achievements', {
	id: serial().primaryKey().notNull(),
	userId: integer('user_id'),
	achievementId: integer('achievement_id'),
	unlockedAt: timestamp('unlocked_at', { mode: 'string' }).defaultNow(),
	progress: integer().default(0),
	isCompleted: boolean('is_completed').default(false)
});

export const galaxies = pgTable('galaxies', {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 })
});

export const users = pgTable(
	'users',
	{
		id: serial().primaryKey().notNull(),
		username: varchar({ length: 50 }).notNull(),
		email: varchar({ length: 100 }).notNull(),
		passwordHash: varchar('password_hash', { length: 255 }).notNull(),
		avatarId: integer('avatar_id').default(1),
		darkMatter: integer('dark_matter').default(0),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		lastLogin: timestamp('last_login', { mode: 'string' }),
		allianceId: integer('alliance_id'),
		points: integer().default(0),
		role: varchar({ length: 20 }).default('player')
	},
	(table) => [
		unique('users_username_unique').on(table.username),
		unique('users_email_unique').on(table.email)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		id: text().primaryKey().notNull(),
		userId: integer('user_id'),
		expiresAt: timestamp('expires_at', { mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'sessions_user_id_users_id_fk'
		})
	]
);

export const solarSystems = pgTable(
	'solar_systems',
	{
		id: serial().primaryKey().notNull(),
		galaxyId: integer('galaxy_id'),
		systemNumber: integer('system_number').notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.galaxyId],
			foreignColumns: [galaxies.id],
			name: 'solar_systems_galaxy_id_galaxies_id_fk'
		}),
		unique('solar_systems_galaxy_id_system_number_unique').on(table.galaxyId, table.systemNumber)
	]
);

export const planets = pgTable(
	'planets',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		galaxyId: integer('galaxy_id').notNull(),
		systemId: integer('system_id').notNull(),
		planetNumber: integer('planet_number').notNull(),
		name: varchar({ length: 50 }).default('Colony'),
		planetType: varchar('planet_type', { length: 20 }).notNull(),
		fieldsUsed: integer('fields_used').default(0),
		fieldsMax: integer('fields_max').default(163),
		temperatureMin: integer('temperature_min'),
		temperatureMax: integer('temperature_max'),
		imageVariant: integer('image_variant'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'planets_user_id_users_id_fk'
		}),
		unique('planets_galaxy_id_system_id_planet_number_unique').on(
			table.galaxyId,
			table.systemId,
			table.planetNumber
		)
	]
);

export const userResearch = pgTable(
	'user_research',
	{
		userId: integer('user_id').primaryKey().notNull(),
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
		astrophysics: integer().default(0),
		weaponsTech: integer('weapons_tech').default(0),
		shieldingTech: integer('shielding_tech').default(0),
		armourTech: integer('armour_tech').default(0)
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_research_user_id_users_id_fk'
		})
	]
);

export const fleets = pgTable(
	'fleets',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		originPlanetId: integer('origin_planet_id'),
		targetGalaxy: integer('target_galaxy'),
		targetSystem: integer('target_system'),
		targetPlanet: integer('target_planet'),
		mission: varchar({ length: 20 }),
		ships: jsonb(),
		resources: jsonb(),
		departureTime: timestamp('departure_time', { mode: 'string' }).defaultNow(),
		arrivalTime: timestamp('arrival_time', { mode: 'string' }),
		returnTime: timestamp('return_time', { mode: 'string' }),
		status: varchar({ length: 20 }).default('active')
	},
	(table) => [
		index('fleets_origin_planet_id_idx').using(
			'btree',
			table.originPlanetId.asc().nullsLast().op('int4_ops')
		),
		index('fleets_status_arrival_time_idx').using(
			'btree',
			table.status.asc().nullsLast().op('timestamp_ops'),
			table.arrivalTime.asc().nullsLast().op('text_ops')
		),
		index('fleets_user_id_idx').using('btree', table.userId.asc().nullsLast().op('int4_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'fleets_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.originPlanetId],
			foreignColumns: [planets.id],
			name: 'fleets_origin_planet_id_planets_id_fk'
		})
	]
);

export const fleetTemplates = pgTable(
	'fleet_templates',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		name: varchar({ length: 50 }).notNull(),
		ships: jsonb().notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'fleet_templates_user_id_users_id_fk'
		}).onDelete('cascade')
	]
);

export const messages = pgTable(
	'messages',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		type: varchar({ length: 20 }),
		title: varchar({ length: 100 }),
		content: text(),
		isRead: boolean('is_read').default(false),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		index('messages_user_id_created_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('int4_ops'),
			table.createdAt.asc().nullsLast().op('timestamp_ops')
		),
		index('messages_user_id_idx').using('btree', table.userId.asc().nullsLast().op('int4_ops')),
		index('messages_user_id_read_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('int4_ops'),
			table.isRead.asc().nullsLast().op('bool_ops')
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'messages_user_id_users_id_fk'
		})
	]
);

export const researchTypes = pgTable('research_types', {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	category: varchar({ length: 50 }).notNull(),
	baseCost: jsonb('base_cost').notNull(),
	baseResearchTime: integer('base_research_time').default(60),
	maxLevel: integer('max_level').default(100),
	prerequisites: jsonb().default({}),
	icon: varchar({ length: 10 }).default('🔬')
});

export const researchQueue = pgTable(
	'research_queue',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		researchTypeId: integer('research_type_id'),
		level: integer().notNull(),
		startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
		completionAt: timestamp('completion_at', { mode: 'string' }).notNull(),
		planetId: integer('planet_id')
	},
	(table) => [
		index('research_queue_completion_idx').using(
			'btree',
			table.completionAt.asc().nullsLast().op('timestamp_ops')
		),
		index('research_queue_user_idx').using('btree', table.userId.asc().nullsLast().op('int4_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'research_queue_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.researchTypeId],
			foreignColumns: [researchTypes.id],
			name: 'research_queue_research_type_id_research_types_id_fk'
		}),
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'research_queue_planet_id_planets_id_fk'
		})
	]
);

export const userResearchLevels = pgTable(
	'user_research_levels',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		researchTypeId: integer('research_type_id'),
		level: integer().default(0),
		isResearching: boolean('is_researching').default(false),
		researchCompletionAt: timestamp('research_completion_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		index('user_research_levels_researching_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('int4_ops'),
			table.isResearching.asc().nullsLast().op('int4_ops')
		),
		index('user_research_levels_user_research_idx').using(
			'btree',
			table.userId.asc().nullsLast().op('int4_ops'),
			table.researchTypeId.asc().nullsLast().op('int4_ops')
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_research_levels_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.researchTypeId],
			foreignColumns: [researchTypes.id],
			name: 'user_research_levels_research_type_id_research_types_id_fk'
		})
	]
);

export const alliances = pgTable(
	'alliances',
	{
		id: serial().primaryKey().notNull(),
		name: varchar({ length: 255 }).notNull(),
		tag: varchar({ length: 10 }).notNull(),
		ownerId: integer('owner_id'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: 'alliances_owner_id_users_id_fk'
		}),
		unique('alliances_name_unique').on(table.name),
		unique('alliances_tag_unique').on(table.tag)
	]
);

export const autoExploreSettings = pgTable(
	'auto_explore_settings',
	{
		userId: integer('user_id').primaryKey().notNull(),
		enabled: boolean().default(false),
		templateId: integer('template_id'),
		originPlanetId: integer('origin_planet_id'),
		lastRun: timestamp('last_run', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'auto_explore_settings_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.templateId],
			foreignColumns: [fleetTemplates.id],
			name: 'auto_explore_settings_template_id_fleet_templates_id_fk'
		}),
		foreignKey({
			columns: [table.originPlanetId],
			foreignColumns: [planets.id],
			name: 'auto_explore_settings_origin_planet_id_planets_id_fk'
		})
	]
);

export const shipyardQueue = pgTable(
	'shipyard_queue',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		planetId: integer('planet_id'),
		shipType: varchar('ship_type', { length: 50 }).notNull(),
		amount: integer().notNull(),
		startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
		completionAt: timestamp('completion_at', { mode: 'string' }).notNull()
	},
	(table) => [
		index('shipyard_queue_completion_idx').using(
			'btree',
			table.completionAt.asc().nullsLast().op('timestamp_ops')
		),
		index('shipyard_queue_planet_idx').using(
			'btree',
			table.planetId.asc().nullsLast().op('int4_ops')
		),
		index('shipyard_queue_user_idx').using('btree', table.userId.asc().nullsLast().op('int4_ops')),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'shipyard_queue_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'shipyard_queue_planet_id_planets_id_fk'
		})
	]
);

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		channel: varchar({ length: 20 }).default('global'),
		content: text().notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'chat_messages_user_id_users_id_fk'
		})
	]
);

export const buildingTypes = pgTable('building_types', {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	category: varchar({ length: 50 }).notNull(),
	baseCost: jsonb('base_cost').notNull(),
	baseProduction: jsonb('base_production'),
	baseEnergy: jsonb('base_energy'),
	maxLevel: integer('max_level').default(100),
	prerequisites: jsonb(),
	buildTimeFormula: varchar('build_time_formula', { length: 200 }),
	createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
});

export const combatReports = pgTable(
	'combat_reports',
	{
		id: serial().primaryKey().notNull(),
		attackerId: integer('attacker_id'),
		defenderId: integer('defender_id'),
		galaxy: integer().notNull(),
		system: integer().notNull(),
		planet: integer().notNull(),
		mission: varchar({ length: 20 }).notNull(),
		attackerFleet: jsonb('attacker_fleet').notNull(),
		defenderFleet: jsonb('defender_fleet').notNull(),
		defenderDefenses: jsonb('defender_defenses').notNull(),
		attackerLosses: jsonb('attacker_losses').notNull(),
		defenderLosses: jsonb('defender_losses').notNull(),
		winner: varchar({ length: 10 }).notNull(),
		rounds: integer().default(1),
		loot: jsonb(),
		debris: jsonb(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.attackerId],
			foreignColumns: [users.id],
			name: 'combat_reports_attacker_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.defenderId],
			foreignColumns: [users.id],
			name: 'combat_reports_defender_id_users_id_fk'
		})
	]
);

export const espionageReports = pgTable(
	'espionage_reports',
	{
		id: serial().primaryKey().notNull(),
		attackerId: integer('attacker_id'),
		targetId: integer('target_id'),
		galaxy: integer().notNull(),
		system: integer().notNull(),
		planet: integer().notNull(),
		resources: jsonb(),
		buildings: jsonb(),
		fleet: jsonb(),
		defenses: jsonb(),
		research: jsonb(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.attackerId],
			foreignColumns: [users.id],
			name: 'espionage_reports_attacker_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.targetId],
			foreignColumns: [users.id],
			name: 'espionage_reports_target_id_users_id_fk'
		})
	]
);

export const bannedWords = pgTable(
	'banned_words',
	{
		id: serial().primaryKey().notNull(),
		word: varchar({ length: 100 }).notNull(),
		severity: varchar({ length: 20 }).default('moderate'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [unique('banned_words_word_unique').on(table.word)]
);

export const planetBuildings = pgTable(
	'planet_buildings',
	{
		id: serial().primaryKey().notNull(),
		planetId: integer('planet_id'),
		buildingTypeId: integer('building_type_id'),
		level: integer().default(0),
		isUpgrading: boolean('is_upgrading').default(false),
		upgradeStartedAt: timestamp('upgrade_started_at', { mode: 'string' }),
		upgradeCompletionAt: timestamp('upgrade_completion_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'planet_buildings_planet_id_fkey'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.buildingTypeId],
			foreignColumns: [buildingTypes.id],
			name: 'planet_buildings_building_type_id_fkey'
		}),
		unique('planet_buildings_planet_id_building_type_id_key').on(
			table.planetId,
			table.buildingTypeId
		)
	]
);

export const passwordResets = pgTable(
	'password_resets',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		token: varchar({ length: 255 }).notNull(),
		expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'password_resets_user_id_users_id_fk'
		}),
		unique('password_resets_token_unique').on(table.token)
	]
);

export const userBoosters = pgTable(
	'user_boosters',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		boosterId: varchar('booster_id', { length: 50 }).notNull(),
		expiresAt: timestamp('expires_at', { mode: 'string' }).notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_boosters_user_id_users_id_fk'
		})
	]
);

export const chatModeration = pgTable(
	'chat_moderation',
	{
		id: serial().primaryKey().notNull(),
		messageId: integer('message_id'),
		moderatorId: integer('moderator_id'),
		action: varchar({ length: 20 }).notNull(),
		reason: text(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.messageId],
			foreignColumns: [chatMessages.id],
			name: 'chat_moderation_message_id_chat_messages_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.moderatorId],
			foreignColumns: [users.id],
			name: 'chat_moderation_moderator_id_users_id_fk'
		})
	]
);

export const privateMessages = pgTable(
	'private_messages',
	{
		id: serial().primaryKey().notNull(),
		fromUserId: integer('from_user_id'),
		toUserId: integer('to_user_id'),
		subject: varchar({ length: 100 }),
		content: text(),
		messageType: varchar('message_type', { length: 20 }).default('private'),
		isRead: boolean('is_read').default(false),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		index('private_messages_created_idx').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamp_ops')
		),
		index('private_messages_from_to_idx').using(
			'btree',
			table.fromUserId.asc().nullsLast().op('int4_ops'),
			table.toUserId.asc().nullsLast().op('int4_ops')
		),
		index('private_messages_from_user_idx').using(
			'btree',
			table.fromUserId.asc().nullsLast().op('int4_ops')
		),
		index('private_messages_to_user_idx').using(
			'btree',
			table.toUserId.asc().nullsLast().op('int4_ops')
		),
		foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: 'private_messages_from_user_id_users_id_fk'
		}),
		foreignKey({
			columns: [table.toUserId],
			foreignColumns: [users.id],
			name: 'private_messages_to_user_id_users_id_fk'
		})
	]
);

export const transactions = pgTable(
	'transactions',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		type: varchar({ length: 50 }).notNull(),
		itemId: varchar('item_id', { length: 100 }),
		amount: integer().notNull(),
		duration: integer(),
		description: varchar({ length: 255 }),
		metadata: jsonb(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'transactions_user_id_users_id_fk'
		})
	]
);

export const userMutes = pgTable(
	'user_mutes',
	{
		id: serial().primaryKey().notNull(),
		userId: integer('user_id'),
		mutedBy: integer('muted_by'),
		reason: text(),
		expiresAt: timestamp('expires_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.mutedBy],
			foreignColumns: [users.id],
			name: 'user_mutes_muted_by_users_id_fk'
		}),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_mutes_user_id_users_id_fk'
		})
	]
);

export const planetResources = pgTable(
	'planet_resources',
	{
		planetId: integer('planet_id').primaryKey().notNull(),
		metal: doublePrecision().default(500),
		crystal: doublePrecision().default(500),
		gas: doublePrecision().default(0),
		energy: integer().default(0),
		lastUpdate: timestamp('last_update', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'planet_resources_planet_id_planets_id_fk'
		})
	]
);

export const planetShips = pgTable(
	'planet_ships',
	{
		planetId: integer('planet_id').primaryKey().notNull(),
		lightFighter: integer('light_fighter').default(0),
		heavyFighter: integer('heavy_fighter').default(0),
		cruiser: integer().default(0),
		battleship: integer().default(0),
		colonyShip: integer('colony_ship').default(0),
		smallCargo: integer('small_cargo').default(0),
		largeCargo: integer('large_cargo').default(0),
		battleCruiser: integer('battle_cruiser').default(0),
		bomber: integer().default(0),
		destroyer: integer().default(0),
		deathStar: integer('death_star').default(0),
		espionageProbe: integer('espionage_probe').default(0),
		recycler: integer().default(0)
	},
	(table) => [
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'planet_ships_planet_id_planets_id_fk'
		})
	]
);

export const planetDefenses = pgTable(
	'planet_defenses',
	{
		planetId: integer('planet_id').primaryKey().notNull(),
		rocketLauncher: integer('rocket_launcher').default(0),
		lightLaser: integer('light_laser').default(0),
		heavyLaser: integer('heavy_laser').default(0),
		gaussCannon: integer('gauss_cannon').default(0),
		ionCannon: integer('ion_cannon').default(0),
		plasmaTurret: integer('plasma_turret').default(0),
		smallShieldDome: integer('small_shield_dome').default(0),
		largeShieldDome: integer('large_shield_dome').default(0)
	},
	(table) => [
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'planet_defenses_planet_id_planets_id_fk'
		})
	]
);

export const buildingQueue = pgTable(
	'building_queue',
	{
		id: serial().primaryKey().notNull(),
		planetId: integer('planet_id').notNull(),
		buildingTypeId: integer('building_type_id').notNull(),
		targetLevel: integer('target_level').notNull(),
		startedAt: timestamp('started_at', { mode: 'string' }).defaultNow(),
		completionAt: timestamp('completion_at', { mode: 'string' }).notNull(),
		resourcesReserved: jsonb('resources_reserved').notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		index('idx_building_queue_completion_at').using(
			'btree',
			table.completionAt.asc().nullsLast().op('timestamp_ops')
		),
		index('idx_building_queue_planet_id').using(
			'btree',
			table.planetId.asc().nullsLast().op('int4_ops')
		),
		foreignKey({
			columns: [table.planetId],
			foreignColumns: [planets.id],
			name: 'building_queue_planet_id_planets_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.buildingTypeId],
			foreignColumns: [buildingTypes.id],
			name: 'building_queue_building_type_id_building_types_id_fk'
		})
	]
);

export const allianceDiplomacy = pgTable(
	'alliance_diplomacy',
	{
		id: serial().primaryKey().notNull(),
		initiatorAllianceId: integer('initiator_alliance_id'),
		targetAllianceId: integer('target_alliance_id'),
		type: varchar({ length: 20 }).notNull(),
		status: varchar({ length: 20 }).default('pending'),
		expiresAt: timestamp('expires_at', { mode: 'string' }),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.initiatorAllianceId],
			foreignColumns: [alliances.id],
			name: 'alliance_diplomacy_initiator_alliance_id_alliances_id_fk'
		}),
		foreignKey({
			columns: [table.targetAllianceId],
			foreignColumns: [alliances.id],
			name: 'alliance_diplomacy_target_alliance_id_alliances_id_fk'
		})
	]
);

export const gameTickMetrics = pgTable('game_tick_metrics', {
	id: serial().primaryKey().notNull(),
	tickTime: timestamp('tick_time', { mode: 'string' }).defaultNow(),
	fleetsProcessed: integer('fleets_processed').default(0),
	autoExploreFleets: integer('auto_explore_fleets').default(0),
	executionTimeMs: integer('execution_time_ms'),
	errorsCount: integer('errors_count').default(0),
	errorMessages: text('error_messages').array()
});

export const fleetAuditLog = pgTable(
	'fleet_audit_log',
	{
		id: serial().primaryKey().notNull(),
		fleetId: integer('fleet_id'),
		action: varchar({ length: 50 }).notNull(),
		oldState: jsonb('old_state'),
		newState: jsonb('new_state'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow()
	},
	(table) => [
		foreignKey({
			columns: [table.fleetId],
			foreignColumns: [fleets.id],
			name: 'fleet_audit_log_fleet_id_fkey'
		}).onDelete('cascade')
	]
);

export const userCommanders = pgTable(
	'user_commanders',
	{
		userId: integer('user_id').notNull(),
		commanderId: varchar('commander_id', { length: 50 }).notNull(),
		expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
		level: integer().default(1),
		experience: integer().default(0),
		totalExperience: integer('total_experience').default(0)
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'user_commanders_user_id_users_id_fk'
		}),
		primaryKey({
			columns: [table.userId, table.commanderId],
			name: 'user_commanders_user_id_commander_id_pk'
		})
	]
);
