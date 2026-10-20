CREATE TABLE `auth_account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_session_token_unique` ON `auth_session` (`token`);--> statement-breakpoint
CREATE TABLE `auth_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_user_email_unique` ON `auth_user` (`email`);--> statement-breakpoint
CREATE TABLE `auth_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `legacy_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`migrated_count` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `owner_id` text;--> statement-breakpoint
DROP TRIGGER carryover_creates_plan;
--> statement-breakpoint
CREATE TRIGGER carryover_creates_plan AFTER INSERT ON carryovers BEGIN
 INSERT INTO entries(id,owner_id,date,title,start_date,end_date,priority,success,version,planned,actual,done,review,next,parent)
 SELECT NEW.next_plan_id,owner_id,NEW.next_date,NEW.improvement,NEW.next_date,NEW.next_date,'normal',NEW.improvement,0,NEW.planned,NULL,'','','',NEW.source_plan_id FROM entries WHERE id=NEW.source_plan_id;
END;

--> statement-breakpoint
DROP TRIGGER plan_revision;
--> statement-breakpoint
CREATE TRIGGER plan_revision AFTER UPDATE ON entries WHEN NEW.version <> OLD.version BEGIN
 INSERT INTO plan_history(entry_id,version,snapshot,saved_at) VALUES(NEW.id,NEW.version,json_object('id', NEW.id, 'date', NEW.date, 'title', NEW.title, 'planned', NEW.planned, 'actual', NEW.actual, 'done', NEW.done, 'review', NEW.review, 'next', NEW.next, 'parent', NEW.parent, 'startDate', NEW.start_date, 'endDate', NEW.end_date, 'priority', NEW.priority, 'success', NEW.success, 'version', NEW.version),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
