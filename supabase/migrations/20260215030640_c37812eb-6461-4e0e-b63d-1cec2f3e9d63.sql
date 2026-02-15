
-- Add unique constraint on template_responses for upsert support
ALTER TABLE public.template_responses 
ADD CONSTRAINT template_responses_sale_template_question_unique 
UNIQUE (sale_id, template_id, question_id);
