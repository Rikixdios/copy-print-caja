CREATE TABLE `whatsapp_notes` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`detail` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
