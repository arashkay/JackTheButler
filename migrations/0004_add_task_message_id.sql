ALTER TABLE `tasks` ADD `message_id` text REFERENCES `messages`(`id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_message` ON `tasks` (`message_id`);
