import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, AlertTriangle, CheckCircle2, FileText, Clock } from 'lucide-react';
import { getStatusInfo, getCategoryLabel } from '@/lib/constants';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [apartments, tenants, openIssues, resolvedIssues] = await Promise.all([
        supabase.from('apartments').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('issues').select('id', { count: 'exact', head: true }).not('status', 'in', '("resolved","closed")'),
        supabase.from('issues').select('id', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
      ]);
      return {
        apartments: apartments.count ?? 0,
        tenants: tenants.count ?? 0,
        openIssues: openIssues.count ?? 0,
        resolvedIssues: resolvedIssues.count ?? 0,
      };
    },
  });

  const { data: recentIssues } = useQuery({
    queryKey: ['admin-recent-issues'],
    queryFn: async () => {
      const { data } = await supabase.from('issues').select('*, tenants(first_name, last_name), apartments(apartment_number)')
        .order('created_at', { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const kpis = [
    { label: 'Apartments', value: stats?.apartments ?? 0, icon: Building2, color: 'text-primary' },
    { label: 'Aktive Mieter', value: stats?.tenants ?? 0, icon: Users, color: 'text-primary' },
    { label: 'Offene Meldungen', value: stats?.openIssues ?? 0, icon: AlertTriangle, color: 'text-[hsl(var(--status-progress))]' },
    { label: 'Erledigt', value: stats?.resolvedIssues ?? 0, icon: CheckCircle2, color: 'text-[hsl(var(--status-done))]' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Verwaltungsübersicht</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Neueste Meldungen
            </CardTitle>
            <Link to="/admin/issues" className="text-xs text-primary hover:underline">Alle anzeigen</Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentIssues && recentIssues.length > 0 ? (
            <div className="space-y-2">
              {recentIssues.map((issue) => {
                const status = getStatusInfo(issue.status);
                const tenant = issue.tenants as any;
                const apt = issue.apartments as any;
                return (
                  <Link key={issue.id} to={`/admin/issues/${issue.id}`} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.ticket_number} · {apt?.apartment_number} · {tenant?.first_name} {tenant?.last_name} · {format(new Date(issue.created_at), 'dd.MM.yyyy')}
                      </p>
                    </div>
                    <span className={`status-badge ${status.className} flex-shrink-0 ml-2`}>{status.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Meldungen vorhanden.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
