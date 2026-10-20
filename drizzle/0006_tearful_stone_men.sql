ALTER TABLE `carryovers` ADD `next_date` text DEFAULT '2026-10-21' NOT NULL;--> statement-breakpoint
ALTER TABLE `carryovers` ADD `planned` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
CREATE TRIGGER carryover_creates_plan AFTER INSERT ON carryovers BEGIN
 INSERT INTO entries(id,date,title,start_date,end_date,priority,success,version,planned,actual,done,review,next,parent)
 VALUES(NEW.next_plan_id,NEW.next_date,NEW.improvement,NEW.next_date,NEW.next_date,'normal',NEW.improvement,0,NEW.planned,NULL,'','','',NEW.source_plan_id);
END;
