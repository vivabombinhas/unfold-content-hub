import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Falha no login", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/admin");
  }

  return (
    <div className="min-h-screen bg-brand-black grid place-items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-brand-graphite/40 border border-brand-gold/20 p-8 rounded-sm space-y-5"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold">Painel privado</p>
          <h1 className="font-display text-2xl text-brand-text-light mt-2">Entrar</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-brand-text-soft">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-brand-black border-brand-gold/30" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-brand-text-soft">Senha</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-brand-black border-brand-gold/30" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-brand-gold text-brand-green hover:bg-brand-gold/90">
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
        <p className="text-[11px] text-brand-text-muted text-center">
          Acesso restrito. Crie seu usuário admin no painel da Lovable Cloud.
        </p>
      </form>
    </div>
  );
}