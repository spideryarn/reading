-- Make subtype field required in document_enhancements table
ALTER TABLE document_enhancements 
ALTER COLUMN subtype SET NOT NULL;