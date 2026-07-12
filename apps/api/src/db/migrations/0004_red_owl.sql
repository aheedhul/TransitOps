CREATE TABLE "sync_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"mutation_type" text NOT NULL,
	"entity_id" uuid,
	"status" text NOT NULL,
	"result" jsonb,
	"error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_idempotency_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "sync_idempotency" ADD CONSTRAINT "sync_idempotency_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sync_idempotency_key" ON "sync_idempotency" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_sync_idempotency_org" ON "sync_idempotency" USING btree ("organization_id","created_at" DESC NULLS LAST);