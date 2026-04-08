

# Sicherheitsanalyse – The Palm Portal

Der Scan hat **6 Sicherheitsrisiken** identifiziert, davon **3 kritische (Error)** und **3 Warnungen**.

---

## Kritische Risiken (sofort beheben)

### 1. Klartext-Passwörter in der Datenbank
Die Spalte `initial_password` in der `tenants`-Tabelle speichert Passwörter im Klartext. Mieter können ihr eigenes Passwort über die RLS-Policy lesen – und Admins sehen alle Passwörter.

**Lösung:** Spalte `initial_password` entfernen. Stattdessen Passwörter nur einmalig bei Erstellung im Dialog anzeigen (nicht in der DB speichern). Alternativ: Einladungs-Links per E-Mail nutzen.

### 2. Alle Mieter können alle Dokumente herunterladen
Die Storage-Policy für den `documents`-Bucket prüft nur `auth.uid() IS NOT NULL`. Jeder eingeloggte Mieter kann auf Dokumente anderer Mieter zugreifen.

**Lösung:** Storage-Policy so einschränken, dass der Dateipfad gegen die `documents`-Tabelle geprüft wird und nur eigene Dokumente zugänglich sind.

### 3. Alle Mieter können alle Schadensmeldungs-Fotos sehen
Gleiche Situation beim `issue-photos`-Bucket – jeder eingeloggte Nutzer kann alle Fotos sehen.

**Lösung:** Storage-Policy so anpassen, dass nur Fotos der eigenen Schadensmeldungen zugänglich sind.

---

## Warnungen (sollten behoben werden)

### 4. Unkontrollierter Upload von Issue-Fotos
Jeder Mieter kann Fotos in beliebige Pfade im `issue-photos`-Bucket hochladen und potenziell fremde Fotos überschreiben.

**Lösung:** Upload-Pfade auf eigene Issue-IDs einschränken.

### 5. Dokument-Dateizugriff nicht auf eigene Dokumente beschränkt
Die Storage-Policy `Tenants view document files` prüft nur den aktiven Status, nicht ob die Datei dem Mieter gehört.

**Lösung:** Join auf `documents`-Tabelle über `file_path` hinzufügen.

### 6. Leaked Password Protection deaktiviert
Nutzer können kompromittierte Passwörter verwenden (aus bekannten Datenlecks).

**Lösung:** HIBP-Check in den Auth-Einstellungen aktivieren.

---

## Umsetzungsplan

| Schritt | Was | Wie |
|---------|-----|-----|
| 1 | Passwort-Spalte entfernen | DB-Migration: `ALTER TABLE tenants DROP COLUMN initial_password`. Edge Function + AdminTenants.tsx anpassen – Passwort nur im Dialog anzeigen, nicht speichern. |
| 2 | Storage-Policy `documents` fixen | Bestehende SELECT-Policy ersetzen: Join auf `documents`-Tabelle, um Dateipfad gegen tenant_id/apartment_id zu prüfen. |
| 3 | Storage-Policy `issue-photos` fixen | SELECT-Policy ersetzen: Pfad-Prefix gegen eigene Issue-IDs validieren. |
| 4 | Upload-Policy `issue-photos` fixen | INSERT-Policy einschränken: Nur Upload in Pfade eigener Issues erlauben. |
| 5 | HIBP-Check aktivieren | Über `configure_auth`-Tool den Passwort-Leak-Schutz einschalten. |
| 6 | Code anpassen | `initial_password`-Referenzen aus Edge Function und AdminTenants.tsx entfernen. |

---

## Hinweis

Die Datenbank-Tabellen selbst haben korrekte RLS-Policies. Das Hauptproblem liegt bei den **Storage-Bucket-Policies** und der **Klartext-Passwortspeicherung**. Die Behebung erfordert ca. 3–4 Migrationen und Anpassungen an 2 Dateien.

