-- Fix: activate contratada links for sale 2026-000021 where titular already signed
-- Also delete duplicate contratada link
UPDATE signature_links SET is_active = true 
WHERE token = '4a0e49d7-06d2-4fa2-abdb-7bfb5d96e75d';

DELETE FROM signature_links 
WHERE token = '2b717d0c-7d24-48d6-9661-c2526014d76b';