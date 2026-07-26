import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { BrandMark, BrandWordmark } from "@/components/BrandLogo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  }

  async function google() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      setLoading(false);
      toast.error(res.error.message ?? "Google sign-in failed");
      return;
    }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-[100dvh] bg-luxe">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="h-14 w-14" />
          <BrandWordmark className="mt-4 text-white" size="lg" />
          <p className="mt-3 font-display italic text-[oklch(0.85_0.13_85)]">
            Where Fashion Meets Intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-luxe">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 text-white">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={signIn} className="space-y-4">
                <Field label="Email" id="si-email">
                  <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </Field>
                <Field label="Password" id="si-pass">
                  <Input id="si-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </Field>
                <SubmitButton loading={loading}>Sign in</SubmitButton>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={signUp} className="space-y-4">
                <Field label="Full name" id="su-name">
                  <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </Field>
                <Field label="Email" id="su-email">
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </Field>
                <Field label="Password" id="su-pass">
                  <Input id="su-pass" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </Field>
                <SubmitButton loading={loading}>Create atelier account</SubmitButton>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-white/40">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] tracking-[0.3em] uppercase">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={google}
            disabled={loading}
            className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <GoogleIcon /> Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.3em] uppercase text-white/30">
          ORIVEX · Couture Intelligence
        </p>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] tracking-[0.2em] uppercase text-white/60">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={loading} className="w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold font-medium">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c6.9 0 9.5-4.8 9.5-8.6 0-.6-.1-1-.1-1.4H12z"/>
    </svg>
  );
}
