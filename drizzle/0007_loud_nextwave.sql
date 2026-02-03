CREATE TABLE "building_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"planet_id" integer NOT NULL,
	"building_type_id" integer NOT NULL,
	"target_level" integer NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completion_at" timestamp NOT NULL,
	"resources_reserved" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "building_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"base_cost" jsonb NOT NULL,
	"base_production" jsonb,
	"base_energy" jsonb,
	"max_level" integer DEFAULT 100,
	"prerequisites" jsonb,
	"build_time_formula" varchar(200),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "private_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer,
	"to_user_id" integer,
	"subject" varchar(100),
	"content" text,
	"message_type" varchar(20) DEFAULT 'private',
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "building_queue" ADD CONSTRAINT "building_queue_planet_id_planets_id_fk" FOREIGN KEY ("planet_id") REFERENCES "public"."planets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "building_queue" ADD CONSTRAINT "building_queue_building_type_id_building_types_id_fk" FOREIGN KEY ("building_type_id") REFERENCES "public"."building_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "private_messages_from_user_idx" ON "private_messages" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "private_messages_to_user_idx" ON "private_messages" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "private_messages_from_to_idx" ON "private_messages" USING btree ("from_user_id","to_user_id");--> statement-breakpoint
CREATE INDEX "private_messages_created_idx" ON "private_messages" USING btree ("created_at");