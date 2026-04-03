import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStatusInfo, getPriorityInfo, getCategoryLabel } from '@/lib/constants';
import { ArrowLeft, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function TenantIssueDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data } = await supabase.from('issues').select('*').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['issue-history', id],
    queryFn: async () => {
      const { data } = await supabase.from('issue_status_history').select('*').eq('issue_id', id!)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['issue-comments', id],
    queryFn: async () => {
      const { data } = await supabase.from('issue_comments').select('*').eq('issue_id', id!)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!issue) {
    return <div className="text-center py-12 text-muted-foreground">Meldung nicht gefunden.</div>;
  }

  const status = getStatusInfo(issue.status);
  const priority = getPriorityInfo(issue.priority);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Link to="/tenant/issues" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Zurück zu Meldungen
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground font-mono">{issue.ticket_number}</span>
          <span className={`status-badge ${status.className}`}>{status.label}</span>
          <span className={`status-badge ${priority.className}`}>{priority.label}</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{issue.title}</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Kategorie</p>
              <p className="text-sm font-medium">{getCategoryLabel(issue.category)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Erstellt am</p>
              <p className="text-sm font-medium">{format(new Date(issue.created_at), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Beschreibung</p>
            <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Bearbeitungsverlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {history.map((entry, i) => {
                const entryStatus = getStatusInfo(entry.new_status);
                return (
                  <div key={entry.id} className="relative">
                    <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-card ${
                      i === history.length - 1 ? 'bg-primary' : 'bg-muted'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        Status geändert: <span className={`status-badge ${entryStatus.className}`}>{entryStatus.label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd.MM.yyyy, HH:mm')} Uhr
                      </p>
                      {entry.comment && <p className="text-sm mt-1 text-muted-foreground">{entry.comment}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Statusänderungen.</p>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      {comments && comments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Nachrichten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm">{comment.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(comment.created_at), 'dd.MM.yyyy, HH:mm')} Uhr
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
