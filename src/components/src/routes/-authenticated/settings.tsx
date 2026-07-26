import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Moon, Bell, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const user = Route.useRouteContext().user;
  const nav = useNavigate();
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState("en");
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setLang(localStorage.getItem("orivex-lang") ?? "en");
    setNotif(localStorage.getItem("orivex-notif") !== "0");
  }, []);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("orivex-theme", v ? "dark" : "light");
  }
  function changeLang(v: string) {
    setLang(v);
    localStorage.setItem("orivex-lang", v);
    toast.success("Preference saved");
  }
  function toggleNotif(v: boolean) {
    setNotif(v);
    localStorage.setItem("orivex-notif", v ? "1" : "0");
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <AppShell subtitle="House" title="Settings">
      <Card className="border-border bg-card p-5 mb-4">
        <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Account</p>
        <p className="font-display mt-2 text-xl">{user.user_metadata?.full_name ?? user.email}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </Card>

      <div className="space-y-3">
        <Row icon={Moon} title="Dark Mode" desc="Deep navy atelier">
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </Row>
        <Row icon={Globe} title="Language" desc="Interface language">
          <Select value={lang} onValueChange={changeLang}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row icon={Bell} title="Notifications" desc="New concepts & tips">
          <Switch checked={notif} onCheckedChange={toggleNotif} />
        </Row>
      </div>

      <Button
        onClick={signOut}
        variant="outline"
        className="mt-8 w-full border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>

      <p className="mt-8 text-center text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
        ORIVEX · Where Fashion Meets Intelligence
      </p>
    </AppShell>
  );
}

function Row({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card p-4 flex items-center gap-4">
      <div className="rounded-full bg-muted p-2">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="flex-1">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </Card>
  );
}
