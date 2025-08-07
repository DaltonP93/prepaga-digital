
import React, { useState, createContext, useContext, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question';
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'closed';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userEmail: string;
  votes: number;
  tags: string[];
}

interface FeedbackContextType {
  feedback: FeedbackItem[];
  submitFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'userEmail' | 'votes'>) => Promise<void>;
  voteFeedback: (id: string, vote: 'up' | 'down') => Promise<void>;
  loading: boolean;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  const submitFeedback = async (newFeedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'userEmail' | 'votes'>) => {
    setLoading(true);
    try {
      const feedbackItem: FeedbackItem = {
        ...newFeedback,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'current-user',
        userEmail: 'user@example.com',
        votes: 0
      };
      
      setFeedback(prev => [feedbackItem, ...prev]);
      toast.success('Feedback enviado exitosamente');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Error al enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  const voteFeedback = async (id: string, vote: 'up' | 'down') => {
    try {
      setFeedback(prev => prev.map(item => 
        item.id === id 
          ? { ...item, votes: item.votes + (vote === 'up' ? 1 : -1) }
          : item
      ));
      toast.success(`Voto ${vote === 'up' ? 'positivo' : 'negativo'} registrado`);
    } catch (error) {
      console.error('Error voting feedback:', error);
      toast.error('Error al votar');
    }
  };

  return (
    <FeedbackContext.Provider value={{ feedback, submitFeedback, voteFeedback, loading }}>
      {children}
    </FeedbackContext.Provider>
  );
};

interface FeedbackFormProps {
  onSubmit?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [type, setType] = useState<FeedbackType>('improvement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const { submitFeedback, loading } = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    await submitFeedback({
      type,
      title,
      description,
      status: 'pending',
      priority,
      tags: []
    });

    setTitle('');
    setDescription('');
    onSubmit?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Tipo de feedback</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as FeedbackType)}
          className="w-full p-2 border rounded-md"
        >
          <option value="bug">Bug/Error</option>
          <option value="feature">Nueva funcionalidad</option>
          <option value="improvement">Mejora</option>
          <option value="question">Pregunta</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="Describe brevemente el feedback"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Descripción</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Proporciona detalles sobre tu feedback"
          rows={4}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Prioridad</label>
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          className="w-full p-2 border rounded-md"
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Enviando...' : 'Enviar Feedback'}
      </Button>
    </form>
  );
};

export const FeedbackButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Tu opinión nos ayuda a mejorar. Comparte tus ideas, reporta bugs o sugiere mejoras.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm onSubmit={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

const getStatusIcon = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'reviewed': return <AlertCircle className="h-4 w-4" />;
    case 'resolved': return <CheckCircle className="h-4 w-4" />;
    case 'closed': return <CheckCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'reviewed': return 'bg-blue-100 text-blue-800';
    case 'resolved': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const FeedbackList: React.FC = () => {
  const { feedback, voteFeedback } = useFeedback();

  if (feedback.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay feedback disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-1">
                  {item.description}
                </CardDescription>
              </div>
              <div className="flex gap-2 ml-4">
                <Badge className={getStatusColor(item.status)}>
                  {getStatusIcon(item.status)}
                  <span className="ml-1 capitalize">{item.status}</span>
                </Badge>
                <Badge className={getPriorityColor(item.priority)}>
                  {item.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {item.userEmail} • {item.createdAt.toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => voteFeedback(item.id, 'up')}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {item.votes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => voteFeedback(item.id, 'down')}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
