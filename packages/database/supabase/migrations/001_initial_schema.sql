-- AI Marketer Initial Schema Migration
-- Enable required extensions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE subscription_tier AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE workspace_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE knowledge_source_type AS ENUM ('MANUAL', 'FILE_UPLOAD', 'WEBSITE', 'SOCIAL', 'API');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKSPACES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier subscription_tier DEFAULT 'FREE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WORKSPACE MEMBERS TABLE (Junction)
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- ============================================
-- BRAND PERSONAS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS brand_personas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tone_voice_settings JSONB DEFAULT '{}',
    base_prompt_instruction TEXT,
    target_audience TEXT,
    brand_values TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- KNOWLEDGE BASE TABLE (RAG with pgvector)
-- ============================================

CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id UUID NOT NULL REFERENCES brand_personas(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content_chunk TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-ada-002 dimension
    metadata JSONB DEFAULT '{}',
    source_type knowledge_source_type DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspace indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- Workspace member indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- Brand persona indexes
CREATE INDEX IF NOT EXISTS idx_brand_personas_workspace ON brand_personas(workspace_id);

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_persona ON knowledge_bases(persona_id);

-- Vector similarity search index (HNSW for faster queries)
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_embedding ON knowledge_bases 
USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_personas_updated_at
    BEFORE UPDATE ON brand_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at
    BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RAG HELPER FUNCTIONS
-- ============================================

-- Function to search knowledge base by semantic similarity
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding vector(1536),
    match_persona_id UUID,
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content_chunk TEXT,
    title VARCHAR(255),
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content_chunk,
        kb.title,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_bases kb
    WHERE kb.persona_id = match_persona_id
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Workspace policies
CREATE POLICY "Users can view workspaces they belong to"
    ON workspaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Workspace members policies
CREATE POLICY "Users can view members of their workspaces"
    ON workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Brand personas policies
CREATE POLICY "Users can view personas in their workspaces"
    ON brand_personas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = brand_personas.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage personas"
    ON brand_personas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = brand_personas.workspace_id
            AND workspace_members.user_id = auth.uid()
            AND workspace_members.role IN ('OWNER', 'ADMIN')
        )
    );

-- Knowledge base policies
CREATE POLICY "Users can view knowledge in their personas"
    ON knowledge_bases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brand_personas bp
            JOIN workspace_members wm ON wm.workspace_id = bp.workspace_id
            WHERE bp.id = knowledge_bases.persona_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage knowledge base"
    ON knowledge_bases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM brand_personas bp
            JOIN workspace_members wm ON wm.workspace_id = bp.workspace_id
            WHERE bp.id = knowledge_bases.persona_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('OWNER', 'ADMIN')
        )
    );
