ALTER TABLE `submissions` ADD `operation` text DEFAULT 'create' NOT NULL;--> statement-breakpoint
UPDATE submissions SET operation='edit' WHERE EXISTS(SELECT 1 FROM content c WHERE c.id=submissions.target_id AND c.created_at<submissions.created_at);
--> statement-breakpoint
DELETE FROM submissions WHERE status='approved' AND id NOT IN(SELECT id FROM submissions WHERE status='approved' ORDER BY reviewed_at DESC,created_at DESC,id DESC LIMIT 30);
