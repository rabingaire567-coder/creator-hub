import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { AlertTriangle, Palette, Search, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader, runAction } from "@/admin/shared";

type AccentKey = "accent1" | "accent2" | "accent3" | "accent4" | "accent5" | "accentText";

const ACCENT_LABELS: Array<{ key: AccentKey; label: string }> = [
  { key: "accent1", label: "Ember (primary)" },
  { key: "accent2", label: "Gold" },
  { key: "accent3", label: "Clay" },
  { key: "accent4", label: "Sage" },
  { key: "accent5", label: "Dusk" },
  { key: "accentText", label: "Text on accents" },
];

function SettingsForm({
  settings,
}: {
  settings: {
    title: string;
    tagline: string;
    description: string;
    logoName?: string;
    footerText: string;
    siteUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    favicon?: string;
    canonicalBase?: string;
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
    accent5: string;
    accentText: string;
    theme?: string;
    adminEmail?: string;
  };
}) {
  const upsert = useMutation(api.site.upsertSiteSettings);

  const [identity, setIdentity] = useState({
    title: settings.title,
    tagline: settings.tagline,
    description: settings.description,
    logoName: settings.logoName ?? "",
    footerText: settings.footerText,
    siteUrl: settings.siteUrl ?? "",
  });
  const [seo, setSeo] = useState({
    metaTitle: settings.metaTitle ?? "",
    metaDescription: settings.metaDescription ?? "",
    ogImage: settings.ogImage ?? "",
    favicon: settings.favicon ?? "",
    canonicalBase: settings.canonicalBase ?? "",
  });
  const [accents, setAccents] = useState<Record<AccentKey, string>>({
    accent1: settings.accent1,
    accent2: settings.accent2,
    accent3: settings.accent3,
    accent4: settings.accent4,
    accent5: settings.accent5,
    accentText: settings.accentText,
  });
  const [theme, setTheme] = useState(settings.theme ?? "dark");
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail ?? "");
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (key: string, patch: Record<string, unknown>, message: string) => {
    setSaving(key);
    const ok = await runAction(() => upsert({ patch }), message, toast);
    setSaving(null);
    return ok;
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Identity</CardTitle>
          <p className="text-xs text-muted-foreground">
            Site name, tagline and footer shown across the public site.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Site title</Label>
              <Input
                value={identity.title}
                onChange={(e) =>
                  setIdentity({ ...identity, title: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Tagline</Label>
              <Input
                value={identity.tagline}
                onChange={(e) =>
                  setIdentity({ ...identity, tagline: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Meta description / about the site
            </Label>
            <Textarea
              rows={3}
              value={identity.description}
              onChange={(e) =>
                setIdentity({ ...identity, description: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Logo name (optional)
              </Label>
              <Input
                value={identity.logoName}
                onChange={(e) =>
                  setIdentity({ ...identity, logoName: e.target.value })
                }
                placeholder="Defaults to site title"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Site URL</Label>
              <Input
                value={identity.siteUrl}
                onChange={(e) =>
                  setIdentity({ ...identity, siteUrl: e.target.value })
                }
                placeholder="https://rabingaire.com"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Footer text</Label>
            <Input
              value={identity.footerText}
              onChange={(e) =>
                setIdentity({ ...identity, footerText: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving === "identity"}
              onClick={() =>
                save("identity", identity, "Identity updated.")
              }
            >
              {saving === "identity" ? "Saving…" : "Save identity"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Search className="size-4 text-ember" />
            SEO & sharing
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Defaults for search results and social previews.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Meta title (falls back to site title)
            </Label>
            <Input
              value={seo.metaTitle}
              onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Meta description
            </Label>
            <Textarea
              rows={2}
              value={seo.metaDescription}
              onChange={(e) =>
                setSeo({ ...seo, metaDescription: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Social share image (og:image)
              </Label>
              <Input
                value={seo.ogImage}
                onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Favicon</Label>
              <Input
                value={seo.favicon}
                onChange={(e) => setSeo({ ...seo, favicon: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Canonical base URL
            </Label>
            <Input
              value={seo.canonicalBase}
              onChange={(e) =>
                setSeo({ ...seo, canonicalBase: e.target.value })
              }
              placeholder="https://rabingaire.com"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving === "seo"}
              onClick={() => save("seo", seo, "SEO settings updated.")}
            >
              {saving === "seo" ? "Saving…" : "Save SEO"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Palette className="size-4 text-gold" />
            Appearance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            The warm palette used by every screen. Changes apply instantly
            across site and studio.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {ACCENT_LABELS.map(({ key, label }) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accents[key]}
                    onChange={(e) =>
                      setAccents({ ...accents, [key]: e.target.value })
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={accents[key]}
                    onChange={(e) =>
                      setAccents({ ...accents, [key]: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label className="text-xs text-muted-foreground">
              Default theme
            </Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark (warm night)</SelectItem>
                <SelectItem value="light">Light (warm paper)</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving === "appearance"}
              onClick={() =>
                save(
                  "appearance",
                  { ...accents, theme },
                  "Appearance updated.",
                )
              }
            >
              {saving === "appearance" ? "Saving…" : "Save appearance"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Access */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShieldCheck className="size-4 text-sage" />
            Owner access
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Only the account with this email can run admin actions once it is
            set.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings.adminEmail && (
            <div className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Bootstrap window open: any signed-in account can currently make
                changes. Set your email to lock the studio to yourself.
              </span>
            </div>
          )}
          <div className="grid gap-1.5 sm:max-w-md">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              Admin email
            </Label>
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty only while bootstrapping — an empty value re-opens
              write access to any signed-in user.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving === "access"}
              onClick={() =>
                save(
                  "access",
                  { adminEmail: adminEmail.trim() },
                  "Owner access updated.",
                )
              }
            >
              {saving === "access" ? "Saving…" : "Save access"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Admin screen for identity, SEO, palette and owner access. */
export default function AdminSettings() {
  const settings = useQuery(api.site.getSiteSettings);

  if (settings === undefined) {
    return (
      <div>
        <AdminPageHeader title="Settings" description="Loading…" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="Site identity, search metadata, the warm palette and owner access."
      />
      <SettingsForm key="settings" settings={settings} />
    </div>
  );
}
