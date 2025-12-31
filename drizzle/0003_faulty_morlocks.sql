CREATE INDEX "fleets_user_id_idx" ON "fleets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fleets_status_arrival_time_idx" ON "fleets" USING btree ("status","arrival_time");--> statement-breakpoint
CREATE INDEX "fleets_origin_planet_id_idx" ON "fleets" USING btree ("origin_planet_id");--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_user_id_read_idx" ON "messages" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "messages_user_id_created_idx" ON "messages" USING btree ("user_id","created_at");