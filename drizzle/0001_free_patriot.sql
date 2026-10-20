CREATE TABLE `plan_history` (
	`entry_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`entry_id`, `version`)
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `start_date` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `priority` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `success` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TRIGGER plan_initial AFTER INSERT ON entries BEGIN
 INSERT INTO plan_history(entry_id,version,snapshot,saved_at) VALUES(NEW.id,NEW.version,json_object('id', NEW.id, 'date', NEW.date, 'title', NEW.title, 'planned', NEW.planned, 'actual', NEW.actual, 'done', NEW.done, 'review', NEW.review, 'next', NEW.next, 'parent', NEW.parent, 'startDate', NEW.start_date, 'endDate', NEW.end_date, 'priority', NEW.priority, 'success', NEW.success, 'version', NEW.version),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER plan_preserve BEFORE UPDATE ON entries BEGIN
 INSERT OR IGNORE INTO plan_history(entry_id,version,snapshot,saved_at) VALUES(OLD.id,OLD.version,json_object('id', OLD.id, 'date', OLD.date, 'title', OLD.title, 'planned', OLD.planned, 'actual', OLD.actual, 'done', OLD.done, 'review', OLD.review, 'next', OLD.next, 'parent', OLD.parent, 'startDate', OLD.start_date, 'endDate', OLD.end_date, 'priority', OLD.priority, 'success', OLD.success, 'version', OLD.version),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER plan_revision AFTER UPDATE ON entries BEGIN
 INSERT INTO plan_history(entry_id,version,snapshot,saved_at) VALUES(NEW.id,NEW.version,json_object('id', NEW.id, 'date', NEW.date, 'title', NEW.title, 'planned', NEW.planned, 'actual', NEW.actual, 'done', NEW.done, 'review', NEW.review, 'next', NEW.next, 'parent', NEW.parent, 'startDate', NEW.start_date, 'endDate', NEW.end_date, 'priority', NEW.priority, 'success', NEW.success, 'version', NEW.version),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
