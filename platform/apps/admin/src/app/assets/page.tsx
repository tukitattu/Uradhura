"use client";

import { useState } from "react";
import {
  useAssets,
  useAssetCatalogOptions,
  useCreateAsset,
  useUpdateAsset,
  useUploadAssetFile,
  useAssetAction,
  useBulkAssetAction,
  useDeleteAsset,
  type AssetAction,
} from "@/hooks/use-assets";
import type { Asset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ImageIcon,
  Plus,
  Upload,
  Archive,
  RefreshCcw,
  Pencil,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Link2,
  X,
} from "lucide-react";

const STATUS_STYLE: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  published: "success",
  draft: "secondary",
  disabled: "warning",
  archived: "destructive",
};

function isoToLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<AssetAction | "">("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [replaceAsset, setReplaceAsset] = useState<Asset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useAssets({
    page,
    limit: 25,
    category: category || undefined,
    status: status || undefined,
    search: search || undefined,
  });
  const { data: catalog } = useAssetCatalogOptions();

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const uploadFile = useUploadAssetFile();
  const assetAction = useAssetAction();
  const bulkActionMutation = useBulkAssetAction();
  const deleteMutation = useDeleteAsset();

  const assets = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const applySearch = () => {
    setSearch(draftSearch);
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = () => {
    if (!bulkAction || selected.size === 0) return;
    bulkActionMutation.mutate(
      { ids: Array.from(selected), action: bulkAction },
      {
        onSuccess: () => {
          setSelected(new Set());
          setBulkAction("");
          setMessage(`Applied "${bulkAction}" to selected assets`);
        },
      }
    );
  };

  const badgeFor = (a: Asset) => (
    <Badge variant={STATUS_STYLE[a.status] ?? "default"}>
      {a.status}
      {a.status === "published" && !a.isEnabled && " (off)"}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Registry</h1>
          <p className="text-sm text-muted-foreground">
            Bundled artwork + remotely publishable updates. Replacing a published file bumps its version &mdash; the
            player APK picks it up without a store release.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Asset
        </Button>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {message}
          <button onClick={() => setMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search key / name..."
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-64 pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(catalog?.categories ?? []).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(catalog?.statuses ?? []).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as AssetAction)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Bulk action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="enable">Enable</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                  <SelectItem value="draft">Move to draft</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={runBulk} disabled={!bulkAction || bulkActionMutation.isPending}>
                {bulkActionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-14">Preview</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-24">Version</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24">Visibility</TableHead>
              <TableHead className="w-20">Target</TableHead>
              <TableHead className="w-40">Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No assets match the current filters
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  </TableCell>
                  <TableCell>
                    {a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.key}
                        className="h-10 w-10 rounded-md border bg-background p-0.5 object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{a.key}</span>
                      {a.isBundled && (
                        <Badge variant="outline" className="text-[10px]">bundle</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{a.category}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    v{a.version}
                    {a.format ? ` · ${a.format}` : ""}
                  </TableCell>
                  <TableCell>{badgeFor(a)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.visibility}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{a.target ?? "global"}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(a.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {a.url && (
                        <Button variant="ghost" size="icon" title="Preview" onClick={() => setPreviewAsset(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {a.status === "draft" && (
                        <Button variant="ghost" size="icon" title="Publish" onClick={() => assetAction.mutate({ id: a.id, action: "publish" })}>
                          <Globe className="h-4 w-4 text-green-400" />
                        </Button>
                      )}
                      {a.status === "published" &&
                        (a.isEnabled ? (
                          <Button variant="ghost" size="icon" title="Disable" onClick={() => assetAction.mutate({ id: a.id, action: "disable" })}>
                            <X className="h-4 w-4 text-yellow-400" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" title="Enable" onClick={() => assetAction.mutate({ id: a.id, action: "enable" })}>
                            <Globe className="h-4 w-4 text-green-400" />
                          </Button>
                        ))}
                      {a.status !== "archived" && (
                        <Button variant="ghost" size="icon" title="Archive" onClick={() => assetAction.mutate({ id: a.id, action: "archive" })}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {a.status === "archived" && (
                        <Button variant="ghost" size="icon" title="Restore" onClick={() => assetAction.mutate({ id: a.id, action: "restore" })}>
                          <RefreshCcw className="h-4 w-4 text-cyan-400" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Replace file" onClick={() => setReplaceAsset(a)}>
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit metadata" onClick={() => setEditAsset(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {a.status === "archived" && (
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteAsset(a)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {isFetching && " · syncing..."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Asset</DialogTitle>
            <DialogDescription>
              Create a metadata record (draft). Upload its file afterwards; publish when ready.
            </DialogDescription>
          </DialogHeader>
          <CreateForm
            catalog={catalog?.categories ?? []}
            targets={catalog?.targets ?? []}
            formats={catalog?.formats ?? []}
            busy={createAsset.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (values) => {
              try {
                await createAsset.mutateAsync(values);
                setCreateOpen(false);
                setMessage(`Created asset "${values.key}"`);
              } catch {
                setMessage("Failed to create asset — check key uniqueness and fields");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={!!editAsset} onOpenChange={(o) => !o && setEditAsset(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit asset</DialogTitle>
            <DialogDescription className="font-mono text-xs">{editAsset?.key}</DialogDescription>
          </DialogHeader>
          {editAsset && (
            <EditForm
              asset={editAsset}
              catalog={catalog?.categories ?? []}
              targets={catalog?.targets ?? []}
              busy={updateAsset.isPending}
              onCancel={() => setEditAsset(null)}
              onSubmit={async (values) => {
                try {
                  await updateAsset.mutateAsync({ id: editAsset.id, ...values });
                  setEditAsset(null);
                  setMessage(`Updated ${editAsset.key}`);
                } catch {
                  setMessage("Failed to update asset");
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* REPLACE FILE */}
      <Dialog open={!!replaceAsset} onOpenChange={(o) => !o && setReplaceAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace asset file</DialogTitle>
            <DialogDescription>
              {replaceAsset?.key} is currently v{replaceAsset?.version}.
              {replaceAsset?.status === "published"
                ? " Publishing a new file bumps the version — clients update without an APK release."
                : " The new file replaces the current one for this record."}
            </DialogDescription>
          </DialogHeader>
          {replaceAsset && (
            <ReplaceForm
              asset={replaceAsset}
              busy={uploadFile.isPending}
              onCancel={() => setReplaceAsset(null)}
              onFile={(file) => {
                uploadFile.mutate(
                  { id: replaceAsset.id, file },
                  {
                    onSuccess: () => {
                      setReplaceAsset(null);
                      setMessage(`Replaced ${replaceAsset.key} (now v${replaceAsset.version + (file ? 1 : 0)})`);
                    },
                    onError: () => setMessage("Upload failed — check format and size limits"),
                  }
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PREVIEW */}
      <Dialog open={!!previewAsset} onOpenChange={(o) => !o && setPreviewAsset(null)}>
        <DialogContent className="w-fit min-w-[320px] max-w-[80vw]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{previewAsset?.key}</DialogTitle>
            <DialogDescription>
              {previewAsset?.name} · v{previewAsset?.version}
              {previewAsset?.width && previewAsset?.height
                ? ` · ${previewAsset.width}×${previewAsset.height}px`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {previewAsset?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewAsset.url}
              alt={previewAsset.key}
              className="mx-auto max-h-[60vh] object-contain"
            />
          )}
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={previewAsset?.url ?? "#"} target="_blank" rel="noreferrer">
                <Link2 className="mr-2 h-4 w-4" /> Open full URL
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={!!deleteAsset} onOpenChange={(o) => !o && setDeleteAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset?</DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-mono">{deleteAsset?.key}</span> and its file. This cannot be
              undone. Manifest-serving clients will drop it immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAsset(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate(deleteAsset!.id, {
                  onSuccess: () => {
                    setDeleteAsset(null);
                    setMessage(`Deleted ${deleteAsset!.key}`);
                  },
                });
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateForm({
  catalog,
  targets,
  formats,
  busy,
  onCancel,
  onSubmit,
}: {
  catalog: string[];
  targets: string[];
  formats: string[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [def, setDef] = useState({
    key: "",
    name: "",
    description: "",
    category: catalog[0] ?? "bg.home",
    format: "svg",
    target: "global",
    sortOrder: "0",
    isBundled: false,
    visibility: "public",
    scope: "",
    localization: "",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          ...def,
          sortOrder: parseInt(def.sortOrder) || 0,
          scope: def.scope || undefined,
          localization: def.localization ? def.localization : undefined,
        });
      }}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="a-key">Key</Label>
          <Input
            id="a-key"
            placeholder="bg.home.special"
            value={def.key}
            onChange={(e) => setDef({ ...def, key: e.target.value.replace(/\s+/g, ".") })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-name">Name</Label>
          <Input id="a-name" placeholder="Home special background" value={def.name} onChange={(e) => setDef({ ...def, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-desc">Description</Label>
          <Textarea id="a-desc" rows={2} value={def.description} onChange={(e) => setDef({ ...def, description: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={def.category} onValueChange={(v) => setDef({ ...def, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {catalog.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target screen</Label>
            <Select value={def.target} onValueChange={(v) => setDef({ ...def, target: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {targets.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={def.format} onValueChange={(v) => setDef({ ...def, format: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input type="number" min={0} value={def.sortOrder} onChange={(e) => setDef({ ...def, sortOrder: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={def.visibility} onValueChange={(v) => setDef({ ...def, visibility: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["public", "vip", "internal", "beta"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Bundled in APK</Label>
            <p className="text-xs text-muted-foreground">Ships with the client; other assets are remote-only</p>
          </div>
          <Switch checked={def.isBundled} onCheckedChange={(v) => setDef({ ...def, isBundled: v })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-scope">Scope</Label>
          <Input id="a-scope" placeholder="game:{gameId} / room:{roomId} / event:{eventId}" value={def.scope} onChange={(e) => setDef({ ...def, scope: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-loc">Localization JSON</Label>
          <Textarea
            id="a-loc"
            rows={2}
            placeholder='{"en": {"caption": "Home"}}'
            value={def.localization}
            onChange={(e) => setDef({ ...def, localization: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create draft"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({
  asset,
  catalog,
  targets,
  busy,
  onCancel,
  onSubmit,
}: {
  asset: Asset;
  catalog: string[];
  targets: string[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [def, setDef] = useState({
    name: asset.name,
    description: asset.description ?? "",
    category: asset.category,
    target: asset.target ?? "global",
    sortOrder: String(asset.sortOrder),
    isBundled: asset.isBundled,
    visibility: asset.visibility,
    scope: asset.scope ?? "",
    localization: asset.localization ?? "",
    startsAt: isoToLocal(asset.startsAt),
    endsAt: isoToLocal(asset.endsAt),
  });

  const patch = (p: Partial<typeof def>) => setDef((d) => ({ ...d, ...p }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          name: def.name,
          description: def.description || undefined,
          category: def.category,
          target: def.target,
          sortOrder: parseInt(def.sortOrder) || 0,
          isBundled: def.isBundled,
          visibility: def.visibility,
          scope: def.scope || undefined,
          localization: def.localization || undefined,
          startsAt: def.startsAt || null,
          endsAt: def.endsAt || null,
        });
      }}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" value={def.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={2} value={def.description} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={def.category} onValueChange={(v) => patch({ category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {catalog.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target screen</Label>
            <Select value={def.target} onValueChange={(v) => patch({ target: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {targets.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input type="number" min={0} value={def.sortOrder} onChange={(e) => patch({ sortOrder: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={def.visibility} onValueChange={(v) => patch({ visibility: v as Asset["visibility"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["public", "vip", "internal", "beta"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Bundled in APK</Label>
            <p className="text-xs text-muted-foreground">Appears in the APK manifest seed; remote can still override</p>
          </div>
          <Switch checked={def.isBundled} onCheckedChange={(v) => patch({ isBundled: v })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-scope">Scope</Label>
          <Input id="e-scope" placeholder="game:{gameId}" value={def.scope} onChange={(e) => patch({ scope: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="e-start">Starts at</Label>
            <Input id="e-start" type="datetime-local" value={def.startsAt} onChange={(e) => patch({ startsAt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-end">Ends at</Label>
            <Input id="e-end" type="datetime-local" value={def.endsAt} onChange={(e) => patch({ endsAt: e.target.value })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ReplaceForm({
  asset,
  busy,
  onCancel,
  onFile,
}: {
  asset: Asset;
  busy: boolean;
  onCancel: () => void;
  onFile: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-4">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="new file" className="mx-auto h-32 w-32 rounded-md border object-contain" />
      )}
      <div className="space-y-2">
        <Label htmlFor={`file-${asset.id}`}>New file (SVG, PNG/WebP/AVIF, Lottie JSON, audio, or font)</Label>
        <Input
          id={`file-${asset.id}`}
          type="file"
          accept=".svg,.webp,.avif,.png,.json,.mp3,.wav,.ogg,.ttf,.otf,.woff2"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button disabled={!file || busy} onClick={() => file && onFile(file)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload file"}
        </Button>
      </DialogFooter>
    </div>
  );
}