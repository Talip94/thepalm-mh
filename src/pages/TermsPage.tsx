import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Button>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Nutzungsbedingungen</h1>
        <p className="text-muted-foreground text-sm mb-8">The Palm Studio Apartments – Mieterportal</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="font-heading text-lg font-semibold">1. Geltungsbereich</h2>
            <p>Diese Nutzungsbedingungen regeln die Nutzung des Mieterportals von The Palm Studio Apartments. Mit der Nutzung des Portals erklären Sie sich mit diesen Bedingungen einverstanden.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">2. Zugangsberechtigung</h2>
            <p>Der Zugang zum Portal wird ausschließlich an aktive Mieter von The Palm Studio Apartments vergeben. Die Zugangsdaten (E-Mail und Passwort) werden vom Vermieter erstellt und per E-Mail an den Mieter übermittelt. Die Zugangsdaten sind persönlich und dürfen nicht an Dritte weitergegeben werden.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">3. Nutzungsumfang</h2>
            <p>Das Portal dient ausschließlich folgenden Zwecken:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Einsicht in mietvertragsbezogene Dokumente</li>
              <li>Meldung von Schäden und Mängeln am Mietobjekt</li>
              <li>Kommunikation mit dem Vermieter über das Ticketsystem</li>
              <li>Verwaltung der eigenen Profildaten</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">4. Pflichten des Nutzers</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Zugangsdaten sind vertraulich zu behandeln und vor unbefugtem Zugriff zu schützen</li>
              <li>Schadensmeldungen sind wahrheitsgemäß und vollständig einzureichen</li>
              <li>Das Portal darf nicht für rechtswidrige oder missbräuchliche Zwecke genutzt werden</li>
              <li>Hochgeladene Inhalte dürfen keine Rechte Dritter verletzen</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">5. Zugangsende</h2>
            <p>Der Zugang zum Portal wird bei Beendigung des Mietverhältnisses durch den Vermieter deaktiviert. Gespeicherte Daten werden gemäß den gesetzlichen Aufbewahrungsfristen behandelt.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">6. Haftung</h2>
            <p>Der Vermieter haftet nicht für die ständige Verfügbarkeit des Portals und übernimmt keine Haftung für Datenverluste, die nicht durch den Vermieter verursacht wurden. Der Vermieter behält sich das Recht vor, den Dienst jederzeit zu ändern oder einzustellen.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">7. Änderungen der Nutzungsbedingungen</h2>
            <p>Der Vermieter behält sich vor, diese Nutzungsbedingungen jederzeit zu ändern. Änderungen werden den Mietern über das Portal oder per E-Mail mitgeteilt.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">8. Zustimmung</h2>
            <p>Mit der erstmaligen Nutzung des Portals und Ihrer Zugangsdaten stimmen Sie diesen Nutzungsbedingungen sowie der Datenschutzerklärung zu.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
