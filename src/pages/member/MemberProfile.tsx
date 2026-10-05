import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "@/components/site/Reveal";
import { formatDate } from "@/lib/format";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 400 * 1024;
const MAX_DIMENSION = 640;

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/** Re-encodes a picked photo as a small JPEG data URL (fits a Convex doc). */
async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing is not supported in this browser.");
    for (let pass = 0; pass < 3; pass++) {
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.85, 0.7, 0.55, 0.45]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrlByteLength(dataUrl) <= MAX_PHOTO_BYTES) return dataUrl;
      }
      width = Math.max(1, Math.round(width * 0.6));
      height = Math.max(1, Math.round(height * 0.6));
    }
    throw new Error("Couldn't compress that image — try a smaller picture.");
  } finally {
    bitmap.close();
  }
}

function initials(name?: string) {
  return (
    (name ?? "M")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "M"
  );
}

/** Profile editor — display name, picture and a short bio. Nothing else. */
export default function MemberProfile() {
  const profile = useQuery(api.members.getMyProfile);
  const updateProfile = useMutation(api.members.updateMyProfile);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const loadedRef = useRef(false);

  // Sync server state into the form once (and whenever the profile arrives).
  useEffect(() => {
    if (!profile || loadedRef.current) return;
    loadedRef.current = true;
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setPhoto(profile.photo);
  }, [profile]);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Only JPG, PNG and WebP are allowed.");
      return;
    }
    setUploading(true);
    try {
      setPhoto(await fileToPhotoDataUrl(file));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read that image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photo: photo ?? "",
      });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Reveal>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How you appear to the creator. Only a display name, picture and a
            short bio — nothing more is collected.
          </p>
        </div>

        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Your details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo + name */}
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Change profile picture"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-gradient-to-br from-ember to-clay font-display text-xl font-bold text-white">
                    {initials(displayName || profile?.displayName)}
                  </span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {uploading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onPickPhoto}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="size-4" />
                  {photo ? "Change photo" : "Upload photo"}
                </Button>
                {photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setPhoto(undefined)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="mp-name">Display name</Label>
                <Input
                  id="mp-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={48}
                  placeholder="How should the creator address you?"
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.length}/48
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mp-email">Email</Label>
                <Input
                  id="mp-email"
                  value={profile?.email ?? ""}
                  readOnly
                  className="opacity-70"
                />
                <p className="text-xs text-muted-foreground">
                  Your sign-in email — can't be edited here.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mp-bio">Short bio</Label>
              <Textarea
                id="mp-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={240}
                placeholder="A line or two about you (optional)."
              />
              <p className="text-xs text-muted-foreground">{bio.length}/240</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {profile?.createdAt ? (
                <span className="text-xs text-muted-foreground">
                  Member since {formatDate(profile.createdAt)}
                </span>
              ) : (
                <span />
              )}
              <Button
                onClick={() => void onSave()}
                disabled={saving}
                className="rounded-full bg-ember text-white hover:brightness-110"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Reveal>
  );
}
