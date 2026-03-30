import { createClient } from '@supabase/supabase-js';

const US = createClient(
  'https://ykducvvcjzdpoojxlsig.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZHVjdnZjanpkcG9vanhsc2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzgwNzQsImV4cCI6MjA4NTY1NDA3NH0.SpX3e1GgENTB3kpQPPedPds0E13vxDeOmnmFYSJhfPM'
);

const BR = createClient(
  'https://ejiycfqxgtrzaysgpzmx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg'
);

// Templates to copy (new ones) and update (existing with newer versions in US)
const TEMPLATE_IDS = [
  '69f79118-2cfc-4d2f-9926-03e6a1cfdc89', // Plan Kids (nuevo)
  'be4c34a6-b20d-42a0-8566-0516fb1e5cc7', // Plan Senior (nuevo)
  '0ad77389-6ec7-40d1-8f25-1ab7ba9a07af', // Plan Senior v2 (nuevo)
  'f66ef9fe-79e1-416e-88ae-304066126037', // CONTRATO (actualizar)
  '784e7d0e-8001-48a6-a44d-945722293fc4', // DDJJ (actualizar)
];

console.log('Leyendo templates de US...');
const { data: templates, error } = await US
  .from('templates')
  .select('*')
  .in('id', TEMPLATE_IDS);

if (error) {
  console.error('Error leyendo US:', error.message);
  process.exit(1);
}

console.log(`Encontrados ${templates.length} templates en US`);

for (const t of templates) {
  console.log(`\nProcesando: "${t.name}" (${t.id})`);

  // Check if exists in Brazil
  const { data: existing } = await BR.from('templates').select('id, updated_at').eq('id', t.id).single();

  if (existing) {
    // Update
    const { error: updateError } = await BR.from('templates').update({
      name: t.name,
      description: t.description,
      content: t.content,
      is_active: t.is_active,
      version: t.version,
      template_type: t.template_type,
      uses_dynamic_fields: t.uses_dynamic_fields,
      pdf_layout: t.pdf_layout,
      requires_signature: t.requires_signature,
      designer_version: t.designer_version,
      render_engine: t.render_engine,
      updated_at: t.updated_at,
    }).eq('id', t.id);

    if (updateError) {
      console.error(`  ❌ Error actualizando: ${updateError.message}`);
    } else {
      console.log(`  ✅ Actualizado (era ${existing.updated_at}, ahora ${t.updated_at})`);
    }
  } else {
    // Insert new
    const { error: insertError } = await BR.from('templates').insert({
      id: t.id,
      company_id: t.company_id,
      name: t.name,
      description: t.description,
      content: t.content,
      is_active: t.is_active,
      version: t.version,
      created_by: t.created_by,
      template_type: t.template_type,
      uses_dynamic_fields: t.uses_dynamic_fields,
      pdf_layout: t.pdf_layout,
      requires_signature: t.requires_signature,
      designer_version: t.designer_version,
      render_engine: t.render_engine,
      published_version_id: t.published_version_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
    });

    if (insertError) {
      console.error(`  ❌ Error insertando: ${insertError.message}`);
    } else {
      console.log(`  ✅ Insertado nuevo`);
    }
  }
}

console.log('\nListo!');
