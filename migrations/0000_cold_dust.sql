CREATE TABLE `approval_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`action_type` text NOT NULL,
	`action_data` text NOT NULL,
	`conversation_id` text,
	`guest_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decided_at` text,
	`decided_by` text,
	`rejection_reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_approval_queue_status` ON `approval_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_approval_queue_created` ON `approval_queue` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_approval_queue_conversation` ON `approval_queue` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_approval_queue_guest` ON `approval_queue` (`guest_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_log` (`actor_type`,`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_resource` ON `audit_log` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `audit_log` (`action`);--> statement-breakpoint
CREATE TABLE `automation_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`triggered_at` text NOT NULL,
	`trigger_data` text,
	`status` text NOT NULL,
	`action_results` text,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`next_retry_at` text,
	`error_message` text,
	`completed_at` text,
	`execution_time_ms` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_automation_executions_rule` ON `automation_executions` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_automation_executions_status` ON `automation_executions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_automation_executions_retry` ON `automation_executions` (`next_retry_at`);--> statement-breakpoint
CREATE TABLE `automation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`status` text NOT NULL,
	`trigger_data` text,
	`action_result` text,
	`error_message` text,
	`execution_time_ms` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_automation_logs_rule` ON `automation_logs` (`rule_id`);--> statement-breakpoint
CREATE INDEX `idx_automation_logs_status` ON `automation_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_automation_logs_created` ON `automation_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger_type` text NOT NULL,
	`trigger_config` text NOT NULL,
	`action_type` text NOT NULL,
	`action_config` text NOT NULL,
	`actions` text,
	`retry_config` text,
	`enabled` integer DEFAULT true NOT NULL,
	`last_run_at` text,
	`last_error` text,
	`run_count` integer DEFAULT 0 NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_automation_rules_enabled` ON `automation_rules` (`enabled`);--> statement-breakpoint
CREATE INDEX `idx_automation_rules_trigger_type` ON `automation_rules` (`trigger_type`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`guest_id` text,
	`reservation_id` text,
	`channel_type` text NOT NULL,
	`channel_id` text NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`assigned_to` text,
	`current_intent` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`last_message_at` text,
	`resolved_at` text,
	`idle_warned_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conversations_guest` ON `conversations` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_channel` ON `conversations` (`channel_type`,`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_state` ON `conversations` (`state`);--> statement-breakpoint
CREATE INDEX `idx_conversations_assigned` ON `conversations` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_conversations_reservation` ON `conversations` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_last_message` ON `conversations` (`last_message_at`);--> statement-breakpoint
CREATE TABLE `guests` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`language` text DEFAULT 'en',
	`loyalty_tier` text,
	`vip_status` text,
	`external_ids` text DEFAULT '{}' NOT NULL,
	`preferences` text DEFAULT '[]' NOT NULL,
	`stay_count` integer DEFAULT 0 NOT NULL,
	`total_revenue` real DEFAULT 0 NOT NULL,
	`last_stay_date` text,
	`notes` text,
	`tags` text DEFAULT '[]',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_guests_email` ON `guests` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_guests_phone` ON `guests` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_guests_name` ON `guests` (`last_name`,`first_name`);--> statement-breakpoint
CREATE TABLE `app_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'not_configured' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`last_checked_at` text,
	`last_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_app_configs_unique` ON `app_configs` (`app_id`,`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_app_configs_app` ON `app_configs` (`app_id`);--> statement-breakpoint
CREATE INDEX `idx_app_configs_status` ON `app_configs` (`status`);--> statement-breakpoint
CREATE TABLE `app_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`details` text,
	`error_message` text,
	`latency_ms` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_app_logs_app` ON `app_logs` (`app_id`,`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_app_logs_event_type` ON `app_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_app_logs_created` ON `app_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`source_url` text,
	`source_entry_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_knowledge_category` ON `knowledge_base` (`category`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_status` ON `knowledge_base` (`status`);--> statement-breakpoint
CREATE TABLE `knowledge_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`embedding` text NOT NULL,
	`model` text NOT NULL,
	`dimensions` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `knowledge_base`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`direction` text NOT NULL,
	`sender_type` text NOT NULL,
	`sender_id` text,
	`content` text NOT NULL,
	`content_type` text DEFAULT 'text' NOT NULL,
	`media` text,
	`intent` text,
	`confidence` real,
	`entities` text,
	`channel_message_id` text,
	`delivery_status` text DEFAULT 'sent',
	`delivery_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_created` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_channel_id` ON `messages` (`channel_message_id`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`guest_id` text NOT NULL,
	`confirmation_number` text NOT NULL,
	`external_id` text,
	`room_number` text,
	`room_type` text NOT NULL,
	`arrival_date` text NOT NULL,
	`departure_date` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`estimated_arrival` text,
	`actual_arrival` text,
	`estimated_departure` text,
	`actual_departure` text,
	`rate_code` text,
	`total_rate` real,
	`balance` real DEFAULT 0,
	`special_requests` text DEFAULT '[]',
	`notes` text DEFAULT '[]',
	`synced_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_confirmation_number_unique` ON `reservations` (`confirmation_number`);--> statement-breakpoint
CREATE INDEX `idx_reservations_guest` ON `reservations` (`guest_id`);--> statement-breakpoint
CREATE INDEX `idx_reservations_dates` ON `reservations` (`arrival_date`,`departure_date`);--> statement-breakpoint
CREATE INDEX `idx_reservations_status` ON `reservations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reservations_room` ON `reservations` (`room_number`);--> statement-breakpoint
CREATE TABLE `response_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`query_hash` text NOT NULL,
	`query` text NOT NULL,
	`response` text NOT NULL,
	`intent` text,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`last_hit_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `response_cache_query_hash_unique` ON `response_cache` (`query_hash`);--> statement-breakpoint
CREATE INDEX `idx_response_cache_hash` ON `response_cache` (`query_hash`);--> statement-breakpoint
CREATE INDEX `idx_response_cache_expires` ON `response_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`role` text NOT NULL,
	`department` text,
	`permissions` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_active_at` text,
	`password_hash` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff` (`email`);--> statement-breakpoint
CREATE INDEX `idx_staff_role` ON `staff` (`role`);--> statement-breakpoint
CREATE INDEX `idx_staff_department` ON `staff` (`department`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text,
	`message_id` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`type` text NOT NULL,
	`department` text NOT NULL,
	`room_number` text,
	`description` text NOT NULL,
	`items` text,
	`priority` text DEFAULT 'standard' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_to` text,
	`external_id` text,
	`external_system` text,
	`due_at` text,
	`started_at` text,
	`completed_at` text,
	`notes` text,
	`completion_notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_conversation` ON `tasks` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_message` ON `tasks` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_department` ON `tasks` (`department`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assigned` ON `tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_tasks_room` ON `tasks` (`room_number`);--> statement-breakpoint
CREATE INDEX `idx_tasks_priority` ON `tasks` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_tasks_source` ON `tasks` (`source`);--> statement-breakpoint
CREATE INDEX `idx_tasks_created` ON `tasks` (`created_at`);--> statement-breakpoint
INSERT INTO `staff` (`id`, `email`, `name`, `role`, `department`, `permissions`, `status`, `password_hash`) VALUES ('staff-admin-butler', 'admin@butler.com', 'Butler Admin', 'admin', 'management', '["*"]', 'active', 'pa$$word2026');