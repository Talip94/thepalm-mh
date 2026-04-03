import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { getStatusInfo, getPriorityInfo, getCategoryLabel } from '@/lib/constants';
import { ListChecks, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function TenantIssues() {
  const { tenantInfo } = useAuth();

  const { data: issues, isLoading } = useQuery({
    queryKey: ['tenant-issues', tenantInfo?.tenant_id],
    queryFn: async () => {
      if (!tenantInfo?.tenant_id) return [];
      const { data } = await supabase.from('issues').select('*').eq('tenant_id', tenantInfo.tenant_id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!tenantInfo?.tenant_id,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Meine Meldungen</h1>
        <p className="text-muted-foreground text-sm mt-1">Übersicht aller Ihrer Schadenmeldungen und Anliegen</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : !issues || issues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Sie haben noch keine Meldungen erstellt.</p>
            <Link to="/tenant/report" className="text-primary text-sm mt-2 hover:underline">Neue Meldung erstellen</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const status = getStatusInfo(issue.status);
            const priority = getPriorityInfo(issue.priority);
            return (
              <Link key={issue.id} to={`/tenant/issues/${issue.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">{issue.ticket_number}</span>
                          <span className={`status-badge ${priority.className}`}>{priority.label}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getCategoryLabel(issue.category)} · {format(new Date(issue.created_at), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <span className={`status-badge ${status.className} flex-shrink-0`}>{status.label}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
