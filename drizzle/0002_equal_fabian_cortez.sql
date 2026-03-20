CREATE TABLE `analytics_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalPredictions` int DEFAULT 0,
	`accuracyRate` decimal(5,2) DEFAULT '0.00',
	`averageConfidence` decimal(5,2) DEFAULT '0.00',
	`topCategories` json,
	`trendData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`key` varchar(256) NOT NULL,
	`name` varchar(256),
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text NOT NULL,
	`fileUrl` varchar(2048),
	`fileType` varchar(50),
	`summary` text,
	`tags` json,
	`embedding` json,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prediction_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageIds` json,
	`comparisonType` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prediction_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prediction_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`outcome` enum('correct','partial','incorrect','unknown') DEFAULT 'unknown',
	`actualResult` text,
	`notes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prediction_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_time_data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` varchar(50),
	`apiKey` varchar(512),
	`endpoint` varchar(2048),
	`refreshInterval` int DEFAULT 3600,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `real_time_data_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256),
	`questions` json,
	`schedule` varchar(100),
	`nextRunAt` timestamp,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(100),
	`structure` json,
	`createdBy` int,
	`isPublic` int DEFAULT 0,
	`version` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` varchar(2048) NOT NULL,
	`event` varchar(100),
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') DEFAULT 'viewer',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `isCollaborative` int DEFAULT 0;--> statement-breakpoint
CREATE INDEX `as_userIdIdx` ON `analytics_snapshots` (`userId`);--> statement-breakpoint
CREATE INDEX `ak_userIdIdx` ON `api_keys` (`userId`);--> statement-breakpoint
CREATE INDEX `kb_userIdIdx` ON `knowledge_base` (`userId`);--> statement-breakpoint
CREATE INDEX `pc_userIdIdx` ON `prediction_comparisons` (`userId`);--> statement-breakpoint
CREATE INDEX `messageIdIdx` ON `prediction_outcomes` (`messageId`);--> statement-breakpoint
CREATE INDEX `rtds_userIdIdx` ON `real_time_data_sources` (`userId`);--> statement-breakpoint
CREATE INDEX `sj_userIdIdx` ON `scheduled_jobs` (`userId`);--> statement-breakpoint
CREATE INDEX `createdByIdx` ON `templates` (`createdBy`);--> statement-breakpoint
CREATE INDEX `wh_userIdIdx` ON `webhooks` (`userId`);--> statement-breakpoint
CREATE INDEX `wm_conversationIdIdx` ON `workspace_members` (`conversationId`);--> statement-breakpoint
CREATE INDEX `wm_userIdIdx` ON `workspace_members` (`userId`);--> statement-breakpoint
CREATE INDEX `userIdIdx` ON `conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `conversationIdIdx` ON `messages` (`conversationId`);