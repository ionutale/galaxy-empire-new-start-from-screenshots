CREATE TABLE "active_boosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"planet_id" integer,
	"boost_type" varchar(50) NOT NULL,
	"value" double precision NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brood_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"galaxy" integer NOT NULL,
	"system" integer NOT NULL,
	"planet_slot" integer NOT NULL,
	"level" integer DEFAULT 1,
	"rewards" jsonb,
	"last_raided_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "brood_targets_galaxy_system_planet_slot_unique" UNIQUE("galaxy","system","planet_slot")
);
--> statement-breakpoint
CREATE TABLE "fusion_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"input_items" jsonb NOT NULL,
	"output_boost" jsonb NOT NULL,
	"cost" integer DEFAULT 0,
	"required_research" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "galactonite_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"type" varchar(50) NOT NULL,
	"rarity" varchar(20) DEFAULT 'common',
	"stats" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "active_boosts" ADD CONSTRAINT "active_boosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_boosts" ADD CONSTRAINT "active_boosts_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "galactonite_items" ADD CONSTRAINT "galactonite_items_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;