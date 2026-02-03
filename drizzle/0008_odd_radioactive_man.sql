CREATE TABLE "alliance_diplomacy" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiator_alliance_id" integer,
	"target_alliance_id" integer,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "alliance_diplomacy_initiator_alliance_id_target_alliance_id_type_status_unique" UNIQUE("initiator_alliance_id","target_alliance_id","type","status")
);
--> statement-breakpoint
ALTER TABLE "alliance_diplomacy" ADD CONSTRAINT "alliance_diplomacy_initiator_alliance_id_alliances_id_fk" FOREIGN KEY ("initiator_alliance_id") REFERENCES "public"."alliances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alliance_diplomacy" ADD CONSTRAINT "alliance_diplomacy_target_alliance_id_alliances_id_fk" FOREIGN KEY ("target_alliance_id") REFERENCES "public"."alliances"("id") ON DELETE no action ON UPDATE no action;