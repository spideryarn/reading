-- Migration: Add slug column to documents table
-- Description: Add unique slug column to documents table for improved routing performance
-- This enables direct database lookups instead of in-memory filtering for slug-based routing

-- Add slug column to documents table
ALTER TABLE documents 
ADD COLUMN slug TEXT;

-- Populate existing documents with slug values derived from their titles
-- Convert titles to URL-friendly slugs: lowercase, replace spaces/special chars with hyphens
UPDATE documents SET slug = 'chalmers-consciousness-cropped' 
WHERE title = 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped';

UPDATE documents SET slug = 'chalmers-consciousness' 
WHERE title = 'Chalmers (1995) - Facing Up to the Problem of Consciousness';

UPDATE documents SET slug = 'rhizome-1000-plateaus' 
WHERE title = 'Rhizome - 1000 Plateaus introduction - Lambert says yes 231210';

UPDATE documents SET slug = 'bitter-lesson' 
WHERE title = 'The Bitter Lesson (original)';

-- Now add NOT NULL constraint after populating existing data
ALTER TABLE documents 
ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint to prevent duplicate slugs
ALTER TABLE documents 
ADD CONSTRAINT documents_slug_unique UNIQUE (slug);

-- Add index on slug column for performance (routing lookups)
CREATE INDEX idx_documents_slug ON documents(slug);

-- Add comment for documentation
COMMENT ON COLUMN documents.slug IS 'URL-friendly identifier for document routing, derived from title';