PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text NOT NULL,
	`tags` text NOT NULL,
	`estimated` integer,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "plan_id", "title", "due_date", "priority", "tags", "estimated", "completed", "created_at", "version") SELECT "id", "plan_id", "title", "due_date", "priority", "tags", "estimated", "completed", "created_at", "version" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;