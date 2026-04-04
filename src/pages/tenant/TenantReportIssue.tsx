import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ISSUE_CATEGORIES, PRIORITIES } from '@/lib/constants';
import { AlertTriangle, Send, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function TenantReportIssue() {
  const { tenantInfo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [form, setForm] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantInfo) return;

    setLoading(true);
    try {
      // Upload photos first
      const photoPaths: string[] = [];
      for (const photo of photos) {
        const filePath = `${tenantInfo.apartment_id}/${Date.now()}_${photo.name}`;
        const { error: uploadError } = await supabase.storage.from('issue-photos').upload(filePath, photo);
        if (uploadError) throw uploadError;
        photoPaths.push(filePath);
      }

      const { error } = await supabase.from('issues').insert({
        apartment_id: tenantInfo.apartment_id,
        tenant_id: tenantInfo.tenant_id,
        category: form.category,
        title: form.title,
        description: form.description,
        priority: form.priority,
        photo_paths: photoPaths.length > 0 ? photoPaths : null,
      });

      if (error) throw error;

      toast.success('Meldung erstellt', { description: 'Ihre Schadenmeldung wurde erfolgreich übermittelt.' });
      navigate('/tenant/issues');
    } catch (error: any) {
      toast.error('Fehler beim Erstellen', { description: error.message });
    }
    setLoading(false);
  };

  if (!tenantInfo) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Schaden melden</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Beschreiben Sie den Schaden oder Ihr Anliegen. Wir kümmern uns schnellstmöglich darum.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Neue Meldung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kategorie wählen" /></SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                placeholder="Kurze Beschreibung des Problems"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Beschreibung *</Label>
              <Textarea
                placeholder="Beschreiben Sie das Problem möglichst genau…"
                rows={5}
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Fotos (optional, max. 5)</Label>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Apartment:</strong> {tenantInfo.apartment_number} {tenantInfo.apartment_name && `– ${tenantInfo.apartment_name}`}</p>
            </div>

            <Button type="submit" disabled={loading || !form.category || !form.title || !form.description} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Wird gesendet…' : 'Meldung absenden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
