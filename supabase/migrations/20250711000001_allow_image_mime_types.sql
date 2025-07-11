-- Update documents bucket to allow image mime types for extracted PDF images
-- Migration: 20250711000001_allow_image_mime_types.sql

-- Update the documents bucket to include image mime types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Existing document types
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'text/html', 
  'text/plain',
  -- Add image types for PDF extraction
  'image/png',
  'image/jpeg',
  'image/webp'
]::text[]
WHERE id = 'documents';