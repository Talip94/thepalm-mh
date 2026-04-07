import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ISSUE_STATUSES, ISSUE_CATEGORIES, PRIORITIES, getStatusInfo, getPriorityInfo, getCategoryLabel } from '@/lib/constants';
import { AlertTriangle, ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ARCHIVED_STATUSES = ['resolved', 'closed'];

export default function AdminIssues() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const { data: issues, isLoading } = useQuery({
    queryKey: ['admin-issues'],
    queryFn: async () => {
      const { data } = await supabase.from('issues')
        .select('*, tenants(first_name, last_name), apartments(apartment_number)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const filtered = (issues ?? []).filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
    return true;
  });

  const activeIssues = filtered.filter(i => !ARCHIVED_STATUSES.includes(i.status));
  const archivedIssues = filtered.filter(i => ARCHIVED_STATUSES.includes(i.status));

  const renderIssueCard = (issue: any) => {
    const status = getStatusInfo(issue.status);
    const priority = getPriorityInfo(issue.priority);
    const tenant = issue.tenants as any;
    const apt = issue.apartments as any;
    return (
      <Link key={issue.id} to={`/admin/issues/${issue.id}`}>
        <Card className="hover:border-primary/20 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">{issue.ticket_number}</span>
                  <span className={`status-badge ${priority.className}`}>{priority.label}</span>
                </div>
                <p className="text-sm font-medium truncate">{issue.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {apt?.apartment_number} · {tenant?.first_name} {tenant?.last_name} · {getCategoryLabel(issue.category)} · {format(new Date(issue.created_at), 'dd.MM.yyyy')}
                </p>
              </div>
              <span className={`status-badge ${status.className} flex-shrink-0`}>{status.label}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Schadenmeldungen</h1>
        <p className="text-muted-foreground text-sm mt-1">{activeIssues.length} offen{archivedIssues.length > 0 && ` · ${archivedIssues.length} archiviert`}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {ISSUE_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {ISSUE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priorität" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritäten</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : activeIssues.length === 0 && archivedIssues.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-sm">Keine Meldungen gefunden.</p></CardContent></Card>
      ) : (
        <>
          {activeIssues.length === 0 && archivedIssues.length > 0 ? (
            <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground text-sm">Keine offenen Meldungen.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {activeIssues.map(renderIssueCard)}
            </div>
          )}

          {archivedIssues.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                  {showArchived ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Archive className="h-4 w-4" />
                  Archivierte Meldungen ({archivedIssues.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {archivedIssues.map(renderIssueCard)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
