import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface WhatsAppButtonProps {
  phoneNumber: string;
  defaultMessage?: string;
}

export function WhatsAppButton({ 
  phoneNumber, 
  defaultMessage = 'Olá! Gostaria de saber mais sobre o FD-Planner.' 
}: WhatsAppButtonProps) {
  // Clean phone number and encode message
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          onClick={handleClick}
          className="h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-xl shadow-[#25D366]/30 hover:shadow-[#25D366]/50 transition-all"
          aria-label="Contato via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </motion.div>
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366]/40 pointer-events-none" style={{ animationDuration: '2s' }} />
    </motion.div>
  );
}

// Inline version for use in sections
export function WhatsAppInlineButton({ 
  phoneNumber, 
  defaultMessage = 'Olá! Gostaria de saber mais sobre o FD-Planner.',
  className = ''
}: WhatsAppButtonProps & { className?: string }) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={`gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Falar no WhatsApp
    </Button>
  );
}
