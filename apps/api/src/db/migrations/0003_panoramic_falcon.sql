CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"trip_id" uuid,
	"type" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"incurred_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_expense_type" CHECK ("expenses"."type" in ('toll','parking','repair','misc','document')),
	CONSTRAINT "chk_expense_amount" CHECK ("expenses"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fuel_anomaly_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fuel_log_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"expected_consumption_l" numeric(10, 3) NOT NULL,
	"actual_consumption_l" numeric(10, 3) NOT NULL,
	"expected_kpl" numeric(8, 3) NOT NULL,
	"actual_kpl" numeric(8, 3) NOT NULL,
	"deviation_pct" numeric(6, 2) NOT NULL,
	"threshold_pct" numeric(6, 2) NOT NULL,
	"severity" text NOT NULL,
	"flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_fuel_anomaly_log" UNIQUE("fuel_log_id"),
	CONSTRAINT "chk_anomaly_severity" CHECK ("fuel_anomaly_flags"."severity" in ('low','medium','high'))
);
--> statement-breakpoint
CREATE TABLE "fuel_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"trip_id" uuid,
	"liters" numeric(10, 3) NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"odometer_km" numeric(10, 2) NOT NULL,
	"fuel_type" text NOT NULL,
	"filled_station" text,
	"filled_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_fuel_liters" CHECK ("fuel_logs"."liters" > 0),
	CONSTRAINT "chk_fuel_cost" CHECK ("fuel_logs"."cost" >= 0),
	CONSTRAINT "chk_fuel_odometer" CHECK ("fuel_logs"."odometer_km" >= 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"service_odometer" numeric(10, 2),
	"cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"vendor" text,
	"status" text DEFAULT 'active' NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"predicted_schedule_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_maint_log_type" CHECK ("maintenance_logs"."type" in ('oil_change','tyre','brake','service','inspection','repair','other')),
	CONSTRAINT "chk_maint_log_status" CHECK ("maintenance_logs"."status" in ('active','closed')),
	CONSTRAINT "chk_maint_cost" CHECK ("maintenance_logs"."cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"basis_rule_id" text NOT NULL,
	"predicted_due_odometer" numeric(10, 2),
	"predicted_due_date" date,
	"predicted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"fulfilled_maintenance_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_maint_sched_status" CHECK ("maintenance_schedules"."status" in ('pending','scheduled','fulfilled','superseded'))
);
--> statement-breakpoint
CREATE TABLE "notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"email_state" text,
	"push_state" text,
	"push_receipt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_notif_recipient" UNIQUE("notification_id","user_id"),
	CONSTRAINT "chk_notif_email_state" CHECK ("notification_recipients"."email_state" is null or "notification_recipients"."email_state" in ('pending','sent','failed','skipped')),
	CONSTRAINT "chk_notif_push_state" CHECK ("notification_recipients"."push_state" is null or "notification_recipients"."push_state" in ('pending','sent','failed','skipped'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"priority" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audience_role" text,
	"actor_user_id" uuid,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_notification_fingerprint" UNIQUE("organization_id","fingerprint"),
	CONSTRAINT "chk_notification_priority" CHECK ("notifications"."priority" in ('red','orange','blue','green')),
	CONSTRAINT "chk_notification_audience_role" CHECK ("notifications"."audience_role" is null or "notifications"."audience_role" in ('admin','fleet_manager','driver','safety_officer','financial_analyst'))
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_anomaly_flags" ADD CONSTRAINT "fuel_anomaly_flags_fuel_log_id_fuel_logs_id_fk" FOREIGN KEY ("fuel_log_id") REFERENCES "public"."fuel_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_anomaly_flags" ADD CONSTRAINT "fuel_anomaly_flags_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_anomaly_flags" ADD CONSTRAINT "fuel_anomaly_flags_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expenses_org_vehicle" ON "expenses" USING btree ("organization_id","vehicle_id","incurred_at") WHERE "expenses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_fuel_anomaly_vehicle" ON "fuel_anomaly_flags" USING btree ("vehicle_id","flagged_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_fuel_logs_org_vehicle" ON "fuel_logs" USING btree ("organization_id","vehicle_id","filled_at" DESC NULLS LAST) WHERE "fuel_logs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_fuel_logs_trip" ON "fuel_logs" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_maint_logs_org_vehicle" ON "maintenance_logs" USING btree ("organization_id","vehicle_id","status") WHERE "maintenance_logs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_maint_logs_vehicle_time" ON "maintenance_logs" USING btree ("vehicle_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_maint_sched_vehicle" ON "maintenance_schedules" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE INDEX "idx_maint_sched_due" ON "maintenance_schedules" USING btree ("status","predicted_due_date");--> statement-breakpoint
CREATE INDEX "idx_notif_recipients_user_unread" ON "notification_recipients" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "notification_recipients"."read_at" is null;--> statement-breakpoint
CREATE INDEX "idx_notifications_org_time" ON "notifications" USING btree ("organization_id","created_at" DESC NULLS LAST) WHERE "notifications"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_notifications_role" ON "notifications" USING btree ("audience_role") WHERE "notifications"."deleted_at" is null;