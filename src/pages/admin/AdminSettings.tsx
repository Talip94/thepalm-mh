import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">Systemkonfiguration und Verwaltung</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Allgemein
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Weitere Einstellungen wie Dokumentkategorien, Statusverwaltung und Benachrichtigungen können hier konfiguriert werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
