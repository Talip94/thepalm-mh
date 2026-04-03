import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail } from 'lucide-react';

export default function TenantProfile() {
  const { user, tenantInfo } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Mein Profil</h1>
        <p className="text-muted-foreground text-sm mt-1">Ihre persönlichen Informationen</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Persönliche Daten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vorname</p>
                <p className="text-sm font-medium">{tenantInfo.first_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nachname</p>
                <p className="text-sm font-medium">{tenantInfo.last_name}</p>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> E-Mail</p>
            <p className="text-sm font-medium">{user?.email}</p>
          </div>
          {tenantInfo && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Apartment</p>
              <p className="text-sm font-medium">{tenantInfo.apartment_number} {tenantInfo.apartment_name && `– ${tenantInfo.apartment_name}`}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
