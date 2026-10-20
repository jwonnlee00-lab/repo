CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text NOT NULL,
	`tags` text NOT NULL,
	`estimated` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
