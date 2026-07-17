import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { useAuth } from "@/contexts/AuthContext";
import { mindMapService, type MindMapNodeRow } from "@/services/mindMapService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { toast } from "sonner";

function toFlowNode(n: MindMapNodeRow): Node {
  return {
    id: n.id,
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: { label: n.title },
    style: n.color ? { background: n.color } : undefined,
  };
}

export default function MindMapEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await mindMapService.listNodes(id);
        setNodes(rows.map(toFlowNode));
        const es: Edge[] = rows
          .filter((r) => r.parent_id)
          .map((r) => ({ id: `${r.parent_id}-${r.id}`, source: r.parent_id as string, target: r.id }));
        setEdges(es);
      } catch (e) {
        toast.error("Erro ao carregar mapa");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleAddNode = async () => {
    if (!id || !user || !newTitle.trim()) return;
    try {
      const created = await mindMapService.upsertNode({
        mind_map_id: id,
        user_id: user.id,
        title: newTitle.trim(),
        x: Math.random() * 400,
        y: Math.random() * 300,
      });
      setNodes((ns) => [...ns, toFlowNode(created)]);
      setNewTitle("");
    } catch {
      toast.error("Erro ao criar nó");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const posById = new Map(nodes.map((n) => [n.id, n.position] as const));
      const parentByChild = new Map<string, string>();
      edges.forEach((e) => parentByChild.set(e.target, e.source));
      await Promise.all(
        nodes.map((n) =>
          mindMapService.upsertNode({
            id: n.id,
            mind_map_id: id!,
            user_id: user.id,
            title: String(n.data?.label ?? "Sem título"),
            x: posById.get(n.id)?.x ?? 0,
            y: posById.get(n.id)?.y ?? 0,
            parent_id: parentByChild.get(n.id) ?? null,
          }),
        ),
      );
      toast.success("Mapa salvo");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => onNodesChange(changes),
    [onNodesChange],
  );

  const rfNodes = useMemo(() => nodes, [nodes]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-3 bg-background">
        <Button asChild variant="ghost" size="sm">
          <Link to="/mapas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Input
            placeholder="Título do nó"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-56 h-9"
            onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
          />
          <Button size="sm" onClick={handleAddNode} disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Nó
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando mapa...</div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}