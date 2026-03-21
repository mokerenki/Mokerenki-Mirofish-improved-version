CREATE TABLE `entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` varchar(100) NOT NULL,
	`description` text,
	`metadata` json,
	`color` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_graph_datasets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`fileUrl` varchar(2048),
	`fileFormat` varchar(50),
	`entityCount` int DEFAULT 0,
	`relationshipCount` int DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entity_graph_datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`sourceEntityId` int NOT NULL,
	`targetEntityId` int NOT NULL,
	`relationshipType` varchar(100) NOT NULL,
	`strength` decimal(3,2) DEFAULT '0.5',
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ent_conversationIdIdx` ON `entities` (`conversationId`);--> statement-breakpoint
CREATE INDEX `ent_userIdIdx` ON `entities` (`userId`);--> statement-breakpoint
CREATE INDEX `egd_conversationIdIdx` ON `entity_graph_datasets` (`conversationId`);--> statement-breakpoint
CREATE INDEX `egd_userIdIdx` ON `entity_graph_datasets` (`userId`);--> statement-breakpoint
CREATE INDEX `rel_conversationIdIdx` ON `relationships` (`conversationId`);--> statement-breakpoint
CREATE INDEX `rel_userIdIdx` ON `relationships` (`userId`);--> statement-breakpoint
CREATE INDEX `rel_sourceIdx` ON `relationships` (`sourceEntityId`);--> statement-breakpoint
CREATE INDEX `rel_targetIdx` ON `relationships` (`targetEntityId`);