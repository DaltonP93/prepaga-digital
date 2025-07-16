import { Layout } from '@/components/Layout';
import { SignatureWorkflowManager } from '@/components/SignatureWorkflowManager';

const SignatureWorkflow = () => {
  return (
    <Layout title="Flujo de Firmas">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Flujo de Firmas</h1>
          <p className="text-muted-foreground">
            Administra y automatiza el proceso completo de firma digital
          </p>
        </div>
        
        <SignatureWorkflowManager />
      </div>
    </Layout>
  );
};

export default SignatureWorkflow;