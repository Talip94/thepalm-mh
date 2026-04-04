import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ISSUE_STATUSES, getStatusInfo, getPriorityInfo, getCategoryLabel } from '@/lib/constants';
import { ArrowLeft, Clock, MessageSquare, Send, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data } = await supabase.from('issues').select('*, tenants(first_name, last_name, email), apartments(apartment_number)').eq('id', id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['issue-history', id],
    queryFn: async () => {
      const { data } = await supabase.from('issue_status_history').select('*').eq('issue_id', id!).order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ['admin-issue-comments', id],
    queryFn: async () => {
      const { data } = await supabase.from('issue_comments').select('*').eq('issue_id', id!).order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!newStatus) return;
      const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issue-history', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] });
      toast.success('Status aktualisiert');
      setNewStatus('');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, isInternal }: { content: string; isInternal: boolean }) => {
      if (!user) return;
      const { error } = await supabase.from('issue_comments').insert({
        issue_id: id!,
        author_id: user.id,
        content,
        is_internal: isInternal,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-issue-comments', id] });
      setComment('');
      setInternalNote('');
      toast.success('Kommentar hinzugefügt');
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  if (!issue) return <div className="text-center py-12 text-muted-foreground">Meldung nicht gefunden.</div>;

  const status = getStatusInfo(issue.status);
  const priority = getPriorityInfo(issue.priority);
  const tenant = issue.tenants as any;
  const apt = issue.apartments as any;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Link to="/admin/issues" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Zurück zu Meldungen
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-mono">{issue.ticket_number}</span>
          <span className={`status-badge ${status.className}`}>{status.label}</span>
          <span className={`status-badge ${priority.className}`}>{priority.label}</span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{issue.title}</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground mb-1">Mieter</p><p className="text-sm font-medium">{tenant?.first_name} {tenant?.last_name}</p><p className="text-xs text-muted-foreground">{tenant?.email}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Apartment</p><p className="text-sm font-medium">{apt?.apartment_number}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Kategorie</p><p className="text-sm font-medium">{getCategoryLabel(issue.category)}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Erstellt</p><p className="text-sm font-medium">{format(new Date(issue.created_at), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr</p></div>
          </div>
          <Separator />
          <div><p className="text-xs text-muted-foreground mb-2">Beschreibung</p><p className="text-sm whitespace-pre-wrap">{issue.description}</p></div>
          {issue.photo_paths && issue.photo_paths.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Fotos ({issue.photo_paths.length})</p>
                <div className="flex flex-wrap gap-3">
                  {issue.photo_paths.map((path, i) => {
                    const { data } = supabase.storage.from('issue-photos').getPublicUrl(path);
                    return (
                      <a key={i} href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="w-24 h-24 rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors">
                        <img src={data.publicUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Change */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-base">Status ändern</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Neuer Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Status wählen" /></SelectTrigger>
                <SelectContent>{ISSUE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => statusMutation.mutate()} disabled={!newStatus || statusMutation.isPending}>Aktualisieren</Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Verlauf</CardTitle></CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {history.map((entry, i) => {
                const s = getStatusInfo(entry.new_status);
                return (
                  <div key={entry.id} className="relative">
                    <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-card ${i === history.length - 1 ? 'bg-primary' : 'bg-muted'}`} />
                    <p className="text-sm font-medium"><span className={`status-badge ${s.className}`}>{s.label}</span></p>
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), 'dd.MM.yyyy, HH:mm')} Uhr</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">Noch keine Statusänderungen.</p>}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Nachrichten</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {comments && comments.length > 0 && (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className={`p-3 rounded-lg ${c.is_internal ? 'bg-accent/30 border border-accent' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {c.is_internal && <span className="text-xs font-medium text-accent-foreground">Interne Notiz</span>}
                  </div>
                  <p className="text-sm">{c.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(c.created_at), 'dd.MM.yyyy, HH:mm')} Uhr</p>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Rückmeldung an Mieter</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Nachricht für den Mieter…" rows={2} />
              <Button size="sm" disabled={!comment || commentMutation.isPending} onClick={() => commentMutation.mutate({ content: comment, isInternal: false })}>
                <Send className="h-3 w-3 mr-1" /> Senden
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><StickyNote className="h-3 w-3" /> Interne Notiz</Label>
              <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Nur für Verwaltung sichtbar…" rows={2} />
              <Button size="sm" variant="outline" disabled={!internalNote || commentMutation.isPending} onClick={() => commentMutation.mutate({ content: internalNote, isInternal: true })}>
                <StickyNote className="h-3 w-3 mr-1" /> Notiz speichern
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
