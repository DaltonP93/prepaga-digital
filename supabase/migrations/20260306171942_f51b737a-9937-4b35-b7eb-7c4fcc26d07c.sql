CREATE INDEX IF NOT EXISTS idx_process_traces_sale_id ON process_traces(sale_id);
CREATE INDEX IF NOT EXISTS idx_sig_identity_sale_id ON signature_identity_verification(sale_id);
CREATE INDEX IF NOT EXISTS idx_sig_identity_link_id ON signature_identity_verification(signature_link_id);
DROP INDEX IF EXISTS idx_beneficiaries_sale;