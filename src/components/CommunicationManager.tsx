import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useCommunications } from "@/hooks/useCommunications";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";
import { Mail, MessageSquare, Send, Plus, Eye } from "lucide-react";
import { format } from "date-fns";

export const CommunicationManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: clients } = useClients();
  const {
    emailCampaigns,
    emailTemplates,
    smsCampaigns,
    communicationLogs,
    createEmailCampaign,
    sendEmailCampaign,
    createEmailTemplate,
    createSmsCampaign,
    sendSmsCampaign,
    isCreatingEmailCampaign,
    isSendingEmailCampaign,
    isCreatingSmsCampaign,
    isSendingSmsCampaign,
  } = useCommunications();

  const [emailForm, setEmailForm] = useState({
    name: "",
    subject: "",
    template_id: "",
  });

  const [smsForm, setSmsForm] = useState({
    name: "",
    message: "",
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
  });

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const handleCreateEmailCampaign = async () => {
    try {
      await createEmailCampaign.mutateAsync({
        name: emailForm.name,
        subject: emailForm.subject,
        template_id: emailForm.template_id || null,
        company_id: user?.user_metadata?.company_id || "",
        status: "draft",
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        scheduled_at: null,
        sent_at: null,
      });
      setEmailForm({ name: "", subject: "", template_id: "" });
      setIsEmailDialogOpen(false);
    } catch (error) {
      console.error("Error creating email campaign:", error);
    }
  };

  const handleSendEmailCampaign = async (campaignId: string) => {
    if (!clients || clients.length === 0) {
      toast({
        title: "Sin destinatarios",
        description: "No hay clientes disponibles para enviar emails.",
        variant: "destructive",
      });
      return;
    }

    const campaign = emailCampaigns?.find(c => c.id === campaignId);
    if (!campaign) return;

    const recipients = clients.map(client => ({
      id: client.id,
      email: client.email,
      name: `${client.first_name} ${client.last_name}`,
    }));

    try {
      await sendEmailCampaign.mutateAsync({
        campaignId,
        recipients,
        subject: campaign.subject || "",
        content: "",
        companyId: user?.user_metadata?.company_id || "",
      });
    } catch (error) {
      console.error("Error sending email campaign:", error);
    }
  };

  const handleCreateSmsCampaign = async () => {
    try {
      await createSmsCampaign.mutateAsync({
        name: smsForm.name,
        message: smsForm.message,
        company_id: user?.user_metadata?.company_id || "",
        status: "draft",
        sent_count: 0,
        scheduled_at: null,
        sent_at: null,
      });
      setSmsForm({ name: "", message: "" });
      setIsSmsDialogOpen(false);
    } catch (error) {
      console.error("Error creating SMS campaign:", error);
    }
  };

  const handleSendSmsCampaign = async (campaignId: string) => {
    if (!clients || clients.length === 0) {
      toast({
        title: "Sin destinatarios",
        description: "No hay clientes disponibles para enviar SMS.",
        variant: "destructive",
      });
      return;
    }

    const campaign = smsCampaigns?.find(c => c.id === campaignId);
    if (!campaign) return;

    const recipients = clients
      .filter(client => client.phone)
      .map(client => ({
        id: client.id,
        phone: client.phone!,
        name: `${client.first_name} ${client.last_name}`,
      }));

    if (recipients.length === 0) {
      toast({
        title: "Sin teléfonos",
        description: "No hay clientes con números de teléfono disponibles.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendSmsCampaign.mutateAsync({
        campaignId,
        recipients,
        message: campaign.message,
        companyId: user?.user_metadata?.company_id || "",
      });
    } catch (error) {
      console.error("Error sending SMS campaign:", error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await createEmailTemplate.mutateAsync({
        name: templateForm.name,
        subject: templateForm.subject,
        body: templateForm.body,
        company_id: user?.user_metadata?.company_id || "",
        is_active: true,
      });
      setTemplateForm({ name: "", subject: "", body: "" });
      setIsTemplateDialogOpen(false);
    } catch (error) {
      console.error("Error creating template:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Borrador</Badge>;
      case "sent":
        return <Badge variant="default">Enviado</Badge>;
      case "scheduled":
        return <Badge variant="outline">Programado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCommunicationStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default">Enviado</Badge>;
      case "delivered":
        return <Badge variant="secondary">Entregado</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>;
      case "pending":
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Centro de Comunicaciones</h2>
        <div className="flex gap-2">
          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Nueva Campaña Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Campaña de Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-name">Nombre de la Campaña</Label>
                  <Input
                    id="email-name"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    placeholder="Ej: Promoción de Verano"
                  />
                </div>
                <div>
                  <Label htmlFor="email-subject">Asunto</Label>
                  <Input
                    id="email-subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    placeholder="Ej: ¡Ofertas especiales para ti!"
                  />
                </div>
                <div>
                  <Label htmlFor="email-template">Template (Opcional)</Label>
                  <Select value={emailForm.template_id} onValueChange={(value) => setEmailForm({ ...emailForm, template_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateEmailCampaign} disabled={isCreatingEmailCampaign}>
                    {isCreatingEmailCampaign ? "Creando..." : "Crear Campaña"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Nueva Campaña SMS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Campaña de SMS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sms-name">Nombre de la Campaña</Label>
                  <Input
                    id="sms-name"
                    value={smsForm.name}
                    onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                    placeholder="Ej: Recordatorio de Pago"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-message">Mensaje</Label>
                  <Textarea
                    id="sms-message"
                    value={smsForm.message}
                    onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                    placeholder="Hola {{nombre}}, te recordamos que..."
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Máximo 160 caracteres. Usa &#123;&#123;nombre&#125;&#125; para personalizar.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSmsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateSmsCampaign} disabled={isCreatingSmsCampaign}>
                    {isCreatingSmsCampaign ? "Creando..." : "Crear Campaña"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Template de Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Nombre del Template</Label>
                  <Input
                    id="template-name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Ej: Bienvenida"
                  />
                </div>
                <div>
                  <Label htmlFor="template-subject">Asunto</Label>
                  <Input
                    id="template-subject"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    placeholder="Ej: ¡Bienvenido a nuestro servicio!"
                  />
                </div>
                <div>
                  <Label htmlFor="template-body">Contenido</Label>
                  <Textarea
                    id="template-body"
                    value={templateForm.body}
                    onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                    placeholder="Hola {{nombre}}, bienvenido a..."
                    rows={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Crear Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campañas Email</TabsTrigger>
          <TabsTrigger value="sms">Campañas SMS</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campañas de Email</CardTitle>
              <CardDescription>Gestiona tus campañas de marketing por email</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailCampaigns?.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.subject}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.sent_count}</TableCell>
                      <TableCell>
                        {campaign.sent_at 
                          ? format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')
                          : format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendEmailCampaign(campaign.id)}
                              disabled={isSendingEmailCampaign}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campañas de SMS</CardTitle>
              <CardDescription>Gestiona tus campañas de mensajería SMS</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smsCampaigns?.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{campaign.message}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.sent_count}</TableCell>
                      <TableCell>
                        {campaign.sent_at 
                          ? format(new Date(campaign.sent_at), 'dd/MM/yyyy HH:mm')
                          : format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm')
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {campaign.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendSmsCampaign(campaign.id)}
                              disabled={isSendingSmsCampaign}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Email</CardTitle>
              <CardDescription>Gestiona tus plantillas de email reutilizables</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailTemplates?.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Badge variant="secondary">Activo</Badge>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(template.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Comunicaciones</CardTitle>
              <CardDescription>Registro de todas las comunicaciones enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Asunto/Mensaje</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communicationLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.channel === 'email' ? (
                            <Mail className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                          {log.channel.toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.subject || log.content}
                      </TableCell>
                      <TableCell>
                        {getCommunicationStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        {log.sent_at 
                          ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm')
                          : format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
