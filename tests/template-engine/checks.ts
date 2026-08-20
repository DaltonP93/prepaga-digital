import { buildClientNamePayload, getClientDisplayName, getClientDocument, isCompanyClient } from '@/lib/clientUtils';
import { excludeIncorporationSales, excludeOperationSales, PLAN_MATERNO_TEMPLATE, resolvePlanFieldsTemplateName, SALE_TYPE_CAMBIO_PLAN, SALE_TYPE_INCORPORACION } from '@/lib/saleFilters';
import { createEnhancedTemplateContext, interpolateEnhancedTemplate } from '@/lib/enhancedTemplateEngine';
import { canMutateBeneficiaries, isSaleLocked } from '@/lib/saleUtils';
import {
  getRelationshipLabel,
  isPhoneRequired,
  isRelationshipRequired,
  validateBeneficiary,
} from '@/lib/beneficiaryValidation';

let ok = 0, fail = 0;
const check = (nombre: string, real: any, esperado: any) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  bien ? ok++ : fail++;
  console.log(`  ${bien ? 'OK  ' : 'FALLA'}  ${nombre}`);
  if (!bien) console.log(`         esperado: ${JSON.stringify(esperado)}\n         obtenido: ${JSON.stringify(real)}`);
};

console.log('=== Empresas: espejo del nombre ===');
check('empresa escribe razón social en first_name',
  buildClientNamePayload({ client_type: 'empresa', razon_social: '  Frigorífico SA  ' }),
  { first_name: 'Frigorífico SA', last_name: '', razon_social: 'Frigorífico SA' });
check('persona no toca razon_social',
  buildClientNamePayload({ client_type: 'persona', first_name: ' Juan ', last_name: ' Perez ' }),
  { first_name: 'Juan', last_name: 'Perez', razon_social: null });
check('sin client_type se comporta como persona',
  buildClientNamePayload({ first_name: 'Ana', last_name: 'Lopez' }),
  { first_name: 'Ana', last_name: 'Lopez', razon_social: null });

console.log('\n=== Nombre a mostrar (código viejo sigue funcionando) ===');
const empresaGuardada = { client_type: 'empresa', ...buildClientNamePayload({ client_type: 'empresa', razon_social: 'Frigorífico SA' }), ruc: '80012345-6' };
check('helper nuevo', getClientDisplayName(empresaGuardada), 'Frigorífico SA');
check('código VIEJO (first_name + last_name)',
  `${empresaGuardada.first_name || ''} ${empresaGuardada.last_name || ''}`.trim(), 'Frigorífico SA');
check('documento de empresa = RUC', getClientDocument(empresaGuardada), '80012345-6');
check('documento de persona = C.I.', getClientDocument({ client_type: 'persona', dni: '3616083' }), '3616083');
check('isCompanyClient', [isCompanyClient(empresaGuardada), isCompanyClient({ client_type: 'persona' })], [true, false]);

console.log('\n=== Empresa: casos borde del documento ===');
check('empresa SIN ruc cargado -> vacío, no cae al dni',
  getClientDocument({ client_type: 'empresa', razon_social: 'Sin RUC SA', ruc: null, dni: '3616083' }), '');
check('empresa con ruc vacío -> vacío',
  getClientDocument({ client_type: 'empresa', ruc: '', dni: '3616083' }), '');
check('persona sin dni -> vacío',
  getClientDocument({ client_type: 'persona', dni: null }), '');
check('cliente nulo no explota',
  [getClientDocument(null), getClientDisplayName(null), isCompanyClient(null)], ['', '', false]);
check('razón social con espacios se recorta al mostrar',
  getClientDisplayName({ client_type: 'empresa', razon_social: '  Frigorífico SA  ' }), 'Frigorífico SA');

console.log('\n=== Campos con CHECK en la base: nunca cadena vacía ===');
// clients_gender_check y clients_marital_status_check aceptan NULL o un valor de
// la lista, pero NO ''. El formulario los inicializa en '' y para una empresa ni
// siquiera se muestran, así que hay que normalizarlos antes del INSERT.
// Esto replica la normalización de ClientForm.tsx (fix del error 23514).
const normalizarOpcional = (v?: string | null) => (v?.trim() ? v : null);
check('gender vacío -> null', normalizarOpcional(''), null);
check('gender solo espacios -> null', normalizarOpcional('   '), null);
check('gender undefined -> null', normalizarOpcional(undefined), null);
check('gender con valor se respeta', normalizarOpcional('Masculino'), 'Masculino');
check('marital_status vacío -> null', normalizarOpcional(''), null);

console.log('\n=== Motor de plantillas: documento del titular ===');
const ctxDe = (cliente: any) =>
  (createEnhancedTemplateContext(cliente, { name: 'Plan Beta', price: 310000 }, { name: 'SAMAP' },
    { id: 's1', total_amount: 310000, sale_date: '2026-08-17' }, []) as any).cliente;

const ctxEmpresa = ctxDe({
  client_type: 'empresa', razon_social: 'Frigorífico SA', ruc: '80012345-6',
  first_name: 'Frigorífico SA', last_name: '', dni: null,
});
check('empresa: {{cliente.documento}} = RUC', ctxEmpresa.documento, '80012345-6');
check('empresa: la etiqueta dice RUC', ctxEmpresa.documentoLabel, 'RUC');
check('empresa: {{cliente.ci}} y {{cliente.dni}} llevan el RUC (plantillas viejas)',
  [ctxEmpresa.ci, ctxEmpresa.dni], ['80012345-6', '80012345-6']);
check('empresa: nombreCompleto = razón social', ctxEmpresa.nombreCompleto, 'Frigorífico SA');
check('empresa: expone razonSocial y esEmpresa',
  [ctxEmpresa.razonSocial, ctxEmpresa.esEmpresa], ['Frigorífico SA', true]);

const ctxPersona = ctxDe({
  client_type: 'persona', first_name: 'RIKA', last_name: 'HIRANO', dni: '3616083',
});
check('persona: documento = C.I., sin cambios', ctxPersona.documento, '3616083');
check('persona: la etiqueta sigue diciendo C.I.', ctxPersona.documentoLabel, 'C.I.');
check('persona: ci/dni intactos', [ctxPersona.ci, ctxPersona.dni], ['3616083', '3616083']);
check('persona: nombreCompleto sin cambios', ctxPersona.nombreCompleto, 'RIKA HIRANO');
check('persona: ruc y razonSocial vacíos', [ctxPersona.ruc, ctxPersona.razonSocial], ['', '']);

console.log('\n=== Adicional Plan Materno: qué campos se habilitan ===');
check('con el adicional marcado manda Plan Materno, sin importar el plan',
  resolvePlanFieldsTemplateName({ maternity_bonus: true }, 'Beta'), 'Plan Materno');
check('con el adicional y SIN plan elegido igual habilita',
  resolvePlanFieldsTemplateName({ maternity_bonus: true }, null), 'Plan Materno');
check('sin adicional cae al plan elegido (comportamiento anterior)',
  resolvePlanFieldsTemplateName({ maternity_bonus: false }, 'Beta'), 'Beta');
check('sin adicional ni plan no habilita nada',
  resolvePlanFieldsTemplateName({ maternity_bonus: false }, null), null);
check('venta sin el campo se comporta como sin adicional',
  resolvePlanFieldsTemplateName({}, 'Senior Plus'), 'Senior Plus');
check('venta nula no explota',
  resolvePlanFieldsTemplateName(null, 'Alfa'), 'Alfa');
check('nombre de plan solo con espacios no habilita',
  resolvePlanFieldsTemplateName({ maternity_bonus: false }, '   '), null);
check('la constante coincide con el template real de la base',
  PLAN_MATERNO_TEMPLATE, 'Plan Materno');

console.log('\n=== Adherentes bloqueados con el contrato firmado ===');
// Sin excepciones por rol: `canMutateBeneficiaries` no recibe el rol a propósito.
// La vía legítima para sumar gente a un contrato firmado es la Incorporación.
for (const estado of ['firmado', 'firmado_parcial', 'completado']) {
  check(`${estado} -> bloqueado`, canMutateBeneficiaries({ status: estado }), false);
}
for (const estado of ['borrador', 'enviado', 'pendiente', 'en_auditoria', 'rechazado']) {
  check(`${estado} -> se puede editar`, canMutateBeneficiaries({ status: estado }), true);
}
check('venta nula no bloquea (todavía no hay contrato)', canMutateBeneficiaries(null), true);
check('estado desconocido no bloquea', canMutateBeneficiaries({ status: 'lo_que_sea' }), true);
// `isSaleLocked` responde otra pregunta y SIGUE eximiendo a los roles
// privilegiados; los dos helpers tienen que poder discrepar.
check('un admin sobre un contrato firmado: isSaleLocked=false pero no puede tocar adherentes',
  [isSaleLocked({ status: 'firmado' }, 'admin'), canMutateBeneficiaries({ status: 'firmado' })],
  [false, false]);

console.log('\n=== Validación del adherente: misma regla en los dos formularios ===');
const personaOk = { first_name: 'Ana', last_name: 'Lopez', relationship: 'hijo', phone: '981123456' };
check('persona completa es válida', validateBeneficiary(personaOk), null);
check('persona sin parentesco falla',
  validateBeneficiary({ ...personaOk, relationship: '' }), 'El parentesco es obligatorio');
check('EMPRESA sin cargo es válida (el cargo es opcional)',
  validateBeneficiary({ ...personaOk, relationship: '' }, { isCompany: true }), null);
check('el rótulo cambia según el titular',
  [getRelationshipLabel(), getRelationshipLabel({ isCompany: true })], ['Parentesco', 'Cargo']);
check('obligatoriedad del vínculo',
  [isRelationshipRequired(), isRelationshipRequired({ isCompany: true })], [true, false]);
// El teléfono se pide sólo a quien tiene que firmar: el OTP va por WhatsApp.
// Antes un formulario lo exigía siempre y el otro nunca.
check('sin teléfono y con firma requerida falla',
  validateBeneficiary({ ...personaOk, phone: '' }),
  'El teléfono es obligatorio para quien tiene que firmar');
check('sin teléfono pero sin firma requerida es válido',
  validateBeneficiary({ ...personaOk, phone: '', signature_required: false }), null);
check('signature_required sin definir se toma como true (default de la base)',
  isPhoneRequired({}), true);
check('nombre de una sola letra falla',
  validateBeneficiary({ ...personaOk, first_name: 'A' }),
  'El nombre debe tener al menos 2 caracteres');
check('nombre solo con espacios falla',
  validateBeneficiary({ ...personaOk, first_name: '   ' }),
  'El nombre debe tener al menos 2 caracteres');
check('apellido faltante falla',
  validateBeneficiary({ ...personaOk, last_name: '' }),
  'El apellido debe tener al menos 2 caracteres');

console.log('\n=== Filtro de ventas-operación ===');
let capturado = '';
const queryFalsa = { or: (f: string) => { capturado = f; return 'query'; } };
excludeOperationSales(queryFalsa);
check('excluye los DOS tipos de operacion, dejando pasar sale_type NULL', capturado,
  `sale_type.is.null,and(sale_type.neq.${SALE_TYPE_INCORPORACION},sale_type.neq.${SALE_TYPE_CAMBIO_PLAN})`);
check('NO usa un neq pelado', capturado.includes('is.null'), true);
// Con dos tipos, los neq TIENEN que ir dentro de un and(). Sueltos dentro del or()
// no excluirian nada: una venta 'alta_adherente' pasaria por cumplir neq.cambio_plan.
check('los neq van agrupados en un and()',
  /and\(sale_type\.neq\.[^,]+,sale_type\.neq\.[^)]+\)/.test(capturado), true);
// El alias viejo debe seguir existiendo: lo usan los dashboards y reportes.
capturado = '';
excludeIncorporationSales(queryFalsa);
check('el alias excludeIncorporationSales sigue excluyendo igual', capturado.includes('is.null'), true);

console.log('\n=== Anexo de Vigencia Inmediata: quién entra en la tabla ===');
// V.I. EFECTIVA = valor del adherente; si es null, hereda el de la VENTA.
// (Misma semántica que SaleAdherentsTab: null NO es "no".)
const clienteVI = { client_type: 'persona', first_name: 'RIKA', last_name: 'HIRANO', dni: '3616083' };
const adherentesVI = [
  { first_name: 'ANA', last_name: 'VI', document_number: '1', relationship: 'hijo', amount: 100000, immediate_coverage: true },
  { first_name: 'BETO', last_name: 'NOVI', document_number: '2', relationship: 'hijo', amount: 100000, immediate_coverage: false },
  { first_name: 'CARLA', last_name: 'HEREDA', document_number: '3', relationship: 'conyuge', amount: 100000, immediate_coverage: null },
];
const plantillaVI = '<ul>{{#beneficiarios_vi}}<li>{{indice}}-{{nombreCompleto}}</li>{{/beneficiarios_vi}}</ul>';
const ctxVI = (immediate: boolean) =>
  createEnhancedTemplateContext(
    clienteVI, { name: 'Plan Beta', price: 300000 }, { name: 'SAMAP' },
    { id: 's-vi', total_amount: 400000, sale_date: '2026-08-17', immediate_coverage: immediate },
    adherentesVI, undefined, {}, {},
  );

const viVentaSi = interpolateEnhancedTemplate(plantillaVI, ctxVI(true));
check('venta con V.I.: entran el titular (hereda), el adherente en true y el null (hereda)',
  viVentaSi, '<ul><li>1-RIKA HIRANO</li><li>2-ANA VI</li><li>3-CARLA HEREDA</li></ul>');
check('venta con V.I.: el adherente en false NO entra aunque la venta la tenga',
  viVentaSi.includes('BETO'), false);

const viVentaNo = interpolateEnhancedTemplate(plantillaVI, ctxVI(false));
check('venta sin V.I.: solo entra el adherente con V.I. propia en true',
  viVentaNo, '<ul><li>1-ANA VI</li></ul>');
check('venta sin V.I.: el null hereda "no" y el titular tampoco entra',
  [viVentaNo.includes('CARLA'), viVentaNo.includes('RIKA')], [false, false]);
check('el loop de todos los beneficiarios sigue listando a los 4',
  (interpolateEnhancedTemplate('<ul>{{#beneficiarios}}<li>{{nombre}}</li>{{/beneficiarios}}</ul>', ctxVI(false))
    .match(/<li>/g) || []).length, 4);

console.log('\n=== Cambio de Plan: la tabla es el SNAPSHOT, no los adherentes de hoy ===');
// A propósito los nombres del snapshot NO coinciden con los beneficiarios
// actuales del contrato: si el loop se equivocara de fuente, se notaría.
const ventaCambio = {
  id: 's-cambio', total_amount: 500000, sale_date: '2026-08-17',
  sale_type: 'cambio_plan', immediate_coverage: false,
  plan_change: {
    reason: 'mayor_cobertura',
    previous_plan_name: 'Plan Alfa', new_plan_name: 'Plan Beta',
    previous_total_amount: 400000, new_total_amount: 500000,
    new_contract_start_date: '2026-09-01',
    observations: 'Pide cobertura odontológica.',
    members: [
      { name: 'RIKA HIRANO', previous_plan: 'Plan Alfa', previous_amount: 250000, new_amount: 300000 },
      { name: 'CARLA HEREDA', previous_plan: 'Plan Alfa', previous_amount: 150000, new_amount: 200000 },
    ],
  },
};
const ctxCambio = createEnhancedTemplateContext(
  clienteVI, { name: 'Plan Beta', price: 300000 }, { name: 'SAMAP' }, ventaCambio,
  // Beneficiarios ACTUALES distintos del snapshot, para detectar la confusión.
  [{ first_name: 'ZULMA', last_name: 'NUEVA', document_number: '9', relationship: 'hijo', amount: 100000 }],
  undefined, {}, {},
);
const filasCambio = interpolateEnhancedTemplate(
  '<table>{{#integrantes_anteriores}}<tr><td>{{indice}}</td><td>{{nombre}}</td>' +
  '<td>{{planAnterior}}</td><td>{{montoAnteriorFormateado}}</td><td>{{montoNuevoFormateado}}</td></tr>' +
  '{{/integrantes_anteriores}}</table>',
  ctxCambio,
);
check('renderiza las 2 filas del snapshot', (filasCambio.match(/<tr>/g) || []).length, 2);
check('la primera fila es la del snapshot, con su plan anterior',
  filasCambio.includes('<td>1</td><td>RIKA HIRANO</td><td>Plan Alfa</td>'), true);
check('NO renderiza a los adherentes actuales del contrato',
  filasCambio.includes('ZULMA'), false);
check('el motivo sale como etiqueta legible, no como código',
  interpolateEnhancedTemplate('{{cambio.motivo}}', ctxCambio),
  'Pasar a plan de mayor cobertura');
check('la fecha de inicio no se corre un día (bug conocido #1)',
  interpolateEnhancedTemplate('{{cambio.fechaInicioNuevoContrato}}', ctxCambio), '01/09/2026');
check('planes y observaciones',
  interpolateEnhancedTemplate('{{cambio.planAnterior}}|{{cambio.planNuevo}}|{{cambio.observaciones}}', ctxCambio),
  'Plan Alfa|Plan Beta|Pide cobertura odontológica.');

console.log('\n=== No regresión: una venta normal no ve nada de esto ===');
const ctxNormal = createEnhancedTemplateContext(
  clienteVI, { name: 'Plan Beta', price: 300000 }, { name: 'SAMAP' },
  { id: 's-normal', total_amount: 400000, sale_date: '2026-08-17', immediate_coverage: false },
  adherentesVI, undefined, {}, {},
);
const plantillaVieja =
  '<p>{{titular_nombre}} | {{titular_ci}} | {{monto_total}} | {{plan.nombre}} | {{vigencia_inmediata}}</p>' +
  '<table><tbody><tr><td>{{nombre}}</td><td>{{dni}}</td><td>{{montoFormateado}}</td></tr></tbody></table>';
const renderVieja = interpolateEnhancedTemplate(plantillaVieja, ctxNormal);
check('una plantilla sin variables nuevas renderiza el titular y las 4 filas de siempre',
  [renderVieja.includes('RIKA HIRANO | 3616083'), (renderVieja.match(/<tr>/g) || []).length],
  [true, 4]);
check('sin cambio de plan, el bloque cambio queda vacío y no ensucia el texto',
  interpolateEnhancedTemplate('[{{cambio.motivo}}][{{cambio.planAnterior}}][{{cambio.fechaInicioNuevoContrato}}]', ctxNormal),
  '[][][]');
check('sin cambio de plan, el loop de integrantes no imprime filas',
  interpolateEnhancedTemplate('<table>{{#integrantes_anteriores}}<tr><td>{{nombre}}</td></tr>{{/integrantes_anteriores}}</table>', ctxNormal),
  '<table></table>');
console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
