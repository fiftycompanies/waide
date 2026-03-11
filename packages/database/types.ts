// AI Marketer - Database Types
// These types mirror the Prisma schema and can be used throughout the application

// ============================================
// ENUMS
// ============================================

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type KnowledgeSourceType = 'MANUAL' | 'FILE_UPLOAD' | 'WEBSITE' | 'SOCIAL' | 'API';

// ============================================
// TONE & VOICE SETTINGS
// ============================================

export interface ToneVoiceSettings {
  formality: number;      // 0-1: casual to formal
  humor: number;          // 0-1: serious to humorous
  enthusiasm: number;     // 0-1: calm to enthusiastic
  empathy: number;        // 0-1: neutral to empathetic
  directness: number;     // 0-1: indirect to direct
  creativity: number;     // 0-1: conventional to creative
}

export const DEFAULT_TONE_VOICE_SETTINGS: ToneVoiceSettings = {
  formality: 0.5,
  humor: 0.3,
  enthusiasm: 0.6,
  empathy: 0.5,
  directness: 0.5,
  creativity: 0.5,
};

// ============================================
// KNOWLEDGE METADATA
// ============================================

export interface KnowledgeMetadata {
  source?: string;
  url?: string;
  page?: number;
  fileName?: string;
  fileType?: string;
  extractedAt?: string;
  chunkIndex?: number;
  totalChunks?: number;
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  avatarUrl?: string;
}

// ============================================
// WORKSPACE TYPES
// ============================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  subscriptionTier?: SubscriptionTier;
}

export interface UpdateWorkspaceInput {
  name?: string;
  subscriptionTier?: SubscriptionTier;
}

// ============================================
// WORKSPACE MEMBER TYPES
// ============================================

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  user?: User;
  workspace?: Workspace;
}

export interface CreateWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
}

// ============================================
// BRAND PERSONA TYPES
// ============================================

export interface BrandPersona {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  toneVoiceSettings: ToneVoiceSettings;
  basePromptInstruction: string | null;
  targetAudience: string | null;
  brandValues: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandPersonaWithKnowledge extends BrandPersona {
  knowledgeBases: KnowledgeBase[];
}

export interface CreateBrandPersonaInput {
  workspaceId: string;
  name: string;
  description?: string;
  toneVoiceSettings?: Partial<ToneVoiceSettings>;
  basePromptInstruction?: string;
  targetAudience?: string;
  brandValues?: string[];
}

export interface UpdateBrandPersonaInput {
  name?: string;
  description?: string;
  toneVoiceSettings?: Partial<ToneVoiceSettings>;
  basePromptInstruction?: string;
  targetAudience?: string;
  brandValues?: string[];
  isActive?: boolean;
}

// ============================================
// KNOWLEDGE BASE TYPES
// ============================================

export interface KnowledgeBase {
  id: string;
  personaId: string;
  title: string | null;
  contentChunk: string;
  embedding?: number[];  // vector(1536)
  metadata: KnowledgeMetadata;
  sourceType: KnowledgeSourceType;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeSearchResult {
  id: string;
  contentChunk: string;
  title: string | null;
  metadata: KnowledgeMetadata;
  similarity: number;
}

export interface CreateKnowledgeInput {
  personaId: string;
  title?: string;
  contentChunk: string;
  embedding?: number[];
  metadata?: KnowledgeMetadata;
  sourceType?: KnowledgeSourceType;
}

export interface UpdateKnowledgeInput {
  title?: string;
  contentChunk?: string;
  embedding?: number[];
  metadata?: KnowledgeMetadata;
}

// ============================================
// SUPABASE DATABASE TYPES (for direct Supabase client)
// ============================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: CreateUserInput & { id?: string };
        Update: UpdateUserInput;
      };
      workspaces: {
        Row: Workspace;
        Insert: CreateWorkspaceInput & { id?: string };
        Update: UpdateWorkspaceInput;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: CreateWorkspaceMemberInput & { id?: string };
        Update: { role?: WorkspaceRole };
      };
      brand_personas: {
        Row: BrandPersona;
        Insert: CreateBrandPersonaInput & { id?: string };
        Update: UpdateBrandPersonaInput;
      };
      knowledge_bases: {
        Row: KnowledgeBase;
        Insert: CreateKnowledgeInput & { id?: string };
        Update: UpdateKnowledgeInput;
      };
    };
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[];
          match_persona_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: KnowledgeSearchResult[];
      };
    };
  };
};
