
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <Mail className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verifica tu Email</CardTitle>
          <CardDescription>
            Te hemos enviado un enlace de verificación a tu email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-700">
              Email de verificación enviado
            </p>
          </div>
          
          <div className="text-center text-sm text-gray-600">
            <p>
              Revisa tu bandeja de entrada y haz clic en el enlace para verificar tu cuenta
            </p>
          </div>

          <Button variant="outline" className="w-full">
            Reenviar Email
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Volver al Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
