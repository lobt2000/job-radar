ALTER TABLE `companies` ADD `vacancy_fetch_status` text DEFAULT 'ok';
--> statement-breakpoint
ALTER TABLE `companies` ADD `last_vacancy_error` text;
--> statement-breakpoint
ALTER TABLE `profile` ADD `cities` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `profile` ADD `english_level` text;
--> statement-breakpoint
ALTER TABLE `profile` ADD `experience_min` integer;
--> statement-breakpoint
ALTER TABLE `profile` ADD `prefer_remote` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `cv_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text,
	`storage_path` text NOT NULL,
	`raw_text` text,
	`parsed_json` text,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
