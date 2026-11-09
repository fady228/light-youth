-- Run ONCE on an existing database created by the previous "blogs" version, BEFORE starting the new API.
--   mysql -u lightyouth -p lightyouth < backend/migrations/001_blogs_to_learning.sql
-- Fresh installs don't need this. Your blogs become type "article"; excerpts become summaries.
-- (Back up first: mysqldump -u lightyouth -p lightyouth > backup.sql)

RENAME TABLE blogs TO learning_items, saved_blogs TO saved_items, blog_tags TO learning_tags;

-- Drop the old FULLTEXT index (title, excerpt, content); the API recreates it as (title, summary, content).
SET @idx = (SELECT INDEX_NAME FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'learning_items' AND INDEX_TYPE = 'FULLTEXT' LIMIT 1);
SET @sql = IF(@idx IS NULL, 'SELECT 1', CONCAT('ALTER TABLE learning_items DROP INDEX `', @idx, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE learning_items
  ADD COLUMN `type` varchar(16) NOT NULL DEFAULT 'article',
  ADD COLUMN `summary` text NULL,
  ADD COLUMN `videoUrl` varchar(500) NULL,
  ADD COLUMN `fileName` varchar(80) NULL,
  ADD COLUMN `fileOriginal` varchar(200) NULL;

UPDATE learning_items SET summary = excerpt;

ALTER TABLE learning_items
  MODIFY `summary` text NOT NULL,
  MODIFY `content` text NULL,
  DROP COLUMN `excerpt`;

ALTER TABLE learning_tags CHANGE `blogId` `itemId` varchar(36) NOT NULL;
ALTER TABLE saved_items   CHANGE `blogId` `itemId` varchar(36) NOT NULL;
