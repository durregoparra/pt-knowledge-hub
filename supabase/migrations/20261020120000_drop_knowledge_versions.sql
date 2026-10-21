-- Removes the knowledge versions feature added in 20261019130000_create_knowledge_versions.sql:
-- the replace/duplicate functions, the knowledge_versions table (with its policy and index),
-- and the unique (name, knowledge_type, source_type) index it added on public.knowledge.
-- public.knowledge itself goes back to how 20261019120000_create_knowledge.sql left it.

drop function if exists public.replace_knowledge(bigint, text, text);
drop function if exists public.knowledge_duplicate(text, text, text);

drop table if exists public.knowledge_versions;

drop index if exists public.knowledge_name_type_source_key;
