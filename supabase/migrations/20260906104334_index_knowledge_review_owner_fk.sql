create index knowledge_reviews_concept_owner_idx
  on public.knowledge_reviews(concept_id, user_id);
