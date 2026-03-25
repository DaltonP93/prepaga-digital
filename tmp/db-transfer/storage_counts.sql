select bucket_id, count(*) from storage.objects group by 1 order by 1;
