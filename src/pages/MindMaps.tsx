import { useState } from "react";
import { Link } from "react-router-dom";
import { useMindMaps } from "@/hooks/useMindMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Network, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function MindMaps() {
  const { data, isLoading, create, remove } = useMindMaps();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ title, description: desc || null });
      toast.success("Mapa mental criado");
      setTitle(""); setDesc(""); setOpen(false);
    } catch {
      toast.error("Erro ao criar mapa mental");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mapas Mentais</h1>
          <p className="text-sm text-muted-foreground">
            Organize ideias em nós conectados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo mapa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo mapa mental</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium">Descrição (opcional)</label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={create.isPending}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !data?.length ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Network className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Nenhum mapa mental ainda</p>
            <p className="text-sm text-muted-foreground">Crie um mapa para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((m) => (
            <Card key={m.id} className="tint-card group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove.mutate(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {m.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                )}
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link to={`/mapas/${m.id}`}>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Abrir editor
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}