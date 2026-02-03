import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  Plus,
  MessageSquare,
} from "lucide-react";
import { useTemplateComments } from "@/hooks/useTemplateWorkflow";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CollaborationPanelProps {
  templateId: string;
}

interface CommentItemProps {
  comment: any;
}

const CommentItem = ({ comment }: CommentItemProps) => {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">U</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Usuario</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </div>
          </div>
          <p className="text-sm">{comment.comment_text}</p>
        </div>
      </div>
    </div>
  );
};

export const CollaborationPanel = ({ templateId }: CollaborationPanelProps) => {
  const {
    comments,
    addComment,
    isAddingComment,
  } = useTemplateComments(templateId);

  const [newComment, setNewComment] = useState("");
  const [showNewCommentDialog, setShowNewCommentDialog] = useState(false);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    addComment(
      { templateId, content: newComment },
      {
        onSuccess: () => {
          setNewComment("");
          setShowNewCommentDialog(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Colaboración
              <Badge variant="secondary" className="ml-2">
                {comments?.length || 0} comentarios
              </Badge>
            </CardTitle>
            <Dialog
              open={showNewCommentDialog}
              onOpenChange={setShowNewCommentDialog}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Comentario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Comentario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe tu comentario..."
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCommentDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                    >
                      {isAddingComment ? (
                        "Agregando..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Agregar Comentario
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {comments?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Comentarios
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments && comments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!comments || comments.length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin comentarios</h3>
            <p className="text-muted-foreground mb-4">
              Sé el primero en agregar un comentario a este template
            </p>
            <Button onClick={() => setShowNewCommentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Comentario
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
