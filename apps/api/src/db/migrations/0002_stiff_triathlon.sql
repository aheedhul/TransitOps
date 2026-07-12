CREATE TABLE "trip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"odometer_km" numeric(10, 2),
	"note" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by" uuid,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_trip_event_type" CHECK ("trip_events"."event_type" in ('created','dispatched','enroute','position','checkpoint','delayed','arrived','pod-attached','completed','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"customer_id" uuid,
	"source_label" text NOT NULL,
	"source_lat" numeric(9, 6),
	"source_lng" numeric(9, 6),
	"destination_label" text NOT NULL,
	"destination_lat" numeric(9, 6),
	"destination_lng" numeric(9, 6),
	"cargo_weight_kg" numeric(10, 2) NOT NULL,
	"planned_distance_km" numeric(10, 2),
	"planned_travel_mins" integer,
	"estimated_fuel_l" numeric(10, 3),
	"estimated_fuel_cost" numeric(14, 2),
	"actual_distance_km" numeric(10, 2),
	"actual_travel_mins" integer,
	"fuel_consumed_l" numeric(10, 3),
	"revenue_amount" numeric(14, 2),
	"cargo_description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"dispatched_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"planned_departure_at" timestamp with time zone,
	"planned_arrival_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_trip_status" CHECK ("trips"."status" in ('draft','dispatched','in-transit','completed','cancelled')),
	CONSTRAINT "chk_cargo_weight" CHECK ("trips"."cargo_weight_kg" > 0),
	CONSTRAINT "chk_cancel_reason" CHECK ("trips"."cancel_reason" is null or "trips"."cancel_reason" in ('customer','vehicle_breakdown','weather','compliance','duplicate','other'))
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_replaced_by_refresh_tokens_id_fk";
--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_trip_events_trip" ON "trip_events" USING btree ("trip_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_trips_org_status" ON "trips" USING btree ("organization_id","status") WHERE "trips"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_trips_vehicle" ON "trips" USING btree ("vehicle_id","dispatched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trips_driver" ON "trips" USING btree ("driver_id","dispatched_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_trips_customer" ON "trips" USING btree ("customer_id") WHERE "trips"."deleted_at" is null;