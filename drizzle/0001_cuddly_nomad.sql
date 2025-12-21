ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "battle_cruiser" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "bomber" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "destroyer" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "death_star" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "espionage_probe" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "planet_ships" ADD COLUMN IF NOT EXISTS "recycler" integer DEFAULT 0;