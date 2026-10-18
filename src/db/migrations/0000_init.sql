CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vacancy_id` integer NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`applied_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`notes` text,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_vacancy_idx` ON `applications` (`vacancy_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`dou_url` text NOT NULL,
	`dou_vacancies_url` text NOT NULL,
	`website_url` text,
	`careers_url` text,
	`vacancy_source` text DEFAULT 'dou' NOT NULL,
	`scrape_notes` text,
	`dou_vacancy_count` integer,
	`last_scraped_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_slug_idx` ON `companies` (`slug`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`exclude_keywords` text DEFAULT '[]' NOT NULL,
	`new_seen_watermark` integer
);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`error_summary` text,
	`stats_json` text
);
--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`source` text DEFAULT 'dou' NOT NULL,
	`title` text NOT NULL,
	`short_description` text,
	`url` text NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vacancies_external_source_idx` ON `vacancies` (`external_id`,`source`);