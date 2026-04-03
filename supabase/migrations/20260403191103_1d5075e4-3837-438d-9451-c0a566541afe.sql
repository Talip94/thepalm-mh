
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'tenant', 'staff');

-- Create all tables first
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_number TEXT NOT NULL UNIQUE,
  name TEXT,
  street TEXT,
  city TEXT DEFAULT 'Berlin',
  postal_code TEXT,
  floor TEXT,
  size_sqm NUMERIC,
  rooms INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'inactive')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  lease_start DATE,
  lease_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'moved_out', 'paused')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT '',
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('heating', 'water_sanitary', 'electricity', 'furniture', 'kitchen_appliances', 'windows_doors', 'internet_wifi', 'cleaning', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'received', 'in_review', 'commissioned', 'in_progress', 'resolved', 'closed')),
  photo_paths TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.issue_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  type TEXT DEFAULT 'info',
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_info()
RETURNS TABLE (tenant_id UUID, apartment_id UUID, first_name TEXT, last_name TEXT, apartment_number TEXT, apartment_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.apartment_id, t.first_name, t.last_name, a.apartment_number, a.name
  FROM public.tenants t LEFT JOIN public.apartments a ON a.id = t.apartment_id
  WHERE t.user_id = auth.uid() AND t.status = 'active' LIMIT 1
$$;

-- RLS Policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

CREATE POLICY "Admins manage apartments" ON public.apartments FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view assigned apartment" ON public.apartments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE tenants.apartment_id = apartments.id AND tenants.user_id = auth.uid() AND tenants.status = 'active')
);

CREATE POLICY "Admins manage tenants" ON public.tenants FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view own record" ON public.tenants FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Auth users view categories" ON public.document_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.document_categories FOR ALL USING (public.is_admin());

CREATE POLICY "Admins manage documents" ON public.documents FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view own documents" ON public.documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE tenants.user_id = auth.uid() AND tenants.status = 'active'
    AND (documents.tenant_id = tenants.id OR (documents.apartment_id = tenants.apartment_id AND documents.tenant_id IS NULL)))
);

CREATE POLICY "Admins manage issues" ON public.issues FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view own issues" ON public.issues FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = issues.tenant_id AND tenants.user_id = auth.uid())
);
CREATE POLICY "Tenants create issues" ON public.issues FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = issues.tenant_id AND tenants.user_id = auth.uid())
);

CREATE POLICY "Admins manage comments" ON public.issue_comments FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view public comments" ON public.issue_comments FOR SELECT USING (
  is_internal = false AND EXISTS (SELECT 1 FROM public.issues JOIN public.tenants ON tenants.id = issues.tenant_id WHERE issues.id = issue_comments.issue_id AND tenants.user_id = auth.uid())
);
CREATE POLICY "Tenants create comments" ON public.issue_comments FOR INSERT WITH CHECK (
  auth.uid() = author_id AND is_internal = false AND EXISTS (SELECT 1 FROM public.issues JOIN public.tenants ON tenants.id = issues.tenant_id WHERE issues.id = issue_comments.issue_id AND tenants.user_id = auth.uid())
);

CREATE POLICY "Admins manage status history" ON public.issue_status_history FOR ALL USING (public.is_admin());
CREATE POLICY "Tenants view own status history" ON public.issue_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.issues JOIN public.tenants ON tenants.id = issues.tenant_id WHERE issues.id = issue_status_history.issue_id AND tenants.user_id = auth.uid())
);

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

-- Triggers
CREATE SEQUENCE public.ticket_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.ticket_number := 'SM-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON public.apartments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.track_issue_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.issue_status_history (issue_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER track_issue_status AFTER UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.track_issue_status_change();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-photos', 'issue-photos', false);

CREATE POLICY "Admins manage document files" ON storage.objects FOR ALL USING (bucket_id = 'documents' AND public.is_admin());
CREATE POLICY "Tenants view document files" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.tenants WHERE tenants.user_id = auth.uid() AND tenants.status = 'active')
);
CREATE POLICY "Admins manage issue photos" ON storage.objects FOR ALL USING (bucket_id = 'issue-photos' AND public.is_admin());
CREATE POLICY "Auth users upload issue photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users view issue photos" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);

-- Default document categories
INSERT INTO public.document_categories (name, description, sort_order) VALUES
  ('Mietvertrag', 'Mietverträge und Nachträge', 1),
  ('Wohnungsgeberbescheinigung', 'Bescheinigungen für das Einwohnermeldeamt', 2),
  ('Hausordnung', 'Hausordnung und Regelwerke', 3),
  ('Übergabeprotokoll', 'Ein- und Auszugsprotokolle', 4),
  ('Rechnung', 'Rechnungen und Abrechnungen', 5),
  ('Sonstige', 'Weitere Dokumente', 99);
