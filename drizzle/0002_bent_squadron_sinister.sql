CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"key_hash" text NOT NULL,
	"created_by" text,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "network_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" varchar(64) NOT NULL,
	"network_token" varchar(64) NOT NULL,
	"plugin_version" varchar(20),
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	"banned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "network_sites_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "network_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" varchar(64) NOT NULL,
	"date" varchar(10) NOT NULL,
	"plugin_version" varchar(20),
	"aeo_tier" integer DEFAULT 0 NOT NULL,
	"bots" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_bot_analytics_daily" (
	"bot_name" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "plugin_bot_analytics_daily_bot_name_resource_type_day_pk" PRIMARY KEY("bot_name","resource_type","day")
);
--> statement-breakpoint
CREATE TABLE "plugin_bot_analytics_post_aeo" (
	"bot_name" varchar(100) NOT NULL,
	"post_slug" varchar(255) NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "plugin_bot_analytics_post_aeo_bot_name_post_slug_day_pk" PRIMARY KEY("bot_name","post_slug","day")
);
--> statement-breakpoint
CREATE TABLE "plugin_bot_analytics_recent" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_name" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"path" varchar(500) NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_comments_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"parent_id" integer,
	"author_name" varchar(100) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_contact_form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_newsletter_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"subject" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"token" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "plugin_newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "plugin_newsletter_subscribers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "plugin_webhooks_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_code" integer,
	"error" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_webhooks_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text DEFAULT '' NOT NULL,
	"events" text DEFAULT '["*"]' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "seo_meta_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "robots_noindex" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "robots_nofollow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "og_image_url" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "network_submissions_site_date_idx" ON "network_submissions" USING btree ("site_id","date");--> statement-breakpoint
CREATE INDEX "network_submissions_site_id_idx" ON "network_submissions" USING btree ("site_id");