CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`planned` integer NOT NULL,
	`actual` integer,
	`done` text DEFAULT '' NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`next` text DEFAULT '' NOT NULL,
	`parent` text DEFAULT '' NOT NULL
);
