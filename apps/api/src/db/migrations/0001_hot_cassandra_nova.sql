CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_kind" text DEFAULT 'user' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"event_id" uuid,
	"trace_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip" "inet",
	"user_agent" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_audit_actor_kind" CHECK ("audit_logs"."actor_kind" in ('user','system','job'))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"billing_address" text,
	"type" text DEFAULT 'shipper' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_customer_name" UNIQUE("organization_id","name"),
	CONSTRAINT "chk_customer_type" CHECK ("customers"."type" in ('shipper','receiver','both'))
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"license_number" text NOT NULL,
	"license_category" text NOT NULL,
	"license_expiry_date" date NOT NULL,
	"contact_number" text NOT NULL,
	"safety_score" numeric(5, 2) DEFAULT '100' NOT NULL,
	"overall_score" numeric(5, 2) DEFAULT '100' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_driver_license" UNIQUE("organization_id","license_number"),
	CONSTRAINT "chk_driver_status" CHECK ("drivers"."status" in ('available','on-trip','off-duty','suspended')),
	CONSTRAINT "chk_safety_score" CHECK ("drivers"."safety_score" between 0 and 100),
	CONSTRAINT "chk_overall_score" CHECK ("drivers"."overall_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "event_consumers" (
	"event_id" uuid NOT NULL,
	"consumer_id" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_consumers_event_id_consumer_id_pk" PRIMARY KEY("event_id","consumer_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"unit_system" text DEFAULT 'metric' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"user_agent" text,
	"ip" "inet",
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mfa_secret" text,
	"mfa_recovery_codes" text[] DEFAULT '{}' NOT NULL,
	"notification_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "chk_users_role" CHECK ("users"."role" in ('admin','fleet_manager','driver','safety_officer','financial_analyst')),
	CONSTRAINT "chk_users_status" CHECK ("users"."status" in ('active','invited','suspended','deactivated'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" text NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"expires_on" date,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_vehicle_doc_type" CHECK ("vehicle_documents"."type" in ('insurance','registration','fitness','pollution','permit','photo','other'))
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"registration_number" text NOT NULL,
	"name" text,
	"model" text,
	"type" text NOT NULL,
	"max_load_capacity" numeric(10, 2) NOT NULL,
	"odometer" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fuel_type" text DEFAULT 'diesel' NOT NULL,
	"acquisition_cost" numeric(14, 2) NOT NULL,
	"acquisition_date" date NOT NULL,
	"currency_code" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"retired_at" timestamp with time zone,
	"home_region_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_vehicle_registration" UNIQUE("organization_id","registration_number"),
	CONSTRAINT "chk_vehicle_type" CHECK ("vehicles"."type" in ('truck','van','car','tractor','trailer','tanker','bus','ev','other')),
	CONSTRAINT "chk_vehicle_status" CHECK ("vehicles"."status" in ('available','on-trip','in-shop','retired')),
	CONSTRAINT "chk_vehicle_fuel" CHECK ("vehicles"."fuel_type" in ('diesel','petrol','cng','electric','hybrid')),
	CONSTRAINT "chk_max_load" CHECK ("vehicles"."max_load_capacity" > 0),
	CONSTRAINT "chk_odometer" CHECK ("vehicles"."odometer" >= 0),
	CONSTRAINT "chk_acquisition_cost" CHECK ("vehicles"."acquisition_cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_refresh_tokens_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."refresh_tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_org_time" ON "audit_logs" USING btree ("organization_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_customers_org" ON "customers" USING btree ("organization_id") WHERE "customers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_drivers_status" ON "drivers" USING btree ("organization_id","status") WHERE "drivers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_drivers_license_expiry" ON "drivers" USING btree ("organization_id","license_expiry_date");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_users_org_email" ON "users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "idx_users_org_role" ON "users" USING btree ("organization_id","role") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_vehicle_docs" ON "vehicle_documents" USING btree ("vehicle_id") WHERE "vehicle_documents"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_vehicle_docs_expiry" ON "vehicle_documents" USING btree ("expires_on") WHERE "vehicle_documents"."expires_on" is not null;--> statement-breakpoint
CREATE INDEX "idx_vehicles_status" ON "vehicles" USING btree ("organization_id","status") WHERE "vehicles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_vehicles_type" ON "vehicles" USING btree ("organization_id","type");