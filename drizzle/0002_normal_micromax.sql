CREATE TABLE `verification_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`documentUrl` text NOT NULL,
	`documentKey` text NOT NULL,
	`documentType` varchar(64) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `profileType` enum('business','freelance') DEFAULT 'business' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `isVerified` boolean DEFAULT false NOT NULL;