CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"cover_url" text,
	"total_pages" integer,
	"format" text DEFAULT 'paper' NOT NULL,
	"shelf" text DEFAULT 'want' NOT NULL,
	"queue_position" integer,
	"series" text,
	"series_number" numeric,
	"genre" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"google_books_id" text,
	"isbn" text,
	"language" text,
	CONSTRAINT "books_format_check" CHECK ("books"."format" in ('paper', 'ebook')),
	CONSTRAINT "books_shelf_check" CHECK ("books"."shelf" in ('want', 'reading', 'done', 'paused', 'dropped', 'collection')),
	CONSTRAINT "books_total_pages_check" CHECK ("books"."total_pages" > 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text,
	"target_value" integer,
	"year" integer,
	"reading_id" uuid,
	"due_date" date,
	"skip_weekdays" integer[] DEFAULT '{}'::integer[] NOT NULL,
	CONSTRAINT "goals_kind_check" CHECK ("goals"."kind" in ('yearly', 'daily', 'deadline'))
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"book_id" uuid,
	"type" text,
	"body" text,
	"meaning" text,
	"page" integer,
	"photo_path" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "notes_type_check" CHECK ("notes"."type" in ('quote', 'thought', 'word', 'photo'))
);
--> statement-breakpoint
CREATE TABLE "ocr_usage" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ocr_usage_pkey" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"book_id" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"rating" integer,
	"summary" text,
	"pause_reason" text,
	"review" text,
	"pause_note" text,
	"stopped_at" timestamp with time zone,
	"is_dropped" boolean DEFAULT false NOT NULL,
	CONSTRAINT "readings_pause_note_check" CHECK ("readings"."pause_note" is null or char_length("readings"."pause_note") <= 1000),
	CONSTRAINT "readings_rating_check" CHECK ("readings"."rating" is null or ("readings"."rating" >= 1 and "readings"."rating" <= 5))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reading_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"page_from" integer,
	"page_to" integer,
	"pages_read" integer,
	"seconds" integer,
	"source" text DEFAULT 'timer' NOT NULL,
	CONSTRAINT "sessions_source_check" CHECK ("sessions"."source" in ('timer', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'ru' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"reminder_time" time,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_language_check" CHECK ("settings"."language" in ('ru', 'en')),
	CONSTRAINT "settings_theme_check" CHECK ("settings"."theme" in ('light', 'dark'))
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "public"."readings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_usage" ADD CONSTRAINT "ocr_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "public"."readings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "books_user_id" ON "books" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "books_user_shelf_queue" ON "books" USING btree ("user_id","shelf","queue_position");--> statement-breakpoint
CREATE INDEX "goals_user_id" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_yearly_per_year" ON "goals" USING btree ("user_id","year") WHERE "goals"."kind" = 'yearly';--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_daily_per_user" ON "goals" USING btree ("user_id") WHERE "goals"."kind" = 'daily';--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_deadline_per_reading" ON "goals" USING btree ("user_id","reading_id") WHERE "goals"."kind" = 'deadline';--> statement-breakpoint
CREATE INDEX "notes_user_id" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_book_id" ON "notes" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "readings_user_id" ON "readings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "readings_book_id" ON "readings" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_started_at" ON "sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "sessions_reading_id" ON "sessions" USING btree ("reading_id");