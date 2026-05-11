-- Prevent multiple usable links for the same signer in one sale.
-- Terminal links (completed/revoked/expired) are allowed to coexist for audit history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_links_one_active_open_recipient
ON public.signature_links (
  sale_id,
  recipient_type,
  COALESCE(recipient_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE is_active IS TRUE
  AND status IN ('pendiente', 'visualizado', 'enviado', 'firmado_parcial');
