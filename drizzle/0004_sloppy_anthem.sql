CREATE TABLE "research_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"research_type_id" integer,
	"level" integer NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completion_at" timestamp NOT NULL,
	"planet_id" integer
);
--> statement-breakpoint
CREATE TABLE "research_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"base_cost" jsonb NOT NULL,
	"base_research_time" integer DEFAULT 60,
	"max_level" integer DEFAULT 100,
	"prerequisites" jsonb DEFAULT '{}'::jsonb,
	"icon" varchar(10) DEFAULT '🔬'
);
--> statement-breakpoint
CREATE TABLE "user_research_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"research_type_id" integer,
	"level" integer DEFAULT 0,
	"is_researching" boolean DEFAULT false,
	"research_completion_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_research_type_id_research_types_id_fk" FOREIGN KEY ("research_type_id") REFERENCES "public"."research_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_queue" ADD CONSTRAINT "research_queue_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_research_levels" ADD CONSTRAINT "user_research_levels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_research_levels" ADD CONSTRAINT "user_research_levels_research_type_id_research_types_id_fk" FOREIGN KEY ("research_type_id") REFERENCES "public"."research_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_queue_user_idx" ON "research_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_queue_completion_idx" ON "research_queue" USING btree ("completion_at");--> statement-breakpoint
CREATE INDEX "user_research_levels_user_research_idx" ON "user_research_levels" USING btree ("user_id","research_type_id");--> statement-breakpoint
CREATE INDEX "user_research_levels_researching_idx" ON "user_research_levels" USING btree ("user_id","is_researching");--> statement-breakpoint
INSERT INTO "research_types" ("name", "description", "category", "base_cost", "base_research_time", "max_level", "prerequisites", "icon") VALUES
('Energy Technology', 'Essential for other technologies. Increases energy production efficiency.', 'energy', '{"metal": 0, "crystal": 800, "gas": 400}', 60, 20, '{}', '⚡'),
('Laser Technology', 'Basic laser technology for weapons and mining.', 'combat', '{"metal": 200, "crystal": 100, "gas": 0}', 120, 20, '{"energy_tech": 1}', '🔴'),
('Ion Technology', 'Advanced ion-based weapons and shields.', 'combat', '{"metal": 1000, "crystal": 300, "gas": 100}', 240, 15, '{"energy_tech": 4, "laser_tech": 5}', '💙'),
('Hyperspace Technology', 'Enables faster-than-light travel and communication.', 'propulsion', '{"metal": 4000, "crystal": 2000, "gas": 600}', 480, 15, '{"energy_tech": 5, "shielding_tech": 5}', '🌌'),
('Plasma Technology', 'Cutting-edge plasma weapons technology.', 'combat', '{"metal": 20000, "crystal": 40000, "gas": 10000}', 960, 10, '{"energy_tech": 8, "laser_tech": 10, "ion_tech": 5}', '🔥'),
('Combustion Drive', 'Basic rocket propulsion for ships.', 'propulsion', '{"metal": 400, "crystal": 0, "gas": 600}', 60, 25, '{}', '🚀'),
('Impulse Drive', 'Advanced impulse propulsion systems.', 'propulsion', '{"metal": 2000, "crystal": 4000, "gas": 600}', 180, 20, '{"energy_tech": 1}', '⚡'),
('Hyperspace Drive', 'FTL propulsion technology.', 'propulsion', '{"metal": 10000, "crystal": 20000, "gas": 6000}', 360, 15, '{"hyperspace_tech": 3}', '🌟'),
('Espionage Technology', 'Improves spy probe effectiveness and counter-intelligence.', 'intelligence', '{"metal": 200, "crystal": 1000, "gas": 200}', 120, 20, '{"computer_tech": 1}', '🕵️'),
('Computer Technology', 'Enhances ship computers and research efficiency.', 'intelligence', '{"metal": 0, "crystal": 400, "gas": 600}', 60, 25, '{}', '💻'),
('Astrophysics', 'Increases maximum colonization and expedition range.', 'expansion', '{"metal": 4000, "crystal": 8000, "gas": 4000}', 480, 20, '{"energy_tech": 1, "impulse_drive": 3}', '🔭'),
('Weapons Technology', 'Improves ship weapon effectiveness.', 'combat', '{"metal": 800, "crystal": 200, "gas": 0}', 120, 20, '{"energy_tech": 1}', '💥'),
('Shielding Technology', 'Enhances defensive capabilities.', 'combat', '{"metal": 200, "crystal": 600, "gas": 0}', 120, 20, '{"energy_tech": 3}', '🛡️'),
('Armour Technology', 'Strengthens ship hull integrity.', 'combat', '{"metal": 1000, "crystal": 0, "gas": 0}', 120, 20, '{}', '🔧');