CREATE TABLE "combat_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"attacker_id" integer,
	"defender_id" integer,
	"galaxy" integer NOT NULL,
	"system" integer NOT NULL,
	"planet" integer NOT NULL,
	"mission" varchar(20) NOT NULL,
	"attacker_fleet" jsonb NOT NULL,
	"defender_fleet" jsonb NOT NULL,
	"defender_defenses" jsonb NOT NULL,
	"attacker_losses" jsonb NOT NULL,
	"defender_losses" jsonb NOT NULL,
	"winner" varchar(10) NOT NULL,
	"rounds" integer DEFAULT 1,
	"loot" jsonb,
	"debris" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "espionage_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"attacker_id" integer,
	"target_id" integer,
	"galaxy" integer NOT NULL,
	"system" integer NOT NULL,
	"planet" integer NOT NULL,
	"resources" jsonb,
	"buildings" jsonb,
	"fleet" jsonb,
	"defenses" jsonb,
	"research" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "combat_reports" ADD CONSTRAINT "combat_reports_attacker_id_users_id_fk" FOREIGN KEY ("attacker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_reports" ADD CONSTRAINT "combat_reports_defender_id_users_id_fk" FOREIGN KEY ("defender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espionage_reports" ADD CONSTRAINT "espionage_reports_attacker_id_users_id_fk" FOREIGN KEY ("attacker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espionage_reports" ADD CONSTRAINT "espionage_reports_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;