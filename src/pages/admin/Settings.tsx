import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Loader2, 
  MapPin, 
  UserCheck, 
  ShieldCheck 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    id: 1,
    rt_name: "",
    rt_register: "",
    address: "",
    cep: "",
    phone: "",
    whatsapp: "",
    google_maps_url: "",
    cnpj: "",
    alvara: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        toast({ title: "Erro ao carregar configurações", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(settings);
      
      if (error) throw error;
      
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({ title: "Erro ao salvar", description: "Ocorreu um problema ao salvar os dados.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light">Configurações Globais</h1>
          <p className="text-sm text-brand-text-muted mt-1">Dados da clínica usados em rodapés e blocos institucionais.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="bg-brand-graphite/30 border-brand-gold/15">
          <CardHeader>
            <CardTitle className="text-brand-text-light flex items-center gap-2">
              <UserCheck className="size-5 text-brand-gold" /> Responsável Técnica
            </CardTitle>
            <CardDescription>Informações legais da profissional responsável.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Nome Completo</Label>
              <Input 
                value={settings.rt_name || ""} 
                onChange={e => setSettings({...settings, rt_name: e.target.value})}
                className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Registro Profissional (Ex: CRM/CRBM)</Label>
              <Input 
                value={settings.rt_register || ""} 
                onChange={e => setSettings({...settings, rt_register: e.target.value})}
                className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-graphite/30 border-brand-gold/15">
          <CardHeader>
            <CardTitle className="text-brand-text-light flex items-center gap-2">
              <MapPin className="size-5 text-brand-gold" /> Localização e Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Endereço Completo</Label>
              <Input 
                value={settings.address || ""} 
                onChange={e => setSettings({...settings, address: e.target.value})}
                className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">CEP</Label>
                <Input 
                  value={settings.cep || ""} 
                  onChange={e => setSettings({...settings, cep: e.target.value})}
                  className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Google Maps URL</Label>
                <Input 
                  value={settings.google_maps_url || ""} 
                  onChange={e => setSettings({...settings, google_maps_url: e.target.value})}
                  placeholder="https://maps.google.com/..."
                  className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Telefone</Label>
                <Input 
                  value={settings.phone || ""} 
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">WhatsApp (Link Completo)</Label>
                <Input 
                  value={settings.whatsapp || ""} 
                  onChange={e => setSettings({...settings, whatsapp: e.target.value})}
                  placeholder="https://wa.me/55..."
                  className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-graphite/30 border-brand-gold/15">
          <CardHeader>
            <CardTitle className="text-brand-text-light flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand-gold" /> Dados Jurídicos e Alvarás
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-brand-text-muted">CNPJ</Label>
              <Input 
                value={settings.cnpj || ""} 
                onChange={e => setSettings({...settings, cnpj: e.target.value})}
                className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Texto do Alvará</Label>
              <Input 
                value={settings.alvara || ""} 
                onChange={e => setSettings({...settings, alvara: e.target.value})}
                className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
