CREATE TABLE `article_topics` (
	`name` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `event_state` ADD `publication_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `published_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `published_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE event_state SET publication_version=CASE WHEN finalized_at IS NULL THEN 0 ELSE 1 END;
--> statement-breakpoint
UPDATE registrations SET published_status=CASE WHEN EXISTS(SELECT 1 FROM event_state s WHERE s.tournament_id=registrations.tournament_id AND s.finalized_at IS NOT NULL) THEN CASE WHEN status='provisional' THEN 'pending' ELSE status END ELSE 'pending' END,published_note=CASE WHEN EXISTS(SELECT 1 FROM event_state s WHERE s.tournament_id=registrations.tournament_id AND s.finalized_at IS NOT NULL) THEN note ELSE '' END;
--> statement-breakpoint
UPDATE content SET data=json_set(data,'$.opensAt',COALESCE(json_extract(data,'$.opensAt'),MIN(substr(created_at,1,10),json_extract(data,'$.deadline')))) WHERE kind='tournament';
--> statement-breakpoint
INSERT OR IGNORE INTO article_topics(name,created_at) SELECT json_extract(data,'$.category'),created_at FROM content WHERE kind='article' AND COALESCE(json_extract(data,'$.category'),'')<>'';
--> statement-breakpoint
INSERT OR IGNORE INTO article_topics(name,created_at) VALUES ('Hoạt động CLB','2026-10-25'),('Tin giải đấu','2026-10-25'),('Góc sân','2026-10-25');
--> statement-breakpoint
UPDATE content SET kind='album',data=json_object('title',json_extract(data,'$.title'),'date',COALESCE(json_extract(data,'$.month')||'-01',substr(created_at,1,10)),'description','','cover',CASE WHEN json_extract(data,'$.type')='image' THEN json_extract(data,'$.url') ELSE COALESCE(NULLIF(json_extract(data,'$.thumbnail'),''),'/pickleball-court.jpg') END,'photoLinks',json('[]'),'videoLinks',json(CASE WHEN json_extract(data,'$.type')='video' THEN json_array(json_extract(data,'$.url')) ELSE '[]' END),'photos',json(CASE WHEN json_extract(data,'$.type')='image' THEN json_array(json_object('url',json_extract(data,'$.url'),'description',json_extract(data,'$.title'))) ELSE '[]' END),'demo',json(COALESCE(json_extract(data,'$.demo'),'false'))) WHERE kind='media';
--> statement-breakpoint
UPDATE submissions SET kind='album',data=json_object('title',json_extract(data,'$.title'),'date',COALESCE(json_extract(data,'$.month')||'-01',substr(created_at,1,10)),'description','','cover',CASE WHEN json_extract(data,'$.type')='image' THEN json_extract(data,'$.url') ELSE COALESCE(NULLIF(json_extract(data,'$.thumbnail'),''),'/pickleball-court.jpg') END,'photoLinks',json('[]'),'videoLinks',json(CASE WHEN json_extract(data,'$.type')='video' THEN json_array(json_extract(data,'$.url')) ELSE '[]' END),'photos',json(CASE WHEN json_extract(data,'$.type')='image' THEN json_array(json_object('url',json_extract(data,'$.url'),'description',json_extract(data,'$.title'))) ELSE '[]' END),'demo',json(COALESCE(json_extract(data,'$.demo'),'false'))) WHERE kind='media';
--> statement-breakpoint
DELETE FROM content WHERE kind='article' AND id NOT IN(SELECT id FROM content WHERE kind='article' ORDER BY json_extract(data,'$.date') DESC,created_at DESC,id DESC LIMIT 20);
--> statement-breakpoint
DELETE FROM content WHERE kind='album' AND id NOT IN(SELECT id FROM content WHERE kind='album' ORDER BY json_extract(data,'$.date') DESC,created_at DESC,id DESC LIMIT 20);
