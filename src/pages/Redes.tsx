import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Share2, Globe, Linkedin, Github, Twitter, Instagram,
  Link as LinkIcon, FileText, Briefcase, ExternalLink, Save,
  Loader2, Copy, Check, Plus, Trash2, Award, Edit2, GripVertical,
  Sparkles, Code2, GraduationCap, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SocialLinks {
  linkedin: string; github: string; twitter: string;
  instagram: string; website: string; portfolio: string;
}

interface Resume {
  title: string; summary: string; skills: string; experience: string;
}

interface Project {
  id: string; title: string; description: string; image_url: string;
  project_url: string; technologies: string[]; is_featured: boolean; order_index: number;
}

interface Certificate {
  id: string; title: string; issuer: string; issue_date: string; credential_url: string;
}

function SortableProjectCard({ project, openEditProject, confirmDeleteProject }: {
  project: Project; openEditProject: (p: Project) => void; confirmDeleteProject: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 1 };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-lg group",
        project.is_featured && "border-primary/40 bg-primary/5",
        isDragging && "shadow-xl"
      )}>
        {project.image_url && (
          <div className="relative overflow-hidden">
            <img src={project.image_url} alt={project.title} className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {project.is_featured && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Destaque
              </Badge>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
              {project.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.technologies.slice(0, 4).map((tech, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{tech}</Badge>
                  ))}
                  {project.technologies.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{project.technologies.length - 4}</Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              {project.project_url && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={project.project_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProject(project)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDeleteProject(project.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Redes() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({ linkedin: '', github: '', twitter: '', instagram: '', website: '', portfolio: '' });
  const [resume, setResume] = useState<Resume>({ title: '', summary: '', skills: '', experience: '' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteCertificateId, setDeleteCertificateId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '', image_url: '', project_url: '', technologies: '', is_featured: false });
  const [newCertificate, setNewCertificate] = useState({ title: '', issuer: '', issue_date: '', credential_url: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      const newProjects = arrayMove(projects, oldIndex, newIndex);
      setProjects(newProjects);
      try {
        for (const [index, project] of newProjects.entries()) {
          await supabase.from('user_projects').update({ order_index: index }).eq('id', project.id);
        }
        toast.success('Ordem atualizada!');
      } catch (error) {
        console.error('Error updating order:', error);
        fetchData();
      }
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [socialRes, resumeRes, projectsRes, certificatesRes] = await Promise.all([
        supabase.from('user_social_links').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_resume').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_projects').select('*').eq('user_id', user.id).order('order_index').order('is_featured', { ascending: false }),
        supabase.from('user_certificates').select('*').eq('user_id', user.id).order('issue_date', { ascending: false }),
      ]);
      if (socialRes.data) setSocialLinks({ linkedin: socialRes.data.linkedin || '', github: socialRes.data.github || '', twitter: socialRes.data.twitter || '', instagram: socialRes.data.instagram || '', website: socialRes.data.website || '', portfolio: socialRes.data.portfolio || '' });
      if (resumeRes.data) setResume({ title: resumeRes.data.title || '', summary: resumeRes.data.summary || '', skills: resumeRes.data.skills || '', experience: resumeRes.data.experience || '' });
      if (projectsRes.data) setProjects(projectsRes.data.map(p => ({ ...p, technologies: p.technologies || [] })));
      if (certificatesRes.data) setCertificates(certificatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_social_links').upsert({ user_id: user.id, ...socialLinks }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Redes sociais salvas!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResume = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_resume').upsert({ user_id: user.id, ...resume }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Currículo salvo!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = async () => {
    if (!user || !newProject.title) return;
    setSaving(true);
    try {
      const projectData = {
        user_id: user.id, title: newProject.title, description: newProject.description,
        image_url: newProject.image_url, project_url: newProject.project_url,
        technologies: newProject.technologies.split(',').map(t => t.trim()).filter(Boolean),
        is_featured: newProject.is_featured,
      };
      if (editingProject) {
        const { error } = await supabase.from('user_projects').update(projectData).eq('id', editingProject.id);
        if (error) throw error;
        toast.success('Projeto atualizado!');
      } else {
        const { error } = await supabase.from('user_projects').insert(projectData);
        if (error) throw error;
        toast.success('Projeto adicionado!');
      }
      setProjectDialogOpen(false);
      setEditingProject(null);
      setNewProject({ title: '', description: '', image_url: '', project_url: '', technologies: '', is_featured: false });
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar projeto');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await supabase.from('user_projects').delete().eq('id', id);
      toast.success('Projeto removido!');
      fetchData();
    } catch { toast.error('Erro ao remover'); }
    finally { setDeleteProjectId(null); }
  };

  const handleAddCertificate = async () => {
    if (!user || !newCertificate.title) return;
    setSaving(true);
    try {
      const certData = { user_id: user.id, ...newCertificate, issue_date: newCertificate.issue_date || null };
      if (editingCertificate) {
        const { error } = await supabase.from('user_certificates').update(certData).eq('id', editingCertificate.id);
        if (error) throw error;
        toast.success('Certificado atualizado!');
      } else {
        const { error } = await supabase.from('user_certificates').insert(certData);
        if (error) throw error;
        toast.success('Certificado adicionado!');
      }
      setCertificateDialogOpen(false);
      setEditingCertificate(null);
      setNewCertificate({ title: '', issuer: '', issue_date: '', credential_url: '' });
      fetchData();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleDeleteCertificate = async (id: string) => {
    try {
      await supabase.from('user_certificates').delete().eq('id', id);
      toast.success('Certificado removido!');
      fetchData();
    } catch { toast.error('Erro ao remover'); }
    finally { setDeleteCertificateId(null); }
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/perfil/${user?.id}`);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProject({ title: project.title, description: project.description || '', image_url: project.image_url || '', project_url: project.project_url || '', technologies: project.technologies?.join(', ') || '', is_featured: project.is_featured });
    setProjectDialogOpen(true);
  };

  const openEditCertificate = (cert: Certificate) => {
    setEditingCertificate(cert);
    setNewCertificate({ title: cert.title, issuer: cert.issuer || '', issue_date: cert.issue_date || '', credential_url: cert.credential_url || '' });
    setCertificateDialogOpen(true);
  };

  const socialInputs = [
    { key: 'linkedin' as const, icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...', color: 'text-[#0A66C2]' },
    { key: 'github' as const, icon: Github, label: 'GitHub', placeholder: 'https://github.com/...', color: 'text-foreground' },
    { key: 'twitter' as const, icon: Twitter, label: 'Twitter / X', placeholder: 'https://twitter.com/...', color: 'text-[#1DA1F2]' },
    { key: 'instagram' as const, icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/...', color: 'text-[#E4405F]' },
    { key: 'website' as const, icon: Globe, label: 'Website', placeholder: 'https://seu-site.com', color: 'text-primary' },
    { key: 'portfolio' as const, icon: Briefcase, label: 'Portfólio', placeholder: 'https://portfolio.com', color: 'text-accent' },
  ];

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Hero Header */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-accent/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3.5 rounded-2xl bg-gradient-to-br from-accent to-primary shadow-lg shadow-accent/25"
                whileHover={{ scale: 1.05, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Share2 className="h-7 w-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display">Redes & Portfólio</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gerencie redes sociais, currículo e projetos
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 self-start" onClick={copyProfileLink}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar link do perfil'}
            </Button>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="social" className="space-y-6">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl overflow-x-auto">
          <TabsTrigger value="social" className="rounded-lg data-[state=active]:shadow-sm gap-2">
            <Share2 className="h-4 w-4" /><span className="hidden sm:inline">Redes Sociais</span>
          </TabsTrigger>
          <TabsTrigger value="resume" className="rounded-lg data-[state=active]:shadow-sm gap-2">
            <FileText className="h-4 w-4" /><span className="hidden sm:inline">Currículo</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-lg data-[state=active]:shadow-sm gap-2">
            <Code2 className="h-4 w-4" /><span className="hidden sm:inline">Projetos</span>
            {projects.length > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{projects.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-lg data-[state=active]:shadow-sm gap-2">
            <GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">Certificados</span>
            {certificates.length > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{certificates.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Social Tab */}
        <TabsContent value="social">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />Links das Redes Sociais</CardTitle>
                <CardDescription>Adicione seus perfis para compartilhar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {socialInputs.map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label className="flex items-center gap-2"><item.icon className={cn("h-4 w-4", item.color)} />{item.label}</Label>
                      <Input placeholder={item.placeholder} value={socialLinks[item.key]} onChange={(e) => setSocialLinks({ ...socialLinks, [item.key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveSocial} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Redes Sociais
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Resume Tab */}
        <TabsContent value="resume">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Currículo Digital</CardTitle>
                <CardDescription>Crie um resumo profissional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título Profissional</Label>
                  <Input placeholder="Ex: Desenvolvedor Full Stack" value={resume.title} onChange={(e) => setResume({ ...resume, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Textarea placeholder="Uma breve descrição sobre você..." value={resume.summary} onChange={(e) => setResume({ ...resume, summary: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Habilidades</Label>
                  <Textarea placeholder="Habilidades separadas por vírgula" value={resume.skills} onChange={(e) => setResume({ ...resume, skills: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Experiência</Label>
                  <Textarea placeholder="Experiências profissionais..." value={resume.experience} onChange={(e) => setResume({ ...resume, experience: e.target.value })} rows={4} />
                </div>
                <Button onClick={handleSaveResume} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Currículo
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5 text-primary" />Meus Projetos</CardTitle>
                  <CardDescription>Adicione seus projetos e trabalhos</CardDescription>
                </div>
                <Dialog open={projectDialogOpen} onOpenChange={(open) => {
                  setProjectDialogOpen(open);
                  if (!open) { setEditingProject(null); setNewProject({ title: '', description: '', image_url: '', project_url: '', technologies: '', is_featured: false }); }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" size="sm"><Plus className="h-4 w-4" />Projeto</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
                      <DialogDescription>Adicione informações do projeto</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Título *</Label><Input value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} placeholder="Nome do projeto" /></div>
                      <div className="space-y-2"><Label>Descrição</Label><Textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="Descreva o projeto..." rows={3} /></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>URL da Imagem</Label><Input value={newProject.image_url} onChange={(e) => setNewProject({ ...newProject, image_url: e.target.value })} placeholder="https://..." /></div>
                        <div className="space-y-2"><Label>URL do Projeto</Label><Input value={newProject.project_url} onChange={(e) => setNewProject({ ...newProject, project_url: e.target.value })} placeholder="https://..." /></div>
                      </div>
                      <div className="space-y-2"><Label>Tecnologias (vírgula)</Label><Input value={newProject.technologies} onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })} placeholder="React, TypeScript, Tailwind..." /></div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="featured" checked={newProject.is_featured} onCheckedChange={(checked) => setNewProject({ ...newProject, is_featured: !!checked })} />
                        <Label htmlFor="featured" className="text-sm">Destacar projeto</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddProject} disabled={saving || !newProject.title}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingProject ? 'Salvar' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed rounded-xl">
                    <Code2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhum projeto</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Adicione seus projetos para criar seu portfólio</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={projects.map(p => p.id)} strategy={rectSortingStrategy}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {projects.map((project) => (
                          <SortableProjectCard key={project.id} project={project} openEditProject={openEditProject} confirmDeleteProject={(id) => setDeleteProjectId(id)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Meus Certificados</CardTitle>
                  <CardDescription>Adicione suas credenciais</CardDescription>
                </div>
                <Dialog open={certificateDialogOpen} onOpenChange={(open) => {
                  setCertificateDialogOpen(open);
                  if (!open) { setEditingCertificate(null); setNewCertificate({ title: '', issuer: '', issue_date: '', credential_url: '' }); }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" size="sm"><Plus className="h-4 w-4" />Certificado</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCertificate ? 'Editar Certificado' : 'Novo Certificado'}</DialogTitle>
                      <DialogDescription>Informações do certificado</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Título *</Label><Input value={newCertificate.title} onChange={(e) => setNewCertificate({ ...newCertificate, title: e.target.value })} placeholder="Nome do certificado" /></div>
                      <div className="space-y-2"><Label>Emissor</Label><Input value={newCertificate.issuer} onChange={(e) => setNewCertificate({ ...newCertificate, issuer: e.target.value })} placeholder="Udemy, Coursera..." /></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Data de Emissão</Label><Input type="date" value={newCertificate.issue_date} onChange={(e) => setNewCertificate({ ...newCertificate, issue_date: e.target.value })} /></div>
                        <div className="space-y-2"><Label>URL da Credencial</Label><Input value={newCertificate.credential_url} onChange={(e) => setNewCertificate({ ...newCertificate, credential_url: e.target.value })} placeholder="https://..." /></div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddCertificate} disabled={saving || !newCertificate.title}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingCertificate ? 'Salvar' : 'Adicionar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {certificates.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed rounded-xl">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhum certificado</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Adicione certificados dos seus cursos</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {certificates.map((cert, i) => (
                      <motion.div
                        key={cert.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                <Award className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{cert.title}</h4>
                                {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                                {cert.issue_date && (
                                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {new Date(cert.issue_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {cert.credential_url && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCertificate(cert)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCertificateId(cert.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir projeto?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCertificateId} onOpenChange={() => setDeleteCertificateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir certificado?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteCertificateId && handleDeleteCertificate(deleteCertificateId)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
