
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ChangeStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  currentStatus: string;
  currentAuditStatus: string | null;
}

const SALE_STATUSES = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_auditoria', label: 'En Auditoría' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'aprobado_para_templates', label: 'Aprobado para Templates' },
  { value: 'listo_para_enviar', label: 'Listo para Enviar' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'firmado_parcial', label: 'Firmado Parcial' },
  { value: 'firmado', label: 'Firmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'expirado', label: 'Expirado' },
];

const AUDIT_STATUSES = [
  { value: 'none', label: 'Sin estado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'requiere_info', label: 'Requiere Info' },
];

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  open, onOpenChange, saleId, currentStatus, currentAuditStatus,
}) => {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [newAuditStatus, setNewAuditStatus] = useState(currentAuditStatus || 'none');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewStatus(currentStatus || 'borrador');
    setNewAuditStatus(currentAuditStatus || 'none');
    setReason('');
  }, [open, currentStatus, currentAuditStatus]);

  const isRevertingFromApproved =
    currentAuditStatus === 'aprobado' && newAuditStatus !== 'aprobado';

  const handleSubmit = async () => {
    if (isRevertingFromApproved && !reason.trim()) {
      toast.error('Debe indicar un motivo para revertir una venta aprobada');
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('admin_change_sale_status', {
        p_sale_id: saleId,
        p_new_status: newStatus,
        p_new_audit_status: newAuditStatus === 'none' ? null : newAuditStatus,
        p_reason: reason || null,
      });

      if (error) throw error;
      const result = data as any;
      if (result && !result.ok) throw new Error(result.error || 'Error al cambiar estado');

      toast.success('Estado actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['audit-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Estado de Venta</DialogTitle>
          <DialogDescription>
            Modifique el estado de la venta y/o el estado de auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Estado de Venta</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado de Auditoría</Label>
            <Select value={newAuditStatus} onValueChange={setNewAuditStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Motivo {isRevertingFromApproved && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motivo del cambio de estado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
