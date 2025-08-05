
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { CombinedRequestForm } from '@/components/CombinedRequestForm';

const CombinedRequest = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/sales', { 
      state: { message: 'Solicitud procesada exitosamente' }
    });
  };

  return (
    <Layout title="Nueva Solicitud" description="Formulario unificado de solicitud con firma digital">
      <div className="container mx-auto py-6">
        <CombinedRequestForm onComplete={handleComplete} />
      </div>
    </Layout>
  );
};

export default CombinedRequest;
