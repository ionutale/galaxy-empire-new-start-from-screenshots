CREATE TABLE "alliances" (
"id" serial PRIMARY KEY NOT NULL,
"name" varchar(255) NOT NULL,
"tag" varchar(10) NOT NULL,
"owner_id" integer,
"created_at" timestamp DEFAULT now(),
	CONSTRAINT "alliances_name_unique" UNIQUE("name"),
	CONSTRAINT "alliances_tag_unique" UNIQUE("tag")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"channel" varchar(20) DEFAULT 'global',
"content" text NOT NULL,
"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleet_templates" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"name" varchar(50) NOT NULL,
"ships" jsonb NOT NULL,
"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fleets" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"origin_planet_id" integer,
"target_galaxy" integer,
"target_system" integer,
"target_planet" integer,
"mission" varchar(20),
"ships" jsonb,
"resources" jsonb,
"departure_time" timestamp DEFAULT now(),
	"arrival_time" timestamp,
	"return_time" timestamp,
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "galaxies" (
"id" serial PRIMARY KEY NOT NULL,
"name" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "messages" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"type" varchar(20),
"title" varchar(100),
"content" text,
"is_read" boolean DEFAULT false,
"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"token" varchar(255) NOT NULL,
"expires_at" timestamp NOT NULL,
"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "planet_buildings" (
"planet_id" integer PRIMARY KEY NOT NULL,
"metal_mine" integer DEFAULT 0,
"crystal_mine" integer DEFAULT 0,
"gas_extractor" integer DEFAULT 0,
"solar_plant" integer DEFAULT 0,
"shipyard" integer DEFAULT 0,
"research_lab" integer DEFAULT 0,
"robotics_factory" integer DEFAULT 0,
"nanite_factory" integer DEFAULT 0,
"metal_storage" integer DEFAULT 0,
"crystal_storage" integer DEFAULT 0,
"gas_storage" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "planet_defenses" (
"planet_id" integer PRIMARY KEY NOT NULL,
"rocket_launcher" integer DEFAULT 0,
"light_laser" integer DEFAULT 0,
"heavy_laser" integer DEFAULT 0,
"gauss_cannon" integer DEFAULT 0,
"ion_cannon" integer DEFAULT 0,
"plasma_turret" integer DEFAULT 0,
"small_shield_dome" integer DEFAULT 0,
"large_shield_dome" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "planet_resources" (
"planet_id" integer PRIMARY KEY NOT NULL,
"metal" double precision DEFAULT 500,
"crystal" double precision DEFAULT 500,
"gas" double precision DEFAULT 0,
"energy" integer DEFAULT 0,
"last_update" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "planet_ships" (
"planet_id" integer PRIMARY KEY NOT NULL,
"light_fighter" integer DEFAULT 0,
"heavy_fighter" integer DEFAULT 0,
"cruiser" integer DEFAULT 0,
"battleship" integer DEFAULT 0,
"battle_cruiser" integer DEFAULT 0,
"bomber" integer DEFAULT 0,
"destroyer" integer DEFAULT 0,
"death_star" integer DEFAULT 0,
"small_cargo" integer DEFAULT 0,
"large_cargo" integer DEFAULT 0,
"colony_ship" integer DEFAULT 0,
"espionage_probe" integer DEFAULT 0,
"recycler" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "planets" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"galaxy_id" integer NOT NULL,
"system_id" integer NOT NULL,
"planet_number" integer NOT NULL,
"name" varchar(50) DEFAULT 'Colony',
"planet_type" varchar(20) NOT NULL,
"fields_used" integer DEFAULT 0,
"fields_max" integer DEFAULT 163,
"temperature_min" integer,
"temperature_max" integer,
"image_variant" integer,
"created_at" timestamp DEFAULT now(),
	CONSTRAINT "planets_galaxy_id_system_id_planet_number_unique" UNIQUE("galaxy_id","system_id","planet_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
"id" text PRIMARY KEY NOT NULL,
"user_id" integer,
"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solar_systems" (
"id" serial PRIMARY KEY NOT NULL,
"galaxy_id" integer,
"system_number" integer NOT NULL,
CONSTRAINT "solar_systems_galaxy_id_system_number_unique" UNIQUE("galaxy_id","system_number")
);
--> statement-breakpoint
CREATE TABLE "user_boosters" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" integer,
"booster_id" varchar(50) NOT NULL,
"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_commanders" (
"user_id" integer,
"commander_id" varchar(50) NOT NULL,
"expires_at" timestamp NOT NULL,
CONSTRAINT "user_commanders_user_id_commander_id_pk" PRIMARY KEY("user_id","commander_id")
);
--> statement-breakpoint
CREATE TABLE "user_research" (
"user_id" integer PRIMARY KEY NOT NULL,
"energy_tech" integer DEFAULT 0,
"laser_tech" integer DEFAULT 0,
"ion_tech" integer DEFAULT 0,
"hyperspace_tech" integer DEFAULT 0,
"plasma_tech" integer DEFAULT 0,
"combustion_drive" integer DEFAULT 0,
"impulse_drive" integer DEFAULT 0,
"hyperspace_drive" integer DEFAULT 0,
"espionage_tech" integer DEFAULT 0,
"computer_tech" integer DEFAULT 0,
"astrophysics" integer DEFAULT 0,
"weapons_tech" integer DEFAULT 0,
"shielding_tech" integer DEFAULT 0,
"armour_tech" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
"id" serial PRIMARY KEY NOT NULL,
"username" varchar(50) NOT NULL,
"email" varchar(100) NOT NULL,
"password_hash" varchar(255) NOT NULL,
"avatar_id" integer DEFAULT 1,
"dark_matter" integer DEFAULT 0,
"points" integer DEFAULT 0,
"created_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"alliance_id" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alliances" ADD CONSTRAINT "alliances_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_templates" ADD CONSTRAINT "fleet_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleets" ADD CONSTRAINT "fleets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleets" ADD CONSTRAINT "fleets_origin_planet_id_planets_id_fk" FOREIGN KEY ("origin_planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planet_buildings" ADD CONSTRAINT "planet_buildings_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planet_defenses" ADD CONSTRAINT "planet_defenses_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planet_resources" ADD CONSTRAINT "planet_resources_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD CONSTRAINT "planet_ships_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solar_systems" ADD CONSTRAINT "solar_systems_galaxy_id_galaxies_id_fk" FOREIGN KEY ("galaxy_id") REFERENCES "public"."galaxies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_boosters" ADD CONSTRAINT "user_boosters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_commanders" ADD CONSTRAINT "user_commanders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_research" ADD CONSTRAINT "user_research_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
