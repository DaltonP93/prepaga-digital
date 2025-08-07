
import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { toast } from 'sonner';
import { MessageCircle, X } from 'lucide-react';

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  page?: string;
  userAgent?: string;
}

interface FeedbackSystemProps {
  onSubmit?: (feedback: FeedbackData) => void;
}

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({ onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackData['type']>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Por favor ingresa tu comentario');
      return;
    }

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      type,
      message: message.trim(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    try {
      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        // Default behavior - just show success
        console.log('Feedback submitted:', feedbackData);
      }
      
      toast.success('¡Gracias por tu comentario!');
      setMessage('');
      setType('bug');
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Error al enviar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Feedback
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Enviar Comentario</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Select value={type} onValueChange={(value: FeedbackData['type']) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de comentario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Reportar Error</SelectItem>
                <SelectItem value="feature">Nueva Funcionalidad</SelectItem>
                <SelectItem value="improvement">Mejora</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Textarea
              placeholder="Describe tu comentario..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !message.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
