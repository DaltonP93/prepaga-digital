-- Create workflow states table
CREATE TABLE public.template_workflow_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  state VARCHAR NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'in_review', 'approved', 'published', 'archived')),
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template comments table
CREATE TABLE public.template_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.template_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template versions table
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  static_content TEXT,
  dynamic_fields JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_notes TEXT,
  is_major_version BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(template_id, version_number)
);

-- Create template analytics table
CREATE TABLE public.template_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL CHECK (event_type IN ('view', 'edit', 'pdf_generated', 'shared', 'duplicated')),
  user_id UUID REFERENCES public.profiles(id),
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.template_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_workflow_states
CREATE POLICY "Users can view company template workflow states" ON public.template_workflow_states
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_workflow_states.template_id 
      AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
    )
  );

CREATE POLICY "Admins can manage company template workflow states" ON public.template_workflow_states
  FOR ALL USING (
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) 
    AND EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_workflow_states.template_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage all template workflow states" ON public.template_workflow_states
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- RLS Policies for template_comments
CREATE POLICY "Users can view company template comments" ON public.template_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_comments.template_id 
      AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
    )
  );

CREATE POLICY "Users can create comments on company templates" ON public.template_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_comments.template_id 
      AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
    )
  );

CREATE POLICY "Users can update their own comments" ON public.template_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage company template comments" ON public.template_comments
  FOR ALL USING (
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) 
    AND EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_comments.template_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

-- RLS Policies for template_versions
CREATE POLICY "Users can view company template versions" ON public.template_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_versions.template_id 
      AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
    )
  );

CREATE POLICY "Admins can manage company template versions" ON public.template_versions
  FOR ALL USING (
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) 
    AND EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_versions.template_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

-- RLS Policies for template_analytics
CREATE POLICY "Users can create analytics for company templates" ON public.template_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_analytics.template_id 
      AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
    )
  );

CREATE POLICY "Admins can view company template analytics" ON public.template_analytics
  FOR SELECT USING (
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'gestor'::user_role]) 
    AND EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_analytics.template_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX idx_template_workflow_states_template_id ON public.template_workflow_states(template_id);
CREATE INDEX idx_template_workflow_states_state ON public.template_workflow_states(state);
CREATE INDEX idx_template_comments_template_id ON public.template_comments(template_id);
CREATE INDEX idx_template_comments_user_id ON public.template_comments(user_id);
CREATE INDEX idx_template_versions_template_id ON public.template_versions(template_id);
CREATE INDEX idx_template_versions_version_number ON public.template_versions(template_id, version_number);
CREATE INDEX idx_template_analytics_template_id ON public.template_analytics(template_id);
CREATE INDEX idx_template_analytics_event_type ON public.template_analytics(event_type);
CREATE INDEX idx_template_analytics_created_at ON public.template_analytics(created_at);

-- Create function to automatically create version when template is updated
CREATE OR REPLACE FUNCTION public.create_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR 
     OLD.static_content IS DISTINCT FROM NEW.static_content OR 
     OLD.dynamic_fields IS DISTINCT FROM NEW.dynamic_fields THEN
    
    INSERT INTO public.template_versions (
      template_id,
      version_number,
      content,
      static_content,
      dynamic_fields,
      created_by,
      change_notes,
      is_major_version
    ) VALUES (
      NEW.id,
      COALESCE((SELECT MAX(version_number) + 1 FROM public.template_versions WHERE template_id = NEW.id), 1),
      NEW.content,
      NEW.static_content,
      NEW.dynamic_fields,
      auth.uid(),
      'Automatic version created on template update',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic versioning
CREATE TRIGGER trigger_create_template_version
  AFTER UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.create_template_version();

-- Create function to update template workflow state
CREATE OR REPLACE FUNCTION public.update_template_workflow_state(
  p_template_id UUID,
  p_new_state VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  workflow_id UUID;
BEGIN
  INSERT INTO public.template_workflow_states (
    template_id,
    state,
    changed_by,
    notes
  ) VALUES (
    p_template_id,
    p_new_state,
    auth.uid(),
    p_notes
  ) RETURNING id INTO workflow_id;
  
  RETURN workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;