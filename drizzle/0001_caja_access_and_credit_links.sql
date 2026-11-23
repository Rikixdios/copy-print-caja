CREATE TABLE `caja_access` (
	`id` integer PRIMARY KEY NOT NULL,
	`pin_verifier` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_links` (
	`account_id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_links_token_unique` ON `credit_links` (`token`);