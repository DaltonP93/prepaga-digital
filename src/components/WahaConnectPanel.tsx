import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { QrCode, RefreshCw, Power, PowerOff, LogOut, Phone, MessageSquare, Loader2, CheckCircle, XCircle, AlertTriangle, Wifi } from 'lucide-react';

type SessionStatus = 'WORKING' | 'STOPPED' | 'SCAN_QR_CODE' | 'STARTING' | 'FAILED' | 'UNKNOWN';

interface WahaConnectPanelProps {
  sessionName?: string;
  linkedPhone?: string;
  onLinked?: (data: { phone: string }) => void;
  onStatusChange?: (status: SessionStatus) => void;
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  WORKING: { label: 'Conectado', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  STOPPED: { label: 'Detenido', color: 'bg-muted', icon: <PowerOff className="h-4 w-4" /> },
  SCAN_QR_CODE: { label: 'Escanear QR', color: 'bg-yellow-500', icon: <QrCode className="h-4 w-4" /> },
  STARTING: { label: 'Iniciando...', color: 'bg-blue-500', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  FAILED: { label: 'Error', color: 'bg-destructive', icon: <XCircle className="h-4 w-4" /> },
  UNKNOWN: { label: 'Desconocido', color: 'bg-muted', icon: <AlertTriangle className="h-4 w-4" /> },
};

export const WahaConnectPanel: React.FC<WahaConnectPanelProps> = ({
  sessionName = 'default',
  linkedPhone = '',
  onLinked,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<SessionStatus>('UNKNOWN');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detectedPhone, setDetectedPhone] = useState(linkedPhone);
  const [showMessages, setShowMessages] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const invoke = useCallback(async (action: string) => {
    const { data, error: fnError } = await supabase.functions.invoke('waha-proxy', {
      body: { action, session_name: sessionName },
    });
    if (fnError) throw new Error(fnError.message || 'Edge function error');
    if (data?.error) throw new Error(data.error);
    return data;
  }, [sessionName]);

  const extractPhone = (meData: any): string => {
    try {
      const id = meData?.id || meData?.me?.id || '';
      if (!id || typeof id !== 'string') return '';
      return '+' + id.replace(/@.*$/, '');
    } catch { return ''; }
  };

  const syncStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await invoke('get_session');
      const st: SessionStatus = data?.status || 'UNKNOWN';
      setStatus(st);
      onStatusChange?.(st);

      if (st === 'WORKING') {
        setQrImage(null);
        try {
          const me = await invoke('get_me');
          const phone = extractPhone(me);
          if (phone) {
            setDetectedPhone(phone);
            onLinked?.({ phone });
          }
        } catch { /* me endpoint may not be available */ }
      } else if (st === 'SCAN_QR_CODE') {
        await fetchQr();
      } else {
        setQrImage(null);
      }
    } catch (err: any) {
      // Session might not exist
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setStatus('STOPPED');
      } else {
        setError(err.message);
        setStatus('UNKNOWN');
      }
    }
  }, [invoke, onStatusChange, onLinked]);

  const fetchQr = async () => {
    try {
      const data = await invoke('get_qr');
      if (data?.qr_image) {
        setQrImage(data.qr_image);
      } else if (data?.value) {
        // QR as text/base64 from WAHA
        setQrImage(data.value);
      }
    } catch { /* QR might not be ready yet */ }
  };

  const handleAction = async (action: string, label: string) => {
    setActionLoading(action);
    setError(null);
    try {
      if (action === 'create_session') {
        await invoke('create_session');
      } else {
        await invoke(action);
      }
      // Wait a moment then sync
      setTimeout(() => syncStatus(), 2000);
    } catch (err: any) {
      setError(`Error al ${label}: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchMessages = async () => {
    try {
      const data = await invoke('get_messages');
      setMessages(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch { setMessages([]); }
  };

  // Initial sync and polling
  useEffect(() => {
    syncStatus();
    pollRef.current = setInterval(syncStatus, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [syncStatus]);

  // Fetch messages when toggled
  useEffect(() => {
    if (showMessages) fetchMessages();
  }, [showMessages]);

  // Faster polling when waiting for QR scan
  useEffect(() => {
    if (status === 'SCAN_QR_CODE') {
      const qrPoll = setInterval(() => {
        syncStatus();
        fetchQr();
      }, 5000);
      return () => clearInterval(qrPoll);
    }
  }, [status, syncStatus]);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Sesión WAHA
            </CardTitle>
            <CardDescription>Gestión de la sesión de WhatsApp ({sessionName})</CardDescription>
          </div>
          <Badge variant={status === 'WORKING' ? 'default' : 'secondary'} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* QR Code area */}
        {status === 'SCAN_QR_CODE' && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-background">
            <p className="text-sm text-muted-foreground">Escanea este código QR con WhatsApp</p>
            {qrImage ? (
              <img
                src={qrImage}
                alt="QR Code"
                className="w-64 h-64 rounded-lg border"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center border rounded-lg bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={fetchQr}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refrescar QR
            </Button>
          </div>
        )}

        {/* Connected phone info */}
        {status === 'WORKING' && detectedPhone && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <Phone className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Número vinculado</p>
              <p className="text-sm text-muted-foreground">{detectedPhone}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {(status === 'STOPPED' || status === 'UNKNOWN' || status === 'FAILED') && (
            <>
              <Button
                variant="default"
                size="sm"
                disabled={!!actionLoading}
                onClick={() => handleAction('create_session', 'crear sesión')}
              >
                {actionLoading === 'create_session' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                Crear e iniciar sesión
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!actionLoading}
                onClick={() => handleAction('start_session', 'iniciar sesión')}
              >
                {actionLoading === 'start_session' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                Iniciar
              </Button>
            </>
          )}

          {status === 'WORKING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={!!actionLoading}
                onClick={() => handleAction('stop_session', 'detener sesión')}
              >
                {actionLoading === 'stop_session' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PowerOff className="h-4 w-4 mr-1" />}
                Detener
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!!actionLoading}
                onClick={() => handleAction('logout_session', 'cerrar sesión')}
              >
                {actionLoading === 'logout_session' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogOut className="h-4 w-4 mr-1" />}
                Cerrar sesión
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              syncStatus().finally(() => setLoading(false));
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Actualizar estado
          </Button>
        </div>

        <Separator />

        {/* Messages preview toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-messages" className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            Vista rápida de mensajes
          </Label>
          <Switch
            id="show-messages"
            checked={showMessages}
            onCheckedChange={setShowMessages}
          />
        </div>

        {showMessages && (
          <ScrollArea className="h-48 rounded-lg border p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay mensajes recientes</p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className="text-xs p-2 rounded bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{msg.from || 'Desconocido'}</span>
                      <span className="text-muted-foreground">
                        {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{msg.body || msg.text || '(sin texto)'}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-center mt-2">
              <Button variant="ghost" size="sm" onClick={fetchMessages}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Recargar
              </Button>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
