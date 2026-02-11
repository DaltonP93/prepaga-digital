import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { useAuditComments, useCreateAuditComment } from '@/hooks/useAuditComments';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { SALE_STATUS_LABELS } from '@/types/workflow';

interface AuditCommentsPanelProps {
  saleId: string;
  saleStatus?: string;
}

const AUDIT_ACTION_LABELS: Record<string, { label: string; className: string }> = {
  approve: { label: 'Aprobado', className: 'bg-green-100 text-green-800' },
  reject: { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
  comment: { label: 'Comentario', className: 'bg-blue-100 text-blue-800' },
  return: { label: 'Devuelto', className: 'bg-yellow-100 text-yellow-800' },
};

export const AuditCommentsPanel: React.FC<AuditCommentsPanelProps> = ({ saleId, saleStatus }) => {
  const { data: comments, isLoading } = useAuditComments(saleId);
  const createComment = useCreateAuditComment();
  const { role } = useRolePermissions();
  const [newComment, setNewComment] = useState('');

  const canAddComment = role === 'auditor' || role === 'admin' || role === 'super_admin';

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      saleId,
      comment: newComment.trim(),
      saleStatus,
      auditAction: 'comment',
    });

    setNewComment('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Comentarios de Auditoría</h3>
        {comments && comments.length > 0 && (
          <Badge variant="secondary">{comments.length}</Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {comments.map((comment) => {
            const actionInfo = comment.audit_action ? AUDIT_ACTION_LABELS[comment.audit_action] : null;
            return (
              <div key={comment.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.profiles
                        ? `${comment.profiles.first_name} ${comment.profiles.last_name}`
                        : 'Usuario'}
                    </span>
                    {actionInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${actionInfo.className}`}>
                        {actionInfo.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                {comment.sale_status_at_comment && (
                  <p className="text-xs text-muted-foreground">
                    Estado: {SALE_STATUS_LABELS[comment.sale_status_at_comment] || comment.sale_status_at_comment}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No hay comentarios de auditoría.</p>
      )}

      {canAddComment && (
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribir comentario de auditoría..."
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createComment.isPending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
