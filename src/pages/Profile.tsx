
import { Layout } from "@/components/Layout";
import { ProfileForm } from "@/components/ProfileForm";

const Profile = () => {
  return (
    <Layout 
      title="Mi Perfil" 
      description="Administra tu información personal y configuración"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
          <p className="text-muted-foreground">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        <ProfileForm />
      </div>
    </Layout>
  );
};

export default Profile;
