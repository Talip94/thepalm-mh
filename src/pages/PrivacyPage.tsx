import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Button>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Datenschutzerklärung</h1>
        <p className="text-muted-foreground text-sm mb-8">The Palm Studio Apartments – Mieterportal</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="font-heading text-lg font-semibold">1. Verantwortlicher</h2>
            <p>The Palm Studio Apartments<br />Leineweberstraße 65<br />45468 Mülheim an der Ruhr<br />E-Mail: info@thepalm-mh.de</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p>Im Rahmen der Nutzung dieses Mieterportals werden folgende personenbezogene Daten erhoben und verarbeitet:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vor- und Nachname</li>
              <li>E-Mail-Adresse</li>
              <li>Telefonnummer (optional)</li>
              <li>Mietvertragsdaten (Apartment-Zuordnung, Mietbeginn/-ende)</li>
              <li>Hochgeladene Dokumente (z.B. Mietverträge, Übergabeprotokolle)</li>
              <li>Schadensmeldungen inkl. Fotos und Beschreibungen</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">3. Zweck der Datenverarbeitung</h2>
            <p>Die Daten werden ausschließlich zum Zweck der Verwaltung des Mietverhältnisses, der Kommunikation zwischen Mieter und Vermieter sowie zur Abwicklung von Schadensmeldungen und Dokumentenverwaltung verarbeitet.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">4. Rechtsgrundlage</h2>
            <p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines Vertrags) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an effizienter Mietverwaltung).</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">5. Datenspeicherung und -sicherheit</h2>
            <p>Ihre Daten werden auf sicheren Servern gespeichert und durch Verschlüsselung geschützt. Der Zugang zum Portal ist durch persönliche Zugangsdaten (E-Mail und Passwort) geschützt. Zugangsdaten werden Ihnen vom Vermieter bereitgestellt.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">6. Datenweitergabe</h2>
            <p>Eine Weitergabe Ihrer Daten an Dritte erfolgt nicht, es sei denn, dies ist zur Erfüllung vertraglicher Pflichten erforderlich (z.B. Handwerksbetriebe bei Schadensmeldungen) oder gesetzlich vorgeschrieben.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">7. Ihre Rechte</h2>
            <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten. Wenden Sie sich hierzu an info@thepalm-mh.de.</p>
          </section>

          <section>
            <h2 className="font-heading text-lg font-semibold">8. Zugangsdaten</h2>
            <p>Bei Anlage Ihres Mieterkontos erhalten Sie Zugangsdaten (E-Mail-Adresse und Passwort) per E-Mail. Bitte ändern Sie Ihr Passwort bei der ersten Anmeldung. Mit der Nutzung des Portals stimmen Sie diesen Datenschutzbestimmungen zu.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
