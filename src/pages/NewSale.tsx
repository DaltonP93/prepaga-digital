
import React from 'react';
import { Layout } from '@/components/Layout';
import SaleTabbedForm from '@/components/sale-form/SaleTabbedForm';

const NewSale = () => {
  return (
    <Layout title="Nueva Venta" description="Crear una nueva venta">
      <SaleTabbedForm />
    </Layout>
  );
};

export default NewSale;
