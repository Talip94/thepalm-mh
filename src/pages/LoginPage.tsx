import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import thePalmLogo from '@/assets/the-palm-logo.png';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Anmeldung fehlgeschlagen', { description: error.message });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error('Fehler', { description: error.message });
    } else {
      toast.success('E-Mail gesendet', { description: 'Prüfen Sie Ihr Postfach für den Zurücksetzungslink.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <img src={thePalmLogo} alt="The Palm – Studio Apartments" className="h-24 mb-4" />
          <p className="text-muted-foreground text-sm">Portal</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg">
              {mode === 'login' ? 'Anmelden' : 'Passwort zurücksetzen'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Melden Sie sich mit Ihren Zugangsdaten an.'
                : 'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Wird geladen…' : mode === 'login' ? 'Anmelden' : 'Link senden'}
              </Button>

              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Passwort vergessen?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Zurück zur Anmeldung
                </button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
