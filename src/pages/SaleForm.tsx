
import { Layout } from "@/components/Layout";
import { SaleForm } from "@/components/SaleForm";
import { useState } from "react";

export default function SaleFormPage() {
  const [open, setOpen] = useState(true);

  return (
    <Layout title="Nueva Venta" description="Crear una nueva venta">
      <SaleForm 
        open={open} 
        onOpenChange={(openState) => {
          setOpen(openState);
          if (!openState) {
            window.history.back();
          }
        }} 
      />
    </Layout>
  );
}
