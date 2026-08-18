import { buildClientNamePayload, getClientDisplayName, getClientDocument, isCompanyClient } from '@/lib/clientUtils';
import { excludeIncorporationSales, PLAN_MATERNO_TEMPLATE, resolvePlanFieldsTemplateName, SALE_TYPE_INCORPORACION } from '@/lib/saleFilters';
import { createEnhancedTemplateContext } from '@/lib/enhancedTemplateEngine';
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
excludeIncorporationSales(queryFalsa);
check('incluye las ventas con sale_type NULL', capturado, `sale_type.is.null,sale_type.neq.${SALE_TYPE_INCORPORACION}`);
check('NO usa un neq pelado', capturado.includes('is.null'), true);

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
