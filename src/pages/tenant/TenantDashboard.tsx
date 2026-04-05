import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, AlertTriangle, Calendar, MapPin } from 'lucide-react';
import { getStatusInfo, getPriorityInfo, getCategoryLabel, APARTMENT_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDashboard() {
  const { tenantInfo } = useAuth();

  const { data: apartment, isLoading: loadingApt } = useQuery({
    queryKey: ['tenant-apartment', tenantInfo?.apartment_id],
    queryFn: async () => {
      if (!tenantInfo?.apartment_id) return null;
      const { data } = await supabase.from('apartments').select('*').eq('id', tenantInfo.apartment_id).single();
      return data;
    },
    enabled: !!tenantInfo?.apartment_id,
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant-record', tenantInfo?.tenant_id],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return null;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantInfo.tenant_id).single();
      return data;
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  const { data: recentDocs } = useQuery({
    queryKey: ['tenant-recent-docs', tenantInfo?.tenant_id],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('*, document_categories(name)').order('created_at', { ascending: false }).limit(3);
      return data ?? [];
    },
    enabled: !!tenantInfo,
  });

  const { data: openIssues } = useQuery({
    queryKey: ['tenant-open-issues', tenantInfo?.tenant_id],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return [];
      const { data } = await supabase.from('issues').select('*').eq('tenant_id', tenantInfo.tenant_id)
        .not('status', 'in', '("resolved","closed")').order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  if (!tenantInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
        <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="font-heading text-lg font-semibold text-foreground">Kein Apartment zugewiesen</h2>
        <p className="text-muted-foreground text-sm mt-1">Bitte kontaktieren Sie Ihren Vermieter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Willkommen, {tenantInfo.first_name}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Ihr Mieterportal auf einen Blick</p>
      </div>

      {/* Apartment Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Mein Apartment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingApt ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : apartment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Apartment</p>
                <p className="text-sm font-medium">{apartment.apartment_number} {apartment.name && `– ${apartment.name}`}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Adresse</p>
                <p className="text-sm font-medium">{apartment.street}, {apartment.postal_code} {apartment.city}</p>
              </div>
              {tenant?.lease_start && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Mietbeginn</p>
                  <p className="text-sm font-medium">{format(new Date(tenant.lease_start), 'dd. MMMM yyyy', { locale: de })}</p>
                </div>
              )}
              {apartment.size_sqm && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Größe</p>
                  <p className="text-sm font-medium">{apartment.size_sqm} m² · {apartment.rooms} Zimmer</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Letzte Dokumente
              </CardTitle>
              <Link to="/tenant/documents" className="text-xs text-primary hover:underline">Alle anzeigen</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentDocs && recentDocs.length > 0 ? (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc as any).document_categories?.name} · {format(new Date(doc.created_at), 'dd.MM.yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keine Dokumente vorhanden.</p>
            )}
          </CardContent>
        </Card>

        {/* Open Issues */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Offene Meldungen
              </CardTitle>
              <Link to="/tenant/issues" className="text-xs text-primary hover:underline">Alle anzeigen</Link>
            </div>
          </CardHeader>
          <CardContent>
            {openIssues && openIssues.length > 0 ? (
              <div className="space-y-3">
                {openIssues.map((issue) => {
                  const status = getStatusInfo(issue.status);
                  return (
                    <Link key={issue.id} to={`/tenant/issues/${issue.id}`} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
                      <div>
                        <p className="text-sm font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {issue.ticket_number} · {getCategoryLabel(issue.category)}
                        </p>
                      </div>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Keine offenen Meldungen.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
