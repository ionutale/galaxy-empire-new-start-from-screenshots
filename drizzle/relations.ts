import { relations } from 'drizzle-orm/relations';
import {
	users,
	sessions,
	galaxies,
	solarSystems,
	planets,
	userResearch,
	fleets,
	fleetTemplates,
	messages,
	researchQueue,
	researchTypes,
	userResearchLevels,
	alliances,
	autoExploreSettings,
	shipyardQueue,
	chatMessages,
	combatReports,
	espionageReports,
	planetBuildings,
	buildingTypes,
	passwordResets,
	userBoosters,
	chatModeration,
	privateMessages,
	transactions,
	userMutes,
	planetResources,
	planetShips,
	planetDefenses,
	buildingQueue,
	allianceDiplomacy,
	fleetAuditLog,
	userCommanders
} from './schema';

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	planets: many(planets),
	userResearches: many(userResearch),
	fleets: many(fleets),
	fleetTemplates: many(fleetTemplates),
	messages: many(messages),
	researchQueues: many(researchQueue),
	userResearchLevels: many(userResearchLevels),
	alliances: many(alliances),
	autoExploreSettings: many(autoExploreSettings),
	shipyardQueues: many(shipyardQueue),
	chatMessages: many(chatMessages),
	combatReports_attackerId: many(combatReports, {
		relationName: 'combatReports_attackerId_users_id'
	}),
	combatReports_defenderId: many(combatReports, {
		relationName: 'combatReports_defenderId_users_id'
	}),
	espionageReports_attackerId: many(espionageReports, {
		relationName: 'espionageReports_attackerId_users_id'
	}),
	espionageReports_targetId: many(espionageReports, {
		relationName: 'espionageReports_targetId_users_id'
	}),
	passwordResets: many(passwordResets),
	userBoosters: many(userBoosters),
	chatModerations: many(chatModeration),
	privateMessages_fromUserId: many(privateMessages, {
		relationName: 'privateMessages_fromUserId_users_id'
	}),
	privateMessages_toUserId: many(privateMessages, {
		relationName: 'privateMessages_toUserId_users_id'
	}),
	transactions: many(transactions),
	userMutes_mutedBy: many(userMutes, {
		relationName: 'userMutes_mutedBy_users_id'
	}),
	userMutes_userId: many(userMutes, {
		relationName: 'userMutes_userId_users_id'
	}),
	userCommanders: many(userCommanders)
}));

export const solarSystemsRelations = relations(solarSystems, ({ one }) => ({
	galaxy: one(galaxies, {
		fields: [solarSystems.galaxyId],
		references: [galaxies.id]
	})
}));

export const galaxiesRelations = relations(galaxies, ({ many }) => ({
	solarSystems: many(solarSystems)
}));

export const planetsRelations = relations(planets, ({ one, many }) => ({
	user: one(users, {
		fields: [planets.userId],
		references: [users.id]
	}),
	fleets: many(fleets),
	researchQueues: many(researchQueue),
	autoExploreSettings: many(autoExploreSettings),
	shipyardQueues: many(shipyardQueue),
	planetBuildings: many(planetBuildings),
	planetResources: many(planetResources),
	planetShips: many(planetShips),
	planetDefenses: many(planetDefenses),
	buildingQueues: many(buildingQueue)
}));

export const userResearchRelations = relations(userResearch, ({ one }) => ({
	user: one(users, {
		fields: [userResearch.userId],
		references: [users.id]
	})
}));

export const fleetsRelations = relations(fleets, ({ one, many }) => ({
	user: one(users, {
		fields: [fleets.userId],
		references: [users.id]
	}),
	planet: one(planets, {
		fields: [fleets.originPlanetId],
		references: [planets.id]
	}),
	fleetAuditLogs: many(fleetAuditLog)
}));

export const fleetTemplatesRelations = relations(fleetTemplates, ({ one, many }) => ({
	user: one(users, {
		fields: [fleetTemplates.userId],
		references: [users.id]
	}),
	autoExploreSettings: many(autoExploreSettings)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	user: one(users, {
		fields: [messages.userId],
		references: [users.id]
	})
}));

export const researchQueueRelations = relations(researchQueue, ({ one }) => ({
	user: one(users, {
		fields: [researchQueue.userId],
		references: [users.id]
	}),
	researchType: one(researchTypes, {
		fields: [researchQueue.researchTypeId],
		references: [researchTypes.id]
	}),
	planet: one(planets, {
		fields: [researchQueue.planetId],
		references: [planets.id]
	})
}));

export const researchTypesRelations = relations(researchTypes, ({ many }) => ({
	researchQueues: many(researchQueue),
	userResearchLevels: many(userResearchLevels)
}));

export const userResearchLevelsRelations = relations(userResearchLevels, ({ one }) => ({
	user: one(users, {
		fields: [userResearchLevels.userId],
		references: [users.id]
	}),
	researchType: one(researchTypes, {
		fields: [userResearchLevels.researchTypeId],
		references: [researchTypes.id]
	})
}));

export const alliancesRelations = relations(alliances, ({ one, many }) => ({
	user: one(users, {
		fields: [alliances.ownerId],
		references: [users.id]
	}),
	allianceDiplomacies_initiatorAllianceId: many(allianceDiplomacy, {
		relationName: 'allianceDiplomacy_initiatorAllianceId_alliances_id'
	}),
	allianceDiplomacies_targetAllianceId: many(allianceDiplomacy, {
		relationName: 'allianceDiplomacy_targetAllianceId_alliances_id'
	})
}));

export const autoExploreSettingsRelations = relations(autoExploreSettings, ({ one }) => ({
	user: one(users, {
		fields: [autoExploreSettings.userId],
		references: [users.id]
	}),
	fleetTemplate: one(fleetTemplates, {
		fields: [autoExploreSettings.templateId],
		references: [fleetTemplates.id]
	}),
	planet: one(planets, {
		fields: [autoExploreSettings.originPlanetId],
		references: [planets.id]
	})
}));

export const shipyardQueueRelations = relations(shipyardQueue, ({ one }) => ({
	user: one(users, {
		fields: [shipyardQueue.userId],
		references: [users.id]
	}),
	planet: one(planets, {
		fields: [shipyardQueue.planetId],
		references: [planets.id]
	})
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id]
	}),
	chatModerations: many(chatModeration)
}));

export const combatReportsRelations = relations(combatReports, ({ one }) => ({
	user_attackerId: one(users, {
		fields: [combatReports.attackerId],
		references: [users.id],
		relationName: 'combatReports_attackerId_users_id'
	}),
	user_defenderId: one(users, {
		fields: [combatReports.defenderId],
		references: [users.id],
		relationName: 'combatReports_defenderId_users_id'
	})
}));

export const espionageReportsRelations = relations(espionageReports, ({ one }) => ({
	user_attackerId: one(users, {
		fields: [espionageReports.attackerId],
		references: [users.id],
		relationName: 'espionageReports_attackerId_users_id'
	}),
	user_targetId: one(users, {
		fields: [espionageReports.targetId],
		references: [users.id],
		relationName: 'espionageReports_targetId_users_id'
	})
}));

export const planetBuildingsRelations = relations(planetBuildings, ({ one }) => ({
	planet: one(planets, {
		fields: [planetBuildings.planetId],
		references: [planets.id]
	}),
	buildingType: one(buildingTypes, {
		fields: [planetBuildings.buildingTypeId],
		references: [buildingTypes.id]
	})
}));

export const buildingTypesRelations = relations(buildingTypes, ({ many }) => ({
	planetBuildings: many(planetBuildings),
	buildingQueues: many(buildingQueue)
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
	user: one(users, {
		fields: [passwordResets.userId],
		references: [users.id]
	})
}));

export const userBoostersRelations = relations(userBoosters, ({ one }) => ({
	user: one(users, {
		fields: [userBoosters.userId],
		references: [users.id]
	})
}));

export const chatModerationRelations = relations(chatModeration, ({ one }) => ({
	chatMessage: one(chatMessages, {
		fields: [chatModeration.messageId],
		references: [chatMessages.id]
	}),
	user: one(users, {
		fields: [chatModeration.moderatorId],
		references: [users.id]
	})
}));

export const privateMessagesRelations = relations(privateMessages, ({ one }) => ({
	user_fromUserId: one(users, {
		fields: [privateMessages.fromUserId],
		references: [users.id],
		relationName: 'privateMessages_fromUserId_users_id'
	}),
	user_toUserId: one(users, {
		fields: [privateMessages.toUserId],
		references: [users.id],
		relationName: 'privateMessages_toUserId_users_id'
	})
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	})
}));

export const userMutesRelations = relations(userMutes, ({ one }) => ({
	user_mutedBy: one(users, {
		fields: [userMutes.mutedBy],
		references: [users.id],
		relationName: 'userMutes_mutedBy_users_id'
	}),
	user_userId: one(users, {
		fields: [userMutes.userId],
		references: [users.id],
		relationName: 'userMutes_userId_users_id'
	})
}));

export const planetResourcesRelations = relations(planetResources, ({ one }) => ({
	planet: one(planets, {
		fields: [planetResources.planetId],
		references: [planets.id]
	})
}));

export const planetShipsRelations = relations(planetShips, ({ one }) => ({
	planet: one(planets, {
		fields: [planetShips.planetId],
		references: [planets.id]
	})
}));

export const planetDefensesRelations = relations(planetDefenses, ({ one }) => ({
	planet: one(planets, {
		fields: [planetDefenses.planetId],
		references: [planets.id]
	})
}));

export const buildingQueueRelations = relations(buildingQueue, ({ one }) => ({
	planet: one(planets, {
		fields: [buildingQueue.planetId],
		references: [planets.id]
	}),
	buildingType: one(buildingTypes, {
		fields: [buildingQueue.buildingTypeId],
		references: [buildingTypes.id]
	})
}));

export const allianceDiplomacyRelations = relations(allianceDiplomacy, ({ one }) => ({
	alliance_initiatorAllianceId: one(alliances, {
		fields: [allianceDiplomacy.initiatorAllianceId],
		references: [alliances.id],
		relationName: 'allianceDiplomacy_initiatorAllianceId_alliances_id'
	}),
	alliance_targetAllianceId: one(alliances, {
		fields: [allianceDiplomacy.targetAllianceId],
		references: [alliances.id],
		relationName: 'allianceDiplomacy_targetAllianceId_alliances_id'
	})
}));

export const fleetAuditLogRelations = relations(fleetAuditLog, ({ one }) => ({
	fleet: one(fleets, {
		fields: [fleetAuditLog.fleetId],
		references: [fleets.id]
	})
}));

export const userCommandersRelations = relations(userCommanders, ({ one }) => ({
	user: one(users, {
		fields: [userCommanders.userId],
		references: [users.id]
	})
}));
