CREATE TABLE "driver_score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"trips_count" integer DEFAULT 0 NOT NULL,
	"late_trips" integer DEFAULT 0 NOT NULL,
	"safety_score" numeric(5, 2) NOT NULL,
	"fuel_rating" numeric(5, 2) NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emissions_factors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fuel_type" text NOT NULL,
	"co2_per_l" numeric(10, 5) NOT NULL,
	"co2_per_kwh" numeric(10, 5) DEFAULT '0' NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emissions_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"trip_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"distance_km" numeric(10, 2) NOT NULL,
	"fuel_consumed_l" numeric(10, 3),
	"electricity_kwh" numeric(10, 3),
	"co2_kg" numeric(14, 3) NOT NULL,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_emissions_method" CHECK ("emissions_records"."method" in ('ipcc','fleet_actual','estimated'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"fuel_efficiency_pct" numeric(5, 2) NOT NULL,
	"maintenance_pct" numeric(5, 2) NOT NULL,
	"driver_safety_pct" numeric(5, 2) NOT NULL,
	"utilization_pct" numeric(5, 2) NOT NULL,
	"overall_score" numeric(5, 2) NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_vehicle_health_fuel_eff" CHECK ("vehicle_health_scores"."fuel_efficiency_pct" between 0 and 100),
	CONSTRAINT "chk_vehicle_health_maint" CHECK ("vehicle_health_scores"."maintenance_pct" between 0 and 100),
	CONSTRAINT "chk_vehicle_health_driver" CHECK ("vehicle_health_scores"."driver_safety_pct" between 0 and 100),
	CONSTRAINT "chk_vehicle_health_util" CHECK ("vehicle_health_scores"."utilization_pct" between 0 and 100),
	CONSTRAINT "chk_vehicle_health_overall" CHECK ("vehicle_health_scores"."overall_score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "driver_score_history" ADD CONSTRAINT "driver_score_history_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissions_records" ADD CONSTRAINT "emissions_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissions_records" ADD CONSTRAINT "emissions_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emissions_records" ADD CONSTRAINT "emissions_records_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_health_scores" ADD CONSTRAINT "vehicle_health_scores_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_driver_score_history_driver" ON "driver_score_history" USING btree ("driver_id","computed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_emissions_vehicle" ON "emissions_records" USING btree ("vehicle_id","period_start" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_emissions_trip" ON "emissions_records" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_health_scores_vehicle" ON "vehicle_health_scores" USING btree ("vehicle_id","computed_at" DESC NULLS LAST);