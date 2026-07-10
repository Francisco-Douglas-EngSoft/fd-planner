import { useState, useEffect, useRef } from 'react';
import { User, Bell, Palette, Globe, Shield, Sun, Moon, Camera, Database, Download, Trash2, FileText, ExternalLink, LogOut, Smartphone, Laptop, AlertCircle, Check, RotateCcw, Sparkles, Zap, Eye, Wand2, Leaf, Snowflake, Gem, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme, lightVariants, darkVariants } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { DataExportDialog } from '@/components/settings/DataExportDialog';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { ResetHistoryDialog } from '@/components/settings/ResetHistoryDialog';
import { ResetStudyDataDialog } from '@/components/settings/ResetStudyDataDialog';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { StudyRemindersManager } from '@/components/settings/StudyRemindersManager';
import { CustomThemeBuilder } from '@/components/settings/CustomThemeBuilder';
import { BrandingSettings } from '@/components/settings/BrandingSettings';

import { Link } from 'react-router-dom';

export default function Settings() {
  const { theme, setTheme, darkVariant, setDarkVariant, lightVariant, setLightVariant, clearCustomTheme } = useTheme();
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    avatarUrl: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    reminders: true,
    updates: false,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Array<{
    id: string;
    device: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
  }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      // Profile might not exist, use user metadata
      setProfile({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        avatarUrl: '',
      });
      return;
    }

    if (data) {
      setProfile({
        fullName: data.full_name || user.user_metadata?.full_name || '',
        email: user.email || '',
        avatarUrl: data.avatar_url || '',
      });
    }
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      // Get current session info
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSessionId = sessionData?.session?.access_token?.slice(-8) || '';
      
      // For now, we show the current session
      // Note: Supabase doesn't expose all sessions via API, so we show what we can
      const userAgent = navigator.userAgent;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
      const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                      userAgent.includes('Firefox') ? 'Firefox' :
                      userAgent.includes('Safari') ? 'Safari' : 
                      userAgent.includes('Edge') ? 'Edge' : 'Navegador';
      const os = userAgent.includes('Windows') ? 'Windows' :
                 userAgent.includes('Mac') ? 'macOS' :
                 userAgent.includes('Linux') ? 'Linux' :
                 userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' :
                 userAgent.includes('Android') ? 'Android' : 'Desconhecido';

      setSessions([
        {
          id: currentSessionId,
          device: `${browser} • ${os}`,
          location: 'Localização atual',
          lastActive: 'Agora',
          isCurrent: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 2MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas imagens são permitidas.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage
        .from('course-covers')
        .remove([`${user.id}/avatar.*`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL (upsert to handle missing profile)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          avatar_url: publicUrl 
        }, { onConflict: 'id' });

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatarUrl: publicUrl + '?t=' + Date.now() }));

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi alterada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar foto',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!profile.fullName.trim()) {
      toast({
        title: 'Nome inválido',
        description: 'Por favor, insira um nome válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Use upsert to handle cases where profile doesn't exist
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          full_name: profile.fullName.trim()
        }, { onConflict: 'id' });

      if (error) throw error;

      // Also update user metadata for consistency
      await supabase.auth.updateUser({
        data: { full_name: profile.fullName.trim() }
      });

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos de senha.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) throw error;

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso.',
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: 'Erro ao alterar senha',
        description: getErrorMessage(error) || 'Não foi possível alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: 'Sessões encerradas',
        description: 'Todas as sessões foram encerradas. Você será redirecionado para o login.',
      });
      // Redirect to auth page after logout
      window.location.href = '/auth';
    } catch (error) {
      toast({
        title: 'Erro',
        description: getErrorMessage(error) || 'Não foi possível encerrar as sessões.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = () => {
    const names = profile.fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return profile.fullName.slice(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Personalize sua experiência no FD-Planner
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 sm:grid sm:grid-cols-6 sm:w-auto">
            <TabsTrigger value="profile" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Aparência</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Alertas</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Idioma</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3">
              <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Dados</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                      {getInitials()}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                  >
                    {isUploadingAvatar ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máximo 2MB.</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input 
                    id="fullName" 
                    value={profile.fullName}
                    onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={profile.email} disabled />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                </div>
              </div>

              <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          {/* Branding Settings */}
          <BrandingSettings />

          {/* Theme Mode Selection */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Temas Base
              </CardTitle>
              <CardDescription>
                Escolha entre modo claro ou escuro e selecione a variante de sua preferência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => { clearCustomTheme(); setTheme('light'); }}
                >
                  <Sun className="h-4 w-4" />
                  Claro
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => { clearCustomTheme(); setTheme('dark'); }}
                >
                  <Moon className="h-4 w-4" />
                  Escuro
                </Button>
              </div>

              {/* Light Variants */}
              {theme === 'light' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Variantes Claras</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {lightVariants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { clearCustomTheme(); setLightVariant(v.id); }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300",
                          lightVariant === v.id
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        <Sun className="h-6 w-6 text-primary" />
                        <span className="text-sm font-semibold">{v.name}</span>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">{v.description}</span>
                        {lightVariant === v.id && (
                          <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dark Variants */}
              {theme === 'dark' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Variantes Escuras</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {darkVariants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { clearCustomTheme(); setDarkVariant(v.id); }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300",
                          darkVariant === v.id
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                        <Moon className="h-6 w-6 text-primary" />
                        <span className="text-sm font-semibold">{v.name}</span>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">{v.description}</span>
                        {darkVariant === v.id && (
                          <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info sobre temas personalizados */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wand2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Quer mais personalização?</p>
                    <p className="text-xs text-muted-foreground">
                      Use o "Criador de Temas" abaixo para criar temas únicos com cores, gradientes, sombras e efeitos impressionantes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Accessibility Options */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Acessibilidade
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-sm">Alto Contraste</p>
                      <p className="text-xs text-muted-foreground">Aumenta o contraste</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-sm">Reduzir Animações</p>
                      <p className="text-xs text-muted-foreground">Menos movimento</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Theme Builder */}
          <CustomThemeBuilder isDarkMode={theme === 'dark'} />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
          
          <Card>
            <CardHeader>
              <CardTitle>Preferências de E-mail</CardTitle>
              <CardDescription>
                Configure alertas por e-mail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações por E-mail</p>
                    <p className="text-sm text-muted-foreground">Receba resumos e alertas por e-mail</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Atualizações do Sistema</p>
                    <p className="text-sm text-muted-foreground">Novidades e melhorias</p>
                  </div>
                  <Switch
                    checked={notifications.updates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, updates: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language Tab */}
        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>Idioma e Região</CardTitle>
              <CardDescription>
                Configure suas preferências de idioma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select defaultValue="pt-BR">
                  <SelectTrigger className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuso Horário</Label>
                <Select defaultValue="america-sp">
                  <SelectTrigger className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america-sp">América/São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="america-ny">América/New York (GMT-5)</SelectItem>
                    <SelectItem value="europe-london">Europa/Londres (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato de Data</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger className="w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD/MM/AAAA</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM/DD/AAAA</SelectItem>
                    <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança
              </CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Alterar Senha
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                  {newPassword && confirmPassword && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      newPassword === confirmPassword ? "text-green-600" : "text-destructive"
                    )}>
                      {newPassword === confirmPassword ? (
                        <>
                          <Check className="h-4 w-4" />
                          Senhas coincidem
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          Senhas não coincidem
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isChangingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </div>

              {/* Active Sessions Section */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-muted-foreground" />
                    Sessões Ativas
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOutAllSessions}
                    className="text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Encerrar Todas
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center p-4">
                      Nenhuma sessão ativa encontrada
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div 
                        key={session.id} 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg",
                          session.isCurrent 
                            ? "bg-primary/5 border border-primary/20" 
                            : "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {session.device.includes('iPhone') || session.device.includes('Android') || session.device.includes('iOS') ? (
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Laptop className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{session.device}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.location} • {session.lastActive}
                            </p>
                          </div>
                        </div>
                        {session.isCurrent ? (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            Sessão atual
                          </span>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            Encerrar
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Por segurança, apenas a sessão atual é exibida. Use "Encerrar Todas" para fazer logout em todos os dispositivos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Data Tab */}
        <TabsContent value="privacy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Privacidade e Dados
                </CardTitle>
                <CardDescription>
                  Gerencie seus dados pessoais conforme a LGPD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Privacy Policy Link */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Política de Privacidade</p>
                      <p className="text-sm text-muted-foreground">Leia nossa política de privacidade e termos de uso</p>
                    </div>
                  </div>
                  <Link to="/privacidade">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver
                    </Button>
                  </Link>
                </div>

                {/* Data Export */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Exportar Meus Dados</p>
                      <p className="text-sm text-muted-foreground">Baixe uma cópia de todos os seus dados (LGPD Art. 18)</p>
                    </div>
                  </div>
                  <DataExportDialog>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>
                  </DataExportDialog>
                </div>


                {/* Reset History */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-4">Recomeçar do Zero</h4>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-600 dark:text-amber-400">Resetar Todo o Histórico</p>
                        <p className="text-sm text-muted-foreground">Apaga todos os dados e permite começar do início</p>
                      </div>
                    </div>
                    <ResetHistoryDialog>
                      <Button variant="outline" size="sm" className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-400">
                        <RotateCcw className="h-4 w-4" />
                        Resetar
                      </Button>
                    </ResetHistoryDialog>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-destructive mb-4">Zona de Perigo</h4>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">Excluir Minha Conta</p>
                        <p className="text-sm text-muted-foreground">Remove permanentemente sua conta e todos os dados</p>
                      </div>
                    </div>
                    <DeleteAccountDialog>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </DeleteAccountDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
