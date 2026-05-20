import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Save, Type, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBrandingManager, getBranding } from '@/hooks/useBranding';

export function BrandingSettings() {
  const { toast } = useToast();
  const { branding, update, reset, isDefault } = useBrandingManager();
  
  const [appName, setAppName] = useState(branding.appName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with external changes
  useEffect(() => {
    setAppName(branding.appName);
    setTagline(branding.tagline);
    setHasChanges(false);
  }, [branding.appName, branding.tagline]);

  const handleAppNameChange = (value: string) => {
    setAppName(value);
    setHasChanges(value !== branding.appName || tagline !== branding.tagline);
  };

  const handleTaglineChange = (value: string) => {
    setTagline(value);
    setHasChanges(appName !== branding.appName || value !== branding.tagline);
  };

  const handleSave = () => {
    if (!appName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'O nome do aplicativo não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    update({
      appName: appName.trim(),
      tagline: tagline.trim() || 'FD-Planner',
    });

    setHasChanges(false);

    toast({
      title: 'Marca atualizada!',
      description: 'O nome e slogan do app foram salvos.',
    });
  };

  const handleReset = () => {
    reset();
    setAppName('FD-Planner');
    setTagline('FD-Planner');
    setHasChanges(false);

    toast({
      title: 'Marca restaurada',
      description: 'O nome e slogan originais foram restaurados.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Personalização da Marca
        </CardTitle>
        <CardDescription>
          Personalize o nome e slogan do aplicativo para refletir sua identidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {appName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{appName || 'Nome do App'}</h3>
              <p className="text-xs text-muted-foreground">{tagline || 'Slogan'}</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName" className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              Nome do Aplicativo
            </Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => handleAppNameChange(e.target.value)}
              placeholder="Ex: MeuEstudo, StudyFlow..."
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              {appName.length}/30 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Slogan / Subtítulo
            </Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => handleTaglineChange(e.target.value)}
              placeholder="Ex: Organize seus estudos, Foco total..."
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {tagline.length}/50 caracteres
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Marca
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isDefault}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Original
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          💡 A marca personalizada aparecerá em todo o aplicativo, incluindo a barra lateral, 
          título da página e landing page.
        </p>
      </CardContent>
    </Card>
  );
}
