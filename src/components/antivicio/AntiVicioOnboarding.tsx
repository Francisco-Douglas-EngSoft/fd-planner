import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  Smartphone,
  Gamepad2,
  Heart,
  Zap,
  Clock,
  Youtube,
  Tv,
  ShoppingCart,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AntiVicioOnboardingProps {
  onComplete: () => void;
  existingProfile?: {
    addiction_types: string[];
    critical_hours: string[];
    associated_emotions: string[];
    dependency_level: number;
    study_impact_level: number;
  } | null;
}

const addictionTypes = [
  { id: 'social_media', label: 'Redes Sociais', icon: Smartphone, description: 'Instagram, TikTok, Twitter, Facebook' },
  { id: 'games', label: 'Jogos', icon: Gamepad2, description: 'Videogames, jogos mobile' },
  { id: 'pornography', label: 'Pornografia', icon: Heart, description: 'Conteúdo adulto' },
  { id: 'fast_dopamine', label: 'Dopamina Rápida', icon: Zap, description: 'Notificações, recompensas instantâneas' },
  { id: 'procrastination', label: 'Procrastinação', icon: Clock, description: 'Adiar tarefas importantes' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, description: 'Vídeos e shorts' },
  { id: 'streaming', label: 'Streaming', icon: Tv, description: 'Netflix, séries, filmes' },
  { id: 'shopping', label: 'Compras Online', icon: ShoppingCart, description: 'Compras impulsivas' },
];

const criticalHours = [
  'Ao acordar',
  'Antes do estudo',
  'Durante pausas',
  'Após tarefas difíceis',
  'À noite',
  'Antes de dormir',
  'Fins de semana',
  'Quando entediado'
];

const emotions = [
  'Ansiedade',
  'Tédio',
  'Solidão',
  'Estresse',
  'Frustração',
  'Cansaço',
  'Tristeza',
  'Raiva'
];

export function AntiVicioOnboarding({ onComplete, existingProfile }: AntiVicioOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(existingProfile?.addiction_types || []);
  const [selectedHours, setSelectedHours] = useState<string[]>(existingProfile?.critical_hours || []);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(existingProfile?.associated_emotions || []);
  const [dependencyLevel, setDependencyLevel] = useState(existingProfile?.dependency_level || 5);
  const [studyImpactLevel, setStudyImpactLevel] = useState(existingProfile?.study_impact_level || 5);
  const [saving, setSaving] = useState(false);

  const totalSteps = 5;

  const toggleSelection = (item: string, list: string[], setList: (items: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedTypes.length === 0) {
      toast.error('Selecione pelo menos um tipo de comportamento');
      return;
    }
    if (step === 2 && selectedHours.length === 0) {
      toast.error('Selecione pelo menos um horário crítico');
      return;
    }
    if (step === 3 && selectedEmotions.length === 0) {
      toast.error('Selecione pelo menos uma emoção');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const profileData = {
        user_id: user.id,
        addiction_types: selectedTypes,
        critical_hours: selectedHours,
        associated_emotions: selectedEmotions,
        dependency_level: dependencyLevel,
        study_impact_level: studyImpactLevel,
        onboarding_completed: true,
      };
      
      if (existingProfile) {
        const { error } = await supabase
          .from('addiction_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('addiction_profiles')
          .insert(profileData);
        
        if (error) throw error;
        
        // Create clean streaks for each addiction type
        const streaksData = selectedTypes.map(type => ({
          user_id: user.id,
          addiction_type: type,
          current_streak: 0,
          longest_streak: 0,
        }));
        
        await supabase.from('clean_streaks').insert(streaksData);
      }
      
      toast.success('Perfil AntiVício configurado com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20 lg:pb-6">
      <Card className="card-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Diagnóstico AntiVício</CardTitle>
          <CardDescription>
            Vamos entender seus padrões para criar um plano personalizado
          </CardDescription>
          
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i + 1 === step ? "w-8 bg-primary" : i + 1 < step ? "w-4 bg-primary/60" : "w-4 bg-muted"
                )}
              />
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Addiction Types */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">
                Quais comportamentos você quer controlar?
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Selecione todos que se aplicam a você
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addictionTypes.map((type) => {
                  const isSelected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleSelection(type.id, selectedTypes, setSelectedTypes)}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border transition-all text-left",
                        isSelected 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <type.icon className={cn(
                        "h-5 w-5 mt-0.5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Critical Hours */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">
                Quando os impulsos são mais fortes?
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Identifique seus horários críticos
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {criticalHours.map((hour) => {
                  const isSelected = selectedHours.includes(hour);
                  return (
                    <Badge
                      key={hour}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all py-2 px-4 text-sm",
                        isSelected && "bg-primary"
                      )}
                      onClick={() => toggleSelection(hour, selectedHours, setSelectedHours)}
                    >
                      {hour}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Emotions */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">
                Quais emoções disparam os impulsos?
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Conhecer seus gatilhos emocionais ajuda a preveni-los
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {emotions.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion);
                  return (
                    <Badge
                      key={emotion}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all py-2 px-4 text-sm",
                        isSelected && "bg-primary"
                      )}
                      onClick={() => toggleSelection(emotion, selectedEmotions, setSelectedEmotions)}
                    >
                      {emotion}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Dependency Level */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-center">
                Qual o nível de dependência?
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Nível de Dependência</p>
                    <span className="text-2xl font-bold text-primary">{dependencyLevel}</span>
                  </div>
                  <Slider
                    value={[dependencyLevel]}
                    onValueChange={(value) => setDependencyLevel(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Leve</span>
                    <span>Moderado</span>
                    <span>Severo</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Impacto nos Estudos</p>
                    <span className="text-2xl font-bold text-primary">{studyImpactLevel}</span>
                  </div>
                  <Slider
                    value={[studyImpactLevel]}
                    onValueChange={(value) => setStudyImpactLevel(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pouco</span>
                    <span>Moderado</span>
                    <span>Muito</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-success mx-auto flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Seu Perfil AntiVício está pronto!
              </h3>
              <p className="text-sm text-muted-foreground">
                Com base nas suas respostas, vamos criar estratégias personalizadas para ajudá-lo a manter o foco e superar os impulsos.
              </p>
              
              <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm"><strong>Vícios:</strong> {selectedTypes.length} identificados</p>
                <p className="text-sm"><strong>Horários críticos:</strong> {selectedHours.length} momentos</p>
                <p className="text-sm"><strong>Gatilhos emocionais:</strong> {selectedEmotions.length} emoções</p>
                <p className="text-sm"><strong>Nível de dependência:</strong> {dependencyLevel}/10</p>
                <p className="text-sm"><strong>Impacto nos estudos:</strong> {studyImpactLevel}/10</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Começar Jornada'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
