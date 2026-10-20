CREATE UNIQUE INDEX `completion_cycle` ON `completions` (`task_id`,`task_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `execution_session` ON `executions` (`task_id`,`started_at`,`ended_at`);--> statement-breakpoint
CREATE TRIGGER completion_sets_status AFTER INSERT ON completions BEGIN
 UPDATE tasks SET completed=1, version=version+1 WHERE id=NEW.task_id AND version=NEW.task_version AND completed=0;
END;
