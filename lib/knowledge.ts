// Knowledge document options, shared by the forms, tables and API routes.
// The keys mirror the check constraints on public.knowledge.

export const KNOWLEDGE_TYPES = {
  formal_rule: 'Formal rule',
  operational_guide: 'Operational guide',
} as const;

export const SOURCE_TYPES = {
  sop: 'SOP',
  email: 'Email',
  meeting: 'Meeting',
} as const;

export const STATUSES = {
  pending_review: 'Pending review',
  approved: 'Approved',
  archived: 'Archived',
} as const;

export const NAME_MAX = 200;
export const PATH_MAX = 1000;
export const REVIEW_COMMENT_MAX = 1000;

export type KnowledgeType = keyof typeof KNOWLEDGE_TYPES;
export type SourceType = keyof typeof SOURCE_TYPES;
export type Status = keyof typeof STATUSES;

export type Knowledge = {
  id: number;
  name: string;
  path: string;
  knowledge_type: KnowledgeType;
  source_type: SourceType;
  status: Status;
  created_at: string;
  review_comment: string | null;
  reviewed_at: string | null;
};

export const KNOWLEDGE_COLUMNS = 'id, name, path, knowledge_type, source_type, status, created_at, review_comment, reviewed_at';
