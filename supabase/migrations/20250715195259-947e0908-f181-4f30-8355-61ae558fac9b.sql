
-- Agregar la columna template_id a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN template_id UUID REFERENCES public.templates(id);

-- Agregar índice para mejorar performance
CREATE INDEX idx_sales_template_id ON public.sales(template_id);
