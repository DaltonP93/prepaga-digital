
import { Layout } from "@/components/Layout";
import { SaleForm } from "@/components/SaleForm";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SaleFormPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleOpenChange = (openState: boolean) => {
    setOpen(openState);
    if (!openState) {
      navigate('/sales');
    }
  };

  return (
    <Layout title="Nueva Venta" description="Crear una nueva venta">
      <div className="container mx-auto py-6">
        <SaleForm 
          open={open} 
          onOpenChange={handleOpenChange}
        />
      </div>
    </Layout>
  );
}
