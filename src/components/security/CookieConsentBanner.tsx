import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, Settings, Shield, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

interface ConsentRecord {
  preferences: CookiePreferences;
  timestamp: string;
  version: string;
  userAgent: string;
  consentMethod: 'banner' | 'settings';
}

const COOKIE_CONSENT_KEY = 'fdplanner_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'fdplanner_cookie_preferences';
const CONSENT_RECORD_KEY = 'fdplanner_consent_record';
const CONSENT_VERSION = '2.0.0'; // Increment when policy changes

/**
 * LGPD/GDPR Compliant Cookie Consent Banner
 * - Granular consent options
 * - Audit trail for consent
 * - Easy revocation
 * - No tracking before consent
 */
export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required - cannot be disabled
    analytics: false,
    functional: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already consented with current version
    const consentRecord = localStorage.getItem(CONSENT_RECORD_KEY);
    
    if (consentRecord) {
      try {
        const record: ConsentRecord = JSON.parse(consentRecord);
        
        // Check if consent version matches current version
        if (record.version === CONSENT_VERSION) {
          setPreferences(record.preferences);
          return; // Valid consent exists
        }
        // Outdated consent - show banner again
      } catch {
        // Invalid record - show banner
      }
    }
    
    // No valid consent - show banner after delay
    const timer = setTimeout(() => setShowBanner(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const createConsentRecord = useCallback((prefs: CookiePreferences, method: 'banner' | 'settings'): ConsentRecord => {
    return {
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
      userAgent: navigator.userAgent.substring(0, 100), // Truncated for privacy
      consentMethod: method,
    };
  }, []);

  const saveConsent = useCallback((prefs: CookiePreferences, method: 'banner' | 'settings') => {
    const record = createConsentRecord(prefs, method);
    
    // Save consent record for audit trail (LGPD/GDPR requirement)
    localStorage.setItem(CONSENT_RECORD_KEY, JSON.stringify(record));
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    
    // Apply preferences (e.g., disable analytics if not consented)
    applyConsentPreferences(prefs);
  }, [createConsentRecord]);

  const applyConsentPreferences = (prefs: CookiePreferences) => {
    // Disable analytics if not consented
    if (!prefs.analytics) {
      // Clear any analytics cookies/data
      window.localStorage.removeItem('_ga');
      window.localStorage.removeItem('_gid');
    }
    
    // Disable marketing if not consented
    if (!prefs.marketing) {
      // Clear marketing-related data
      window.localStorage.removeItem('_fbp');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    };
    saveConsent(allAccepted, 'banner');
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    };
    saveConsent(essentialOnly, 'banner');
  };

  const handleSavePreferences = () => {
    saveConsent(preferences, 'settings');
  };

  /**
   * Revoke consent and clear all non-essential data (LGPD/GDPR Right to Withdraw)
   */
  const handleRevokeConsent = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    };
    
    // Clear non-essential data
    applyConsentPreferences(essentialOnly);
    
    // Update consent record
    saveConsent(essentialOnly, 'settings');
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-in-bottom">
        <Card className="max-w-4xl mx-auto p-6 shadow-xl border-border/50 bg-card/95 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3 text-primary">
              <Shield className="h-8 w-8 flex-shrink-0" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-display font-semibold text-foreground mb-1">
                Sua privacidade é importante para nós
              </h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para melhorar sua experiência. 
                Você pode gerenciar suas preferências a qualquer momento. 
                Leia nossa{' '}
                <Link to="/privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex-1 md:flex-none gap-2"
              >
                <Settings className="h-4 w-4" />
                Personalizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptEssential}
                className="flex-1 md:flex-none"
              >
                Apenas Essenciais
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 md:flex-none gap-2"
              >
                <Cookie className="h-4 w-4" />
                Aceitar Todos
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Cookie Settings Dialog - Enhanced for LGPD/GDPR */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Cookies
            </DialogTitle>
            <DialogDescription>
              Gerencie suas preferências de cookies conforme a LGPD e GDPR. 
              Você pode alterar estas configurações a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Cookies Essenciais</Label>
                  <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                </div>
                <Switch checked={true} disabled />
              </div>
              <p className="text-xs text-muted-foreground">
                Necessários para autenticação, segurança e funcionamento básico. 
                Incluem tokens CSRF, sessão do usuário e preferências de tema.
                <strong> Não podem ser desativados.</strong>
              </p>
            </div>

            <Separator />

            {/* Functional Cookies */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Cookies Funcionais</Label>
                <Switch
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, functional: checked }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Permitem funcionalidades avançadas como lembretes personalizados, 
                configurações de timer e histórico de navegação dentro do app.
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Cookies de Análise</Label>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, analytics: checked }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Nos ajudam a entender como você usa o aplicativo para melhorar 
                sua experiência. Dados são anonimizados e não identificam você pessoalmente.
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Cookies de Marketing</Label>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, marketing: checked }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Usados para exibir anúncios relevantes. Atualmente não utilizamos 
                cookies de marketing, mas esta opção está disponível para transparência.
              </p>
            </div>

            <Separator />

            {/* LGPD/GDPR Info */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Seus Direitos (LGPD/GDPR)</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Você pode revogar seu consentimento a qualquer momento</li>
                    <li>• Seus dados são armazenados de forma segura e criptografada</li>
                    <li>• Não compartilhamos seus dados com terceiros sem consentimento</li>
                  </ul>
                  <Link 
                    to="/privacidade" 
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver Política de Privacidade completa
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRevokeConsent}
              className="text-destructive hover:text-destructive"
            >
              Revogar Consentimento
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePreferences}>
                Salvar Preferências
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to check cookie consent status
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        setConsent(null);
      }
    }
  }, []);
  
  return {
    hasConsent: consent !== null,
    preferences: consent,
    hasAnalyticsConsent: consent?.analytics ?? false,
    hasFunctionalConsent: consent?.functional ?? false,
    hasMarketingConsent: consent?.marketing ?? false,
  };
}
