import { useState, useEffect } from 'react';
import { Plus, X, Trash2, GripVertical, ChevronDown, ChevronRight, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from './ImageUpload';
import { PasteModulesDialog, PastedModule } from './PasteModulesDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getErrorMessage } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubModule {
  id?: string;
  name: string;
  hours: string;
}

interface Module {
  id?: string;
  name: string;
  hours: string;
  subModules: SubModule[];
  isExpanded?: boolean;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
  status: string;
}

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCourse?: Course | null;
}

const categories = [
  'Programação',
  'Design',
  'Backend',
  'Frontend',
  'DevOps',
  'Idiomas',
  'Negócios',
  'Marketing',
  'IA Inteligência Artificial',
  'FullStack',
  'Concursos',
  'Faculdades',
  'Outros',
];

const hoursToTimeFormat = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const timeFormatToHours = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] + parts[1] / 60 + parts[2] / 3600;
  } else if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  }
  return parseFloat(time) || 0;
};

interface SortableModuleProps {
  module: Module;
  index: number;
  onUpdate: (index: number, field: keyof Module, value: string | number | boolean | SubModule[]) => void;
  onRemove: (index: number) => void;
  onAddSubModule: (moduleIndex: number) => void;
  onUpdateSubModule: (moduleIndex: number, subIndex: number, field: keyof SubModule, value: string) => void;
  onRemoveSubModule: (moduleIndex: number, subIndex: number) => void;
  onToggleExpand: (index: number) => void;
}

function SortableModule({ 
  module, 
  index, 
  onUpdate, 
  onRemove, 
  onAddSubModule, 
  onUpdateSubModule,
  onRemoveSubModule,
  onToggleExpand 
}: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id || `new-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSubModules = module.subModules.length > 0;
  const subModuleCount = module.subModules.length;

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-card",
        isDragging && "shadow-lg",
        hasSubModules && "border-primary/30"
      )}>
        <button {...attributes} {...listeners} className="cursor-grab touch-none shrink-0">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        
        {hasSubModules ? (
          <button
            type="button"
            onClick={() => onToggleExpand(index)}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
            title={module.isExpanded ? "Ocultar submódulos" : `Ver ${subModuleCount} submódulo(s)`}
          >
            {module.isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <span className="text-xs font-medium text-primary">{subModuleCount}</span>
            )}
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}
        
        <Input
          value={module.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder={`Módulo ${index + 1}`}
          className="flex-1 min-w-0 h-9 text-sm"
        />
        <Input
          type="text"
          value={module.hours}
          onChange={(e) => onUpdate(index, 'hours', e.target.value)}
          placeholder="00:00:00"
          className={cn(
            "w-32 font-mono h-9 text-sm shrink-0",
            hasSubModules && "bg-muted/50 cursor-not-allowed"
          )}
          readOnly={hasSubModules}
          title={hasSubModules ? "Horas calculadas automaticamente pelos submódulos" : ""}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onAddSubModule(index)}
          title="Adicionar submódulo"
          className="h-8 w-8 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* SubModules - Hidden by default, shown when expanded */}
      {module.isExpanded && hasSubModules && (
        <div className="ml-10 space-y-2 border-l-2 border-primary/20 pl-4 animate-fade-in">
          {module.subModules.map((sub, subIndex) => (
            <div key={subIndex} className="flex items-center gap-2">
              <div className="w-3 h-px bg-primary/20 shrink-0" />
              <Input
                value={sub.name}
                onChange={(e) => onUpdateSubModule(index, subIndex, 'name', e.target.value)}
                placeholder={`Submódulo ${subIndex + 1}`}
                className="flex-1 min-w-0 h-8 text-sm"
              />
              <Input
                type="text"
                value={sub.hours}
                onChange={(e) => onUpdateSubModule(index, subIndex, 'hours', e.target.value)}
                placeholder="00:00:00"
                className="w-28 font-mono h-8 text-sm shrink-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveSubModule(index, subIndex)}
                className="h-7 w-7 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CourseFormDialog({ open, onOpenChange, onSuccess, editCourse }: CourseFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [modules, setModules] = useState<Module[]>([{ name: '', hours: '01:00:00', subModules: [], isExpanded: false }]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open) {
      if (editCourse) {
        setName(editCourse.name);
        setDescription(editCourse.description || '');
        setCategory(editCourse.category || '');
        setCoverPreview(editCourse.cover_image_url);
        fetchModules(editCourse.id);
      } else {
        resetForm();
      }
    }
  }, [open, editCourse]);

  const fetchModules = async (courseId: string) => {
    // Fetch modules
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('id, name, hours, is_parent')
      .eq('course_id', courseId)
      .order('order_index');
    
    if (modulesData && modulesData.length > 0) {
      // Fetch all submodules for these modules
      const moduleIds = modulesData.map(m => m.id);
      const { data: subModulesData } = await supabase
        .from('course_submodules')
        .select('*')
        .in('module_id', moduleIds)
        .order('order_index');
      
      // Group submodules by module_id
      const subModulesByModule: Record<string, SubModule[]> = {};
      (subModulesData || []).forEach(sub => {
        if (!subModulesByModule[sub.module_id]) {
          subModulesByModule[sub.module_id] = [];
        }
        subModulesByModule[sub.module_id].push({
          id: sub.id,
          name: sub.name,
          hours: hoursToTimeFormat(sub.hours || 0.5),
        });
      });
      
      setModules(modulesData.map(m => ({
        id: m.id,
        name: m.name,
        hours: hoursToTimeFormat(m.hours || 1),
        subModules: subModulesByModule[m.id] || [],
        isExpanded: false, // Always start collapsed
      })));
    } else {
      setModules([{ name: '', hours: '01:00:00', subModules: [], isExpanded: false }]);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setModules([{ name: '', hours: '01:00:00', subModules: [], isExpanded: false }]);
    setCoverImage(null);
    setCoverPreview(null);
  };

  const addModule = () => {
    setModules([...modules, { name: '', hours: '01:00:00', subModules: [], isExpanded: false }]);
  };

  const handlePastedModules = (pasted: PastedModule[], mode: 'replace' | 'append') => {
    const mapped: Module[] = pasted.map((m) => ({
      name: m.name,
      hours: hoursToTimeFormat(m.hours),
      subModules: m.subModules.map((s) => ({ name: s.name, hours: hoursToTimeFormat(s.hours) })),
      isExpanded: false,
    }));

    if (mode === 'append') {
      const current = modules.filter((m) => m.name.trim());
      setModules([...current, ...mapped]);
    } else {
      setModules(mapped.length > 0 ? mapped : [{ name: '', hours: '01:00:00', subModules: [], isExpanded: false }]);
    }

    toast({
      title: 'Módulos importados',
      description: `${mapped.length} módulo(s) adicionados a partir do texto colado.`,
    });
  };

  const removeModule = (index: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((_, i) => i !== index));
    }
  };

  const updateModule = (index: number, field: keyof Module, value: string | number | boolean | SubModule[]) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    setModules(updated);
  };

  const toggleModuleExpand = (index: number) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], isExpanded: !updated[index].isExpanded };
    setModules(updated);
  };

  const addSubModule = (moduleIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].subModules.push({ name: '', hours: '00:30:00' });
    // Auto-expand when adding a submodule so user can see and edit it
    updated[moduleIndex].isExpanded = true;
    setModules(updated);
  };

  const updateSubModule = (moduleIndex: number, subIndex: number, field: keyof SubModule, value: string) => {
    const updated = [...modules];
    updated[moduleIndex].subModules[subIndex] = { ...updated[moduleIndex].subModules[subIndex], [field]: value };
    
    // Auto-calculate module hours when submodule hours change
    if (field === 'hours' && updated[moduleIndex].subModules.length > 0) {
      const totalSubModuleHours = updated[moduleIndex].subModules.reduce((sum, sub) => sum + timeFormatToHours(sub.hours), 0);
      updated[moduleIndex].hours = hoursToTimeFormat(totalSubModuleHours);
    }
    
    setModules(updated);
  };

  const removeSubModule = (moduleIndex: number, subIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].subModules = updated[moduleIndex].subModules.filter((_, i) => i !== subIndex);
    
    // Recalculate module hours after removing submodule
    if (updated[moduleIndex].subModules.length > 0) {
      const totalSubModuleHours = updated[moduleIndex].subModules.reduce((sum, sub) => sum + timeFormatToHours(sub.hours), 0);
      updated[moduleIndex].hours = hoursToTimeFormat(totalSubModuleHours);
    }
    
    setModules(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex(m => (m.id || `new-${modules.indexOf(m)}`) === active.id);
      const newIndex = modules.findIndex(m => (m.id || `new-${modules.indexOf(m)}`) === over.id);
      setModules(arrayMove(modules, oldIndex, newIndex));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  const calculateTotalHours = () => {
    let total = 0;
    modules.forEach(m => {
      // If module has submodules, only count submodule hours (already included in module.hours)
      // If no submodules, count module hours directly
      if (m.subModules.length > 0) {
        m.subModules.forEach(sub => {
          total += timeFormatToHours(sub.hours);
        });
      } else {
        total += timeFormatToHours(m.hours);
      }
    });
    return hoursToTimeFormat(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      let coverImageUrl = editCourse?.cover_image_url || null;

      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('course-covers')
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-covers')
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl;
        // Remove a capa antiga do Storage ao trocar
        const oldPath = publicUrlToPath(editCourse?.cover_image_url, 'course-covers');
        if (oldPath) await supabase.storage.from('course-covers').remove([oldPath]);
      }

      const courseId = editCourse?.id;

      if (editCourse) {
        const updatePayload = {
          name,
          description,
          category,
          cover_image_url: coverImageUrl,
        };

        const { error: courseError } = await supabase
          .from('courses')
          .update(updatePayload)
          .eq('id', editCourse.id);

        if (courseError) throw courseError;

        // Delete existing submodules first (they reference modules)
        const { data: existingModules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', editCourse.id);
        
        if (existingModules && existingModules.length > 0) {
          const moduleIds = existingModules.map(m => m.id);
          await supabase
            .from('course_submodules')
            .delete()
            .in('module_id', moduleIds);
        }

        // Then delete modules
        await supabase
          .from('course_modules')
          .delete()
          .eq('course_id', editCourse.id);
      }

      // Calculate total_hours from modules
      const calculatedTotalHours = modules
        .filter(m => m.name.trim())
        .reduce((sum, m) => {
          if (m.subModules.length > 0) {
            return sum + m.subModules.reduce((subSum, sub) => subSum + timeFormatToHours(sub.hours), 0);
          }
          return sum + timeFormatToHours(m.hours);
        }, 0);

      // Create course if new
      let finalCourseId = courseId;
      if (!editCourse) {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .insert({
            user_id: user.id,
            name,
            description,
            category,
            cover_image_url: coverImageUrl,
            status: 'pending',
            total_hours: calculatedTotalHours,
          })
          .select()
          .single();

        if (courseError) throw courseError;
        finalCourseId = course.id;
      } else {
        // Update total_hours on edit too
        await supabase
          .from('courses')
          .update({ total_hours: calculatedTotalHours })
          .eq('id', editCourse.id);
      }

      // Insert modules (without submodules mixed in)
      const modulesToInsert = modules
        .filter(m => m.name.trim())
        .map((m, mIndex) => ({
          course_id: finalCourseId,
          name: m.name.trim(),
          hours: timeFormatToHours(m.hours),
          order_index: mIndex,
          is_parent: m.subModules.length > 0,
        }));

      if (modulesToInsert.length > 0) {
        const { data: insertedModules, error: modulesError } = await supabase
          .from('course_modules')
          .insert(modulesToInsert)
          .select();

        if (modulesError) throw modulesError;

        // Insert submodules into course_submodules table
        const subModulesToInsert: { module_id: string; name: string; hours: number; order_index: number }[] = [];
        
        modules.filter(m => m.name.trim()).forEach((m, mIndex) => {
          const insertedModule = insertedModules?.[mIndex];
          if (insertedModule && m.subModules.length > 0) {
            m.subModules.forEach((sub, sIndex) => {
              if (sub.name.trim()) {
                subModulesToInsert.push({
                  module_id: insertedModule.id,
                  name: sub.name.trim(),
                  hours: timeFormatToHours(sub.hours),
                  order_index: sIndex,
                });
              }
            });
          }
        });

        if (subModulesToInsert.length > 0) {
          const { error: subModulesError } = await supabase
            .from('course_submodules')
            .insert(subModulesToInsert);

          if (subModulesError) throw subModulesError;
        }
      }

      toast({
        title: editCourse ? 'Curso atualizado!' : 'Curso criado!',
        description: `O curso "${name}" foi ${editCourse ? 'atualizado' : 'criado'} com sucesso.`,
      });

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: editCourse ? 'Erro ao atualizar curso' : 'Erro ao criar curso',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[92vw] md:!max-w-[700px] md:w-[700px] lg:!max-w-[800px] lg:w-[800px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{editCourse ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
          <DialogDescription className="text-sm">
            {editCourse ? 'Atualize as informações do curso' : 'Crie um novo curso com módulos e carga horária'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Cover Image with Drag & Drop */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Capa do Curso</Label>
            <ImageUpload
              value={coverPreview}
              onChange={setCoverImage}
              onPreviewChange={setCoverPreview}
            />
          </div>

          {/* Basic Info */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Nome do Curso *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: React Avançado"
                required
                className="h-10 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-sm">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteúdo do curso..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Modules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Módulos (arraste para reorganizar)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasteDialog(true)}
                  className="h-8 text-xs"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
                  Colar módulos
                </Button>
                <span className="text-sm font-medium text-primary">
                  Carga total: {calculateTotalHours()}
                </span>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={modules.map((m, i) => m.id || `new-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 border rounded-lg p-3 bg-muted/20">
                  {modules.map((module, index) => (
                    <SortableModule
                      key={module.id || `new-${index}`}
                      module={module}
                      index={index}
                      onUpdate={updateModule}
                      onRemove={removeModule}
                      onAddSubModule={addSubModule}
                      onUpdateSubModule={updateSubModule}
                      onRemoveSubModule={removeSubModule}
                      onToggleExpand={toggleModuleExpand}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button type="button" variant="outline" onClick={addModule} className="w-full h-10 text-sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Módulo
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()} className="h-10 text-sm px-6">
              {isLoading ? 'Salvando...' : editCourse ? 'Salvar Alterações' : 'Criar Curso'}
            </Button>
          </div>
        </form>

        <PasteModulesDialog
          open={showPasteDialog}
          onOpenChange={setShowPasteDialog}
          onConfirm={handlePastedModules}
          hasExistingModules={modules.some((m) => m.name.trim())}
        />
      </DialogContent>
    </Dialog>
  );
}
