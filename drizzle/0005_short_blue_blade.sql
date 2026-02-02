CREATE TABLE "shipyard_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"planet_id" integer,
	"ship_type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completion_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipyard_queue" ADD CONSTRAINT "shipyard_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipyard_queue" ADD CONSTRAINT "shipyard_queue_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipyard_queue_user_idx" ON "shipyard_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shipyard_queue_planet_idx" ON "shipyard_queue" USING btree ("planet_id");--> statement-breakpoint
CREATE INDEX "shipyard_queue_completion_idx" ON "shipyard_queue" USING btree ("completion_at");