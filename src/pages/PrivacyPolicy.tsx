import { useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Database, UserX, Download, Lock, Mail, Scale, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-surface py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Política de Privacidade
            </h1>
            <p className="text-sm text-muted-foreground">
              Última atualização: 05 de Janeiro de 2026
            </p>
          </div>
        </div>

        <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              1. Introdução
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              O <strong>FD-Planner</strong> ("nós", "nosso" ou "aplicativo") está comprometido com a proteção 
              da sua privacidade e dos seus dados pessoais. Esta Política de Privacidade descreve como 
              coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a 
              <strong> Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> e o 
              <strong> Regulamento Geral sobre a Proteção de Dados (GDPR)</strong> da União Europeia.
            </p>
            <p>
              Ao utilizar o FD-Planner, você concorda com as práticas descritas nesta política. 
              Recomendamos a leitura completa deste documento.
            </p>
          </CardContent>
        </Card>

          {/* Data Collected */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                2. Dados Coletados
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>2.1 Dados de Identificação</h4>
              <ul>
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Foto de perfil (opcional)</li>
              </ul>

              <h4>2.2 Dados de Uso do Aplicativo</h4>
              <ul>
                <li>Cursos cadastrados e progresso</li>
                <li>Tarefas e planejamentos</li>
                <li>Sessões de foco e tempo de estudo</li>
                <li>Conquistas e metas</li>
                <li>Anotações de estudo</li>
              </ul>

              <h4 className="text-warning">2.3 Dados Sensíveis de Saúde (Módulo AntiVício)</h4>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 my-4">
                <p className="text-sm">
                  <strong>⚠️ Atenção:</strong> O módulo AntiVício coleta dados considerados sensíveis 
                  pela LGPD, incluindo:
                </p>
                <ul className="text-sm mt-2">
                  <li>Tipos de vícios informados pelo usuário</li>
                  <li>Níveis de dependência autoavaliados</li>
                  <li>Registros de check-in diário (humor, autocontrole)</li>
                  <li>Registros de impulsos e gatilhos</li>
                  <li>Histórico de recaídas</li>
                  <li>Metas de recuperação</li>
                </ul>
                <p className="text-sm mt-2">
                  <strong>Base Legal:</strong> Estes dados são coletados com seu consentimento expresso 
                  (Art. 11, I da LGPD) e são utilizados exclusivamente para fornecer funcionalidades 
                  de acompanhamento pessoal dentro do aplicativo.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                3. Uso dos Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>Utilizamos seus dados pessoais para:</p>
              <ul>
                <li>Fornecer e manter os serviços do aplicativo</li>
                <li>Personalizar sua experiência de uso</li>
                <li>Gerar estatísticas e relatórios do seu progresso</li>
                <li>Enviar notificações e lembretes (quando autorizados)</li>
                <li>Melhorar nossos serviços e funcionalidades</li>
              </ul>
              <p>
                <strong>Não compartilhamos</strong> seus dados pessoais ou de saúde com terceiros, 
                exceto quando exigido por lei ou com seu consentimento expresso.
              </p>
            </CardContent>
          </Card>

          {/* Data Storage and Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                4. Armazenamento e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
              <ul>
                <li><strong>Criptografia em trânsito:</strong> Todas as comunicações usam HTTPS/TLS</li>
                <li><strong>Autenticação segura:</strong> Senhas são armazenadas com hash bcrypt</li>
                <li><strong>Controle de acesso:</strong> Políticas de segurança em nível de linha (RLS) 
                garantem que você só acessa seus próprios dados</li>
                <li><strong>Headers de Segurança:</strong> CSP, X-Frame-Options, X-Content-Type-Options</li>
                <li><strong>Proteção CSRF:</strong> Tokens de segurança em formulários</li>
                <li><strong>Sanitização:</strong> Validação e limpeza de todas as entradas de usuário</li>
                <li><strong>Infraestrutura segura:</strong> Dados armazenados em servidores com 
                certificações de segurança</li>
              </ul>
            </CardContent>
          </Card>

          {/* User Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                5. Seus Direitos (LGPD/GDPR)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>De acordo com a LGPD e GDPR, você tem direito a:</p>
              <ul>
                <li><strong>Acesso:</strong> Solicitar uma cópia dos seus dados pessoais</li>
                <li><strong>Retificação:</strong> Corrigir dados incompletos ou desatualizados</li>
                <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado (JSON/PDF)</li>
                <li><strong>Exclusão:</strong> Solicitar a exclusão permanente da sua conta e dados</li>
                <li><strong>Revogação:</strong> Retirar seu consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Opor-se ao tratamento de seus dados</li>
                <li><strong>Informação:</strong> Ser informado sobre o uso de seus dados</li>
              </ul>
              <p>
                Para exercer seus direitos, acesse <strong>Configurações → Privacidade e Dados</strong> 
                no aplicativo ou entre em contato conosco.
              </p>
            </CardContent>
          </Card>

          {/* Data Export and Deletion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                6. Exportação e Exclusão de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>6.1 Exportação de Dados (Portabilidade)</h4>
              <p>
                Você pode exportar todos os seus dados a qualquer momento em formato JSON ou CSV 
                através das configurações do aplicativo. O arquivo incluirá:
              </p>
              <ul>
                <li>Dados do perfil</li>
                <li>Cursos e módulos</li>
                <li>Tarefas e planejamentos</li>
                <li>Sessões de foco</li>
                <li>Dados do módulo AntiVício (se utilizado)</li>
                <li>Conquistas desbloqueadas</li>
              </ul>

              <h4>6.2 Exclusão de Conta (Direito ao Esquecimento)</h4>
              <p>
                Você pode solicitar a exclusão completa da sua conta e todos os dados associados. 
                Esta ação é <strong>irreversível</strong> e resultará na remoção permanente de:
              </p>
              <ul>
                <li>Perfil e credenciais de acesso</li>
                <li>Todos os dados de estudo e progresso</li>
                <li>Dados sensíveis do módulo AntiVício</li>
                <li>Arquivos enviados (fotos de perfil, capas de cursos)</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>7. Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, 
                todos os dados são removidos permanentemente em até 30 dias, exceto quando a 
                retenção for necessária para:
              </p>
              <ul>
                <li>Cumprimento de obrigações legais</li>
                <li>Resolução de disputas</li>
                <li>Prevenção de fraudes</li>
              </ul>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                8. Cookies e Armazenamento Local
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>Utilizamos cookies e armazenamento local para:</p>
              <ul>
                <li><strong>Essenciais:</strong> Manter sua sessão e autenticação</li>
                <li><strong>Funcionais:</strong> Lembrar preferências de tema e configurações</li>
                <li><strong>Análise:</strong> Entender como você usa a plataforma (opcional)</li>
              </ul>
              <p>
                Você pode gerenciar suas preferências de cookies a qualquer momento através 
                do banner de consentimento ou nas configurações do navegador.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                9. Contato e DPO
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Para questões relacionadas à privacidade ou exercício de seus direitos, 
                entre em contato com nosso Encarregado de Proteção de Dados (DPO):
              </p>
              <div className="not-prose bg-muted rounded-lg p-4 my-4">
                <p className="text-sm"><strong>E-mail:</strong> privacidade@fdplanner.app</p>
                <p className="text-sm"><strong>DPO:</strong> dpo@fdplanner.app</p>
                <p className="text-sm"><strong>Prazo de resposta:</strong> Até 15 dias úteis</p>
              </div>
              <p className="text-sm">
                Você também pode registrar uma reclamação junto à Autoridade Nacional de 
                Proteção de Dados (ANPD) caso considere que seus direitos não foram atendidos.
              </p>
            </CardContent>
          </Card>

          {/* Terms of Use */}
          <Separator className="my-8" />

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-display">Termos de Uso</h1>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>1. Aceitação dos Termos</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Ao criar uma conta e utilizar o FD-Planner, você concorda com estes Termos de Uso 
                e com nossa Política de Privacidade. Se você não concordar com qualquer parte destes 
                termos, não utilize o aplicativo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Descrição do Serviço</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                O FD-Planner é uma plataforma que oferece:
              </p>
              <ul>
                <li>Gerenciamento de cursos e módulos</li>
                <li>Planejamento de estudos</li>
                <li>Timer Pomodoro para sessões de foco</li>
                <li>Acompanhamento de tarefas</li>
                <li>Sistema de gamificação com conquistas</li>
                <li>Módulo AntiVício para apoio na recuperação de vícios digitais</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Responsabilidades do Usuário</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>Ao usar o FD-Planner, você se compromete a:</p>
              <ul>
                <li>Fornecer informações verdadeiras e precisas</li>
                <li>Manter a confidencialidade da sua senha</li>
                <li>Não utilizar o serviço para fins ilegais</li>
                <li>Não tentar acessar dados de outros usuários</li>
                <li>Não realizar engenharia reversa do aplicativo</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Módulo AntiVício - Isenção de Responsabilidade</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="font-semibold text-warning">⚠️ Aviso Importante</p>
                <p className="text-sm mt-2">
                  O módulo AntiVício é uma ferramenta de <strong>autoacompanhamento</strong> e 
                  <strong> não substitui tratamento médico ou psicológico profissional</strong>.
                </p>
                <p className="text-sm mt-2">
                  Se você está enfrentando problemas sérios com vícios, recomendamos fortemente 
                  que procure ajuda de profissionais de saúde qualificados.
                </p>
                <p className="text-sm mt-2">
                  O FD-Planner não se responsabiliza por resultados do uso do módulo AntiVício 
                  e não oferece garantias de eficácia no tratamento de vícios.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Propriedade Intelectual</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Todo o conteúdo do FD-Planner, incluindo design, código, textos, gráficos e logotipos, 
                é propriedade do FD-Planner e está protegido por leis de propriedade intelectual.
              </p>
              <p>
                Os dados e conteúdos que você cria (cursos, notas, etc.) permanecem de sua propriedade.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Modificações e Encerramento</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações 
                significativas serão comunicadas por e-mail ou notificação no aplicativo.
              </p>
              <p>
                Podemos suspender ou encerrar sua conta em caso de violação destes termos, 
                mediante notificação prévia quando possível.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Legislação Aplicável</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Estes termos são regidos pelas leis da República Federativa do Brasil. 
                Qualquer disputa será resolvida nos tribunais do Brasil.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>FD-Planner © {new Date().getFullYear()} - Todos os direitos reservados</p>
            <p className="mt-2">
              Ao utilizar o FD-Planner, você declara ter lido e concordado com esta 
              Política de Privacidade e Termos de Uso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
