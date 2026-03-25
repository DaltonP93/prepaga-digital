\copy (
  select bucket_id,
         name,
         coalesce(metadata->>'mimetype', 'application/octet-stream') as mimetype,
         coalesce(metadata->>'cacheControl', 'max-age=3600') as cache_control
  from storage.objects
  order by bucket_id, name
) to '/work/storage_objects.csv' with csv header
