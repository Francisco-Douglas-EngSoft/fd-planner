import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, User, MessageSquare, Send, CheckCircle2, Loader2, Linkedin, Github, Instagram, ExternalLink, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

// Validation schema (mensagens no idioma atual)
const buildContactSchema = (t: (pt: string, en: string) => string) => z.object({
  name: z.string()
    .trim()
    .min(2, { message: t('Nome deve ter pelo menos 2 caracteres', 'Name must be at least 2 characters') })
    .max(100, { message: t('Nome deve ter no máximo 100 caracteres', 'Name must be at most 100 characters') }),
  email: z.string()
    .trim()
    .email({ message: t('Email inválido', 'Invalid email') })
    .max(255, { message: t('Email deve ter no máximo 255 caracteres', 'Email must be at most 255 characters') }),
  subject: z.string()
    .trim()
    .min(3, { message: t('Assunto deve ter pelo menos 3 caracteres', 'Subject must be at least 3 characters') })
    .max(200, { message: t('Assunto deve ter no máximo 200 caracteres', 'Subject must be at most 200 characters') }),
  message: z.string()
    .trim()
    .min(10, { message: t('Mensagem deve ter pelo menos 10 caracteres', 'Message must be at least 10 characters') })
    .max(2000, { message: t('Mensagem deve ter no máximo 2000 caracteres', 'Message must be at most 2000 characters') }),
});

type ContactFormData = z.infer<ReturnType<typeof buildContactSchema>>;

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = buildContactSchema(t).safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof ContactFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: result.data.name,
          email: result.data.email,
          subject: result.data.subject,
          message: result.data.message,
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: t('Mensagem enviada!', 'Message sent!'),
        description: t('Agradecemos seu contato. Responderemos em breve.', 'Thanks for reaching out. We will reply soon.'),
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setIsSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast({
        title: t('Erro ao enviar', 'Could not send'),
        description: t('Ocorreu um erro ao enviar sua mensagem. Tente novamente.', 'Something went wrong sending your message. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex p-4 rounded-full bg-success/20 mb-4"
          >
            <CheckCircle2 className="h-12 w-12 text-success" />
          </motion.div>
          <h3 className="text-2xl font-bold font-display mb-2">{t('Mensagem Enviada!', 'Message Sent!')}</h3>
          <p className="text-muted-foreground">
            {t('Agradecemos seu contato. Nossa equipe responderá em breve.', 'Thanks for reaching out. Our team will reply soon.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const devSocials = [
    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/francisco-douglas-sousa" },
    { icon: Github, label: "GitHub", href: "https://github.com/Francisco-Douglas-eng" },
    { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/franciscodouglas77" },
    { icon: ExternalLink, label: t("Portfólio", "Portfolio"), href: "https://portfolio-franciscodouglas.vercel.app/" },
    { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/5586981625526" },
  ];

  const handleSocialClick = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Social Links Card */}
      <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent to-primary" />
        <CardContent className="p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold font-display text-foreground">{t('Redes do Desenvolvedor', 'Developer links')}</h3>
          <p className="text-sm text-muted-foreground">{t('Conecte-se com Francisco Douglas', 'Connect with Francisco Douglas')}</p>
          <div className="flex justify-center gap-3">
            {devSocials.map((social) => (
              <button
                key={social.label}
                onClick={() => handleSocialClick(social.href)}
                className="p-3 rounded-xl bg-muted/60 hover:bg-primary/15 hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95 group"
                aria-label={social.label}
                title={social.label}
              >
                <social.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Form Card */}
      <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent" />
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-display">{t('Entre em Contato', 'Get in Touch')}</CardTitle>
          <CardDescription>
            {t('Dúvidas, sugestões ou parcerias? Envie sua mensagem.', 'Questions, ideas or partnerships? Send us a message.')}
          </CardDescription>
        </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">{t('Nome', 'Name')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact-name"
                  placeholder={t('Seu nome', 'Your name')}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact-email"
                  type="email"
                  placeholder={t('seu@email.com', 'you@email.com')}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-subject">{t('Assunto', 'Subject')}</Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="contact-subject"
                placeholder={t('Assunto da mensagem', 'Message subject')}
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className={`pl-10 ${errors.subject ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
            </div>
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">{t('Mensagem', 'Message')}</Label>
            <Textarea
              id="contact-message"
              placeholder={t('Escreva sua mensagem aqui...', 'Write your message here...')}
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className={`min-h-[120px] resize-none ${errors.message ? 'border-destructive' : ''}`}
              disabled={isSubmitting}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('Enviando...', 'Sending...')}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t('Enviar Mensagem', 'Send Message')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
      </Card>
    </div>
  );
}
