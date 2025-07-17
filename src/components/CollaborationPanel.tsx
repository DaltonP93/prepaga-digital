import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Send,
  Reply,
  CheckCircle,
  User,
  Plus,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useTemplateComments } from "@/hooks/useTemplateWorkflow";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CollaborationPanelProps {
  templateId: string;
}

interface CommentItemProps {
  comment: any;
  onReply: (parentId: string) => void;
  onResolve: (commentId: string) => void;
  isResolvingComment: boolean;
}

const CommentItem = ({ comment, onReply, onResolve, isResolvingComment }: CommentItemProps) => {
  const [showReplies, setShowReplies] = useState(true);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <div className="space-y-3">
      <div className={`flex gap-3 ${comment.resolved ? "opacity-60" : ""}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.user?.first_name, comment.user?.last_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.user?.first_name} {comment.user?.last_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {comment.resolved ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resuelto
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Abierto
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-xs h-7"
            >
              <Reply className="h-3 w-3 mr-1" />
              Responder
            </Button>
            
            {!comment.resolved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResolve(comment.id)}
                disabled={isResolvingComment}
                className="text-xs h-7"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {isResolvingComment ? "Resolviendo..." : "Resolver"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {showReplies && comment.replies.map((reply: any) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.user?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(reply.user?.first_name, reply.user?.last_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs">
                      {reply.user?.first_name} {reply.user?.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                  <p className="text-xs">{reply.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CollaborationPanel = ({ templateId }: CollaborationPanelProps) => {
  const {
    comments,
    addComment,
    isAddingComment,
    resolveComment,
    isResolvingComment,
  } = useTemplateComments(templateId);

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
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

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;

    addComment(
      {
        templateId,
        content: replyContent,
        parentCommentId: parentId,
      },
      {
        onSuccess: () => {
          setReplyContent("");
          setReplyingTo(null);
        },
      }
    );
  };

  const activeComments = comments?.filter(comment => !comment.resolved) || [];
  const resolvedComments = comments?.filter(comment => comment.resolved) || [];

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
            <Dialog open={showNewCommentDialog} onOpenChange={setShowNewCommentDialog}>
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
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">
                {activeComments.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Comentarios Activos
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {resolvedComments.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Comentarios Resueltos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Comments */}
      {activeComments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {activeComments.map((comment) => (
                  <div key={comment.id}>
                    <CommentItem
                      comment={comment}
                      onReply={setReplyingTo}
                      onResolve={(commentId) => resolveComment({ commentId })}
                      isResolvingComment={isResolvingComment}
                    />
                    
                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <div className="ml-11 mt-3 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Escribe tu respuesta..."
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!replyContent.trim() || isAddingComment}
                          >
                            {isAddingComment ? (
                              "Enviando..."
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                Responder
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Resolved Comments */}
      {resolvedComments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Comentarios Resueltos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-4">
                {resolvedComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={() => {}}
                    onResolve={() => {}}
                    isResolvingComment={false}
                  />
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