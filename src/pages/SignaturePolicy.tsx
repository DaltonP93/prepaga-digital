import PublicLayout from "@/layouts/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Scale, FileCheck, Lock, Eye, AlertTriangle, BookOpen } from "lucide-react";

const SignaturePolicy = () => {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Política de Firma Electrónica</h1>
          <p className="text-muted-foreground">Versión 1.0 — Vigente desde febrero 2026</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              1. Definición de Firma Electrónica
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>
              La firma electrónica utilizada en este sistema constituye un mecanismo de autenticación
              que vincula al firmante con el documento electrónico, conforme a lo establecido en la
              <strong> Ley N° 4017/2010</strong> de la República del Paraguay sobre validez jurídica
              de la firma electrónica, la firma digital, los mensajes de datos y el expediente electrónico.
            </p>
            <p>
              El sistema implementa una firma electrónica de nivel avanzado (referencial eIDAS), que cumple
              con los principios de la UNCITRAL sobre firmas electrónicas y se alinea con los estándares
              ISO 14533 (firma electrónica) e ISO 27001 (seguridad de la información).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              2. Método de Identificación
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>Antes de firmar, el sistema verifica la identidad del firmante mediante:</p>
            <ul>
              <li><strong>Verificación de doble factor (OTP):</strong> Se envía un código de un solo uso
                al correo electrónico registrado del firmante. El código tiene una validez de 5 minutos
                y un máximo de 3 intentos de verificación.</li>
              <li><strong>Enlace único:</strong> Cada firmante accede mediante un token único con fecha
                de expiración, vinculado exclusivamente a su identidad y documentos asignados.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              3. Evidencias Almacenadas
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>Para cada firma electrónica, el sistema registra y almacena de forma inmutable:</p>
            <ul>
              <li><strong>Identificador único de firma:</strong> UUID v4 generado criptográficamente</li>
              <li><strong>Marca de tiempo:</strong> Timestamp ISO 8601 del momento exacto de la firma</li>
              <li><strong>Dirección IP:</strong> IPv4/IPv6 del dispositivo del firmante</li>
              <li><strong>Huella del dispositivo:</strong> User Agent del navegador</li>
              <li><strong>Hash del documento:</strong> SHA-256 del contenido firmado</li>
              <li><strong>Registro de verificación de identidad:</strong> Método OTP, resultado y marca de tiempo</li>
              <li><strong>Registro de consentimiento:</strong> Texto legal aceptado, versión y checkbox state</li>
              <li><strong>Paquete de evidencia (Evidence Bundle):</strong> JSON inmutable con hash propio</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              4. Procedimiento de Verificación
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>La integridad de un documento firmado puede verificarse mediante:</p>
            <ol>
              <li>Recalcular el hash SHA-256 del contenido del documento</li>
              <li>Comparar con el hash almacenado en el registro de firma (signature_events)</li>
              <li>Verificar el paquete de evidencia contra su hash propio</li>
              <li>Consultar el registro de verificación de identidad asociado</li>
            </ol>
            <p>
              Cualquier modificación posterior al documento resultará en un hash diferente,
              evidenciando la alteración.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              5. Proceso de Revocación
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>
              Los enlaces de firma pueden ser revocados por el vendedor o administrador autorizado
              en cualquier momento antes de la expiración del enlace. La revocación:
            </p>
            <ul>
              <li>Invalida inmediatamente el token de acceso</li>
              <li>Registra la razón de revocación, el usuario que la ejecutó y la marca de tiempo</li>
              <li>Permite la generación de un nuevo enlace de firma si es necesario</li>
              <li>Mantiene el registro histórico de la firma anterior para auditoría</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              6. Conservación de Registros
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>
              Todos los registros de firma, verificación de identidad, consentimiento y paquetes
              de evidencia son almacenados de forma permanente e inmutable en la base de datos
              del sistema, garantizando:
            </p>
            <ul>
              <li>Integridad referencial mediante claves foráneas</li>
              <li>Control de acceso mediante Row-Level Security (RLS)</li>
              <li>Trazabilidad completa del proceso de firma</li>
              <li>Disponibilidad para auditorías y procedimientos legales</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              7. Base Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <ul>
              <li><strong>Ley N° 4017/2010</strong> — Validez jurídica de la firma electrónica,
                firma digital, mensajes de datos y expediente electrónico (Paraguay)</li>
              <li><strong>Ley Modelo UNCITRAL</strong> — Sobre firmas electrónicas (2001)</li>
              <li><strong>ISO 27001</strong> — Seguridad de la información</li>
              <li><strong>ISO 14533</strong> — Perfiles de firma electrónica</li>
              <li><strong>ISO 29100</strong> — Marco de privacidad</li>
              <li><strong>eIDAS (referencial)</strong> — Nivel de firma electrónica avanzada</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              8. Estándares Técnicos
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-3">
            <p>El sistema cumple con los siguientes principios técnicos:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">ISO 27001</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Control de acceso</li>
                  <li>✓ Integridad de registros</li>
                  <li>✓ Trazabilidad</li>
                  <li>✓ Protección de datos</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">ISO 14533</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Vinculación firmante-doc</li>
                  <li>✓ Control exclusivo</li>
                  <li>✓ Detección de cambios</li>
                  <li>✓ Verificabilidad</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">ISO 29100</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Finalidad específica</li>
                  <li>✓ Minimización de datos</li>
                  <li>✓ Consentimiento informado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground pb-8">
          © {new Date().getFullYear()} Prepaga Digital — Todos los derechos reservados
        </p>
      </div>
    </PublicLayout>
  );
};

export default SignaturePolicy;
