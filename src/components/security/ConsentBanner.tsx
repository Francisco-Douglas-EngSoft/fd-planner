/**
 * LGPD/GDPR Consent Banner
 * Implementa Art. 8º da LGPD - Consentimento
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, X, FileText, Eye } from 'lucide-react';
import { GDPRService } from '@/services/gdprService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PRIVACY_POLICY_VERSION = '1.0.0';
const CONSENT_KEY = 'fd-planner-consent';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    // Verifica se já deu consentimento
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = async () => {
    try {
      // Registra consentimento
      await GDPRService.recordConsent({
        consentType: 'privacy_policy',
        consentGiven: true,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      });

      // Salva localmente
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        version: PRIVACY_POLICY_VERSION,
        date: new Date().toISOString(),
        accepted: true,
      }));

      setShowBanner(false);
    } catch (error) {
      console.error('Failed to record consent:', error);
    }
  };

  const handleReject = () => {
    // Usuário rejeitou - redirecionar ou mostrar mensagem
    alert('Para usar o FD-Planner, é necessário aceitar nossa Política de Privacidade.');
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <Card className="max-w-4xl mx-auto p-6 shadow-2xl pointer-events-auto border-primary/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    🍪 Privacidade e Proteção de Dados
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Respeitamos sua privacidade. Este site coleta apenas dados essenciais para seu funcionamento 
                    e está em conformidade com a LGPD (Lei Geral de Proteção de Dados).
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBanner(false)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Aceitar e Continuar
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                  >
                    Rejeitar
                  </Button>
                </div>

                <Button
                  variant="link"
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Ler Política de Privacidade
                </Button>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p className="flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  <span>
                    Coletamos: Nome, Email, Progresso de Estudos. 
                    Não compartilhamos com terceiros. 
                    Você pode exportar ou deletar seus dados a qualquer momento.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              FD-Planner
            </DialogTitle>
            <DialogDescription>
              Versão {PRIVACY_POLICY_VERSION} - Última atualização: 22/02/2026
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Dados Coletados</h3>
              <p className="text-muted-foreground mb-2">
                Coletamos apenas os dados essenciais para o funcionamento do serviço:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Nome completo e email (para autenticação)</li>
                <li>Cursos, tarefas e notas de estudo</li>
                <li>Sessões de foco e progresso acadêmico</li>
                <li>Logs de auditoria (para segurança)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Uso dos Dados</h3>
              <p className="text-muted-foreground">
                Seus dados são utilizados exclusivamente para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Fornecer funcionalidades do sistema</li>
                <li>Melhorar sua experiência de uso</li>
                <li>Garantir segurança da sua conta</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Compartilhamento</h3>
              <p className="text-muted-foreground">
                <strong>Não compartilhamos seus dados com terceiros.</strong> Seus dados são armazenados 
                em servidores seguros da Supabase (AWS) com criptografia.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Seus Direitos (LGPD Art. 18)</h3>
              <p className="text-muted-foreground mb-2">Você tem direito a:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Acessar seus dados (exportação completa)</li>
                <li>Corrigir dados incompletos ou incorretos</li>
                <li>Solicitar exclusão de seus dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Retenção de Dados</h3>
              <p className="text-muted-foreground">
                Mantemos seus dados por até 2 anos após sua última atividade. 
                Você pode solicitar exclusão a qualquer momento através das configurações.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Segurança</h3>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Criptografia em trânsito (HTTPS/TLS)</li>
                <li>Criptografia em repouso</li>
                <li>Controle de acesso rigoroso (RLS)</li>
                <li>Logs de auditoria</li>
                <li>Monitoramento de segurança</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Cookies</h3>
              <p className="text-muted-foreground">
                Utilizamos apenas cookies essenciais para autenticação. 
                Não utilizamos cookies de rastreamento ou publicidade.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Contato</h3>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou tirar dúvidas sobre privacidade, 
                entre em contato através das configurações do sistema ou email: 
                <span className="text-primary"> privacy@fd-planner.com</span>
              </p>
            </section>

            <section className="bg-muted/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Base Legal (LGPD):</strong> O tratamento de dados é realizado com base no 
                consentimento (Art. 7º, I) e execução de contrato (Art. 7º, V). 
                Você pode revogar o consentimento a qualquer momento.
              </p>
            </section>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPrivacyPolicy(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setShowPrivacyPolicy(false);
              handleAccept();
            }}>
              Aceitar e Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
