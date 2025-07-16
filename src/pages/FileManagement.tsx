import { Layout } from "@/components/Layout";
import FileManager from "@/components/FileManager";

const FileManagement = () => {
  return (
    <Layout 
      title="Gestión de Archivos" 
      description="Sube, organiza y gestiona tus archivos"
    >
      <FileManager />
    </Layout>
  );
};

export default FileManagement;