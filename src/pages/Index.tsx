
import { Layout } from "@/components/Layout";
import { RoleDashboard } from "@/components/RoleDashboard";

const Index = () => {
  return (
    <Layout title="Dashboard" description="Panel principal del sistema">
      <RoleDashboard />
    </Layout>
  );
};

export default Index;
