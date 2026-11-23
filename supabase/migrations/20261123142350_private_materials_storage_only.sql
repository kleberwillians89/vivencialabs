-- Private PDF storage only. Lead persistence is exclusively Google Sheets.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vivencia-materials', 'vivencia-materials', false, 104857600, array['application/pdf']);
-- No public access policies. Only the server signs temporary links.
commit;
