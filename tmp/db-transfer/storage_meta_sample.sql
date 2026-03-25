select bucket_id, name, metadata::text from storage.objects order by bucket_id, name limit 5;
