CREATE TABLE `location_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`region` varchar(256),
	`city` varchar(256),
	`country` varchar(256),
	`timezone` varchar(64),
	`isEnabled` int DEFAULT 1,
	`demographics` json,
	`regulations` json,
	`competitors` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `location_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ld_userIdIdx` ON `location_data` (`userId`);--> statement-breakpoint
CREATE INDEX `ld_conversationIdIdx` ON `location_data` (`conversationId`);