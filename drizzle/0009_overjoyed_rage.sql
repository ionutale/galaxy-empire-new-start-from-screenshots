CREATE TABLE "banned_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(100) NOT NULL,
	"severity" varchar(20) DEFAULT 'moderate',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "banned_words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE TABLE "chat_moderation" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer,
	"moderator_id" integer,
	"action" varchar(20) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" varchar(50) NOT NULL,
	"item_id" varchar(100),
	"amount" integer NOT NULL,
	"duration" integer,
	"description" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_mutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"muted_by" integer,
	"reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_commanders" ADD COLUMN "level" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user_commanders" ADD COLUMN "experience" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_commanders" ADD COLUMN "total_experience" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'player';--> statement-breakpoint
ALTER TABLE "chat_moderation" ADD CONSTRAINT "chat_moderation_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_moderation" ADD CONSTRAINT "chat_moderation_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mutes" ADD CONSTRAINT "user_mutes_muted_by_users_id_fk" FOREIGN KEY ("muted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;