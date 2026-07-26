import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/BrandLogo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="min-h-[100dvh] bg-luxe flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <BrandWordmark className="text-white block text-center mb-4" size="md" />
        <h1 className="font-display text-white text-xl text-center mb-4">Set a new password</h1>
        <Label htmlFor="pw" className="text-white/60 text-xs tracking-widest uppercase">New password</Label>
        <Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="mt-2 bg-white/5 text-white border-white/10" />
        <Button type="submit" disabled={loading} className="mt-4 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)]">Update password</Button>
      </form>
    </div>
  );
}
