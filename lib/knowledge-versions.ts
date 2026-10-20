// Knowledge version history, shared by the hub, the admin panel and the API routes.
// Mirrors public.knowledge_versions; the type and source options come from lib/knowledge.ts.
import type { KnowledgeType, SourceType } from '@/lib/knowledge';

export const DESCRIPTION_MAX = 2000;

export type KnowledgeVersion = {
  id: number;
  knowledge_id: number;
  document_name: string;
  path: string;
  knowledge_type: KnowledgeType;
  source_type: SourceType;
  created_at: string;
  version_number: number;
  description: string;
  replaced_at: string;
};

export const KNOWLEDGE_VERSION_COLUMNS =
  'id, knowledge_id, document_name, path, knowledge_type, source_type, created_at, version_number, description, replaced_at';

// What POST /api/knowledge answers (409) when the document already exists.
// `owner`: the caller registered it. `admin`: the caller may replace it through the admin route.
export type KnowledgeConflict = { id: number; owner: boolean; admin: boolean };
