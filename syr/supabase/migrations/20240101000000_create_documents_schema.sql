-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_elements table
CREATE TABLE IF NOT EXISTS document_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_elements(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  content TEXT,
  attributes JSONB DEFAULT '{}',
  position INT NOT NULL,
  level INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES document_elements(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('element', 'section', 'chapter', 'document')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_document_elements_document_id ON document_elements(document_id);
CREATE INDEX idx_document_elements_parent_id ON document_elements(parent_id);
CREATE INDEX idx_summaries_element_id ON summaries(element_id);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for development)
CREATE POLICY "Allow anonymous read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access" ON document_elements FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON document_elements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access" ON summaries FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access" ON summaries FOR INSERT WITH CHECK (true);