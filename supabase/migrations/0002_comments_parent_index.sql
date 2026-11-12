-- Replies cascade-delete from their parent comment, so index the foreign key.
create index comments_parent_idx on public.comments (parent_id);
