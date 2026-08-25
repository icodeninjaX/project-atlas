-- Preserve existing plain-text notes as a paragraph before switching to
-- structured Tiptap JSON. New descriptions are validated again by the app.
alter table public.goal_milestones
  drop constraint if exists goal_milestones_description_length_check;

alter table public.goal_milestones
  alter column description type jsonb
  using (
    case
      when description is null or btrim(description) = '' then null
      else jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', description)
            )
          )
        )
      )
    end
  );

alter table public.goal_milestones
  add constraint goal_milestones_description_document_check
  check (
    description is null
    or (
      jsonb_typeof(description) = 'object'
      and description ->> 'type' = 'doc'
      and jsonb_typeof(description -> 'content') = 'array'
    )
  );

alter table public.goal_milestones
  add constraint goal_milestones_description_length_check
  check (description is null or char_length(description::text) <= 25000);

comment on column public.goal_milestones.description is
  'Validated Tiptap JSON document for formatted milestone notes.';
