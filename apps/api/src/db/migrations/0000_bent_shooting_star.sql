CREATE TABLE "healthz" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
