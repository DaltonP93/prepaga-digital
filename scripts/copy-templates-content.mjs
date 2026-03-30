import { createClient } from '@supabase/supabase-js';

const US = createClient(
  'https://ykducvvcjzdpoojxlsig.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZHVjdnZjanpkcG9vanhsc2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzgwNzQsImV4cCI6MjA4NTY1NDA3NH0.SpX3e1GgENTB3kpQPPedPds0E13vxDeOmnmFYSJhfPM'
);

const BR = createClient(
  'https://ejiycfqxgtrzaysgpzmx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg'
);

const TEMPLATES = [
  { id: '69f79118-2cfc-4d2f-9926-03e6a1cfdc89', name: 'Plan Kids',   size: 1585470 },
  { id: 'be4c34a6-b20d-42a0-8566-0516fb1e5cc7', name: 'Plan Senior', size: 1864222 },
];

const READ_CHUNK  = 50000; // 50KB leído de US por vez
const WRITE_CHUNK = 20000; // 20KB escrito en BR por vez (más conservador)

async function readFullContent(id, totalSize) {
  let content = '';
  let offset = 1;
  let remaining = totalSize;
  while (remaining > 0) {
    const length = Math.min(READ_CHUNK, remaining);
    const { data, error } = await US.rpc('get_template_content_chunk', { p_id: id, p_offset: offset, p_length: length });
    if (error) throw new Error(`RPC read error offset ${offset}: ${error.message}`);
    if (!data) break;
    content += data;
    offset += length;
    remaining -= length;
    process.stdout.write(`\r  Leyendo... ${Math.round((offset / totalSize) * 100)}%   `);
  }
  console.log();
  return content;
}

async function writeContentChunked(id, content) {
  // Reset primero
  const { error: resetErr } = await BR.rpc('upsert_template_content_chunk', { p_id: id, p_chunk: '', p_reset: true });
  if (resetErr) throw new Error(`Reset error: ${resetErr.message}`);

  let offset = 0;
  const total = content.length;
  while (offset < total) {
    const chunk = content.slice(offset, offset + WRITE_CHUNK);
    const { error } = await BR.rpc('upsert_template_content_chunk', { p_id: id, p_chunk: chunk, p_reset: false });
    if (error) throw new Error(`Write error offset ${offset}: ${error.message}`);
    offset += WRITE_CHUNK;
    process.stdout.write(`\r  Escribiendo... ${Math.round((offset / total) * 100)}%   `);
  }
  console.log();
}

// Recrear función lectura en US si fue eliminada
const { error: chkErr } = await US.rpc('get_template_content_chunk', { p_id: '69f79118-2cfc-4d2f-9926-03e6a1cfdc89', p_offset: 1, p_length: 1 });
if (chkErr && chkErr.message.includes('does not exist')) {
  console.error('Función get_template_content_chunk no existe en US — recrear via MCP primero');
  process.exit(1);
}

for (const t of TEMPLATES) {
  console.log(`\nCopiando "${t.name}" (${(t.size / 1024 / 1024).toFixed(1)}MB)...`);

  const content = await readFullContent(t.id, t.size);
  console.log(`  Leído: ${content.length} chars`);

  await writeContentChunked(t.id, content);
  console.log(`  ✅ Escrito en Brasil`);
}

console.log('\nListo!');
