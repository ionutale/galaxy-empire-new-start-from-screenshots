CREATE TABLE "auto_explore_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false,
	"template_id" integer,
	"origin_planet_id" integer,
	"last_run" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "auto_explore_settings" ADD CONSTRAINT "auto_explore_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_explore_settings" ADD CONSTRAINT "auto_explore_settings_template_id_fleet_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."fleet_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_explore_settings" ADD CONSTRAINT "auto_explore_settings_origin_planet_id_planets_id_fk" FOREIGN KEY ("origin_planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;