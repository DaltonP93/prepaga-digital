import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, AlertCircle, Building2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  useBeneficiaries,
  useCreateBeneficiary,
  useDeleteBeneficiary,
  useUpdateBeneficiary,
} from '@/hooks/useBeneficiaries';
import { usePlans } from '@/hooks/usePlans';
import { validateEmployee, validateEmployeeDependent } from '@/lib/beneficiaryValidation';
import {
  agruparNomina,
  estaActivo,
  montoDe,
  ROL_ADHERENTE,
  ROL_EMPLEADO,
  type NominaMember,
} from '@/lib/nomina';
import {
  BeneficiaryFields,
  emptyPersonaFields,
  type PersonaFieldsData,
} from './BeneficiaryFields';

/**
 * NÓMINA de un contrato de EMPRESA.
 *
 * Una venta corporativa es UNA sola venta cuyos beneficiarios forman dos
 * niveles: cada EMPLEADO contrata su propio plan por su propio monto, y de él
 * cuelgan sus adherentes, que a su vez pueden tener otro plan y otro monto.
 *
 * POR QUÉ NO SE REUSA `SaleAdherentsTab`
 * Esa pantalla muestra una lista plana sin plan por persona, que es exactamente
 * lo correcto para una venta a persona física (ahí el plan es único y vive en
 * `sales.plan_id`). Mezclar los dos árboles en un componente habría dejado la
 * mitad de los campos condicionados. Lo que sí se comparte es todo lo que
 * importa: los campos (`BeneficiaryFields`), las reglas
 * (`beneficiaryValidation`) y el agrupador (`lib/nomina`), que es el mismo que
 * usa el motor de plantillas para imprimir el contrato.
 *
 * `sales.total_amount` NO se calcula acá: lo hace la base, con el trigger
 * `trg_recalculate_sale_total` sobre `beneficiaries`. Ver el encabezado de
 * `useBeneficiaries.ts` y la migración 20260818000001.
 */

interface SaleEmployeesTabProps {
  saleId?: string;
  disabled?: boolean;
  /** Plan de referencia de la venta: precarga el del primer empleado. */
  defaultPlanId?: string;
}

/** Fecha "YYYY-MM-DD" a "dd/mm/aaaa" sin pasar por Date: `new Date("2026-10-01")`
 *  se interpreta como UTC y en Paraguay (UTC-4) retrocede un día. */
const formatFechaCorta = (iso?: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};

const toPayload = (data: PersonaFieldsData) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  dni: data.dni,
  document_number: data.dni || null,
  relationship: data.relationship,
  gender: data.gender,
  phone: data.phone,
  email: data.email,
  address: data.address,
  barrio: data.barrio,
  city: data.city,
  amount: data.amount,
  // Las columnas `date` de Postgres no aceptan cadena vacía.
  birth_date: data.birth_date || null,
  entry_date: data.entry_date || null,
  immediate_coverage:
    data.vi === 'si' ? true : data.vi === 'no' ? false : null,
  plan_id: data.plan_id || null,
});

const fromBeneficiary = (b: any): PersonaFieldsData => ({
  ...emptyPersonaFields(),
  first_name: b.first_name || '',
  last_name: b.last_name || '',
  dni: b.dni || b.document_number || '',
  relationship: b.relationship || '',
  birth_date: b.birth_date || '',
  gender: b.gender || '',
  phone: b.phone || '',
  email: b.email || '',
  address: b.address || '',
  barrio: b.barrio || '',
  city: b.city || '',
  amount: Number(b.amount) || 0,
  entry_date: b.entry_date || '',
  vi: b.immediate_coverage === true ? 'si' : b.immediate_coverage === false ? 'no' : '',
  plan_id: b.plan_id || '',
});

type Edicion = { id: string; rol: 'empleado' | 'adherente'; data: PersonaFieldsData };

/**
 * OJO: `FormularioPersona` y `FilaPersona` van al nivel del módulo, NO dentro
 * de `SaleEmployeesTab`. Un componente declarado adentro se vuelve a crear en
 * cada render, así que React lo desmonta y lo vuelve a montar en cada tecla: el
 * input pierde el foco y no se puede escribir un nombre completo.
 */

interface FormularioPersonaProps {
  titulo: string;
  data: PersonaFieldsData;
  vinculoCon: 'titular' | 'empleado';
  plans: { id: string; name: string; price?: number | string | null }[];
  guardando: boolean;
  onChange: (patch: Partial<PersonaFieldsData>) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

const FormularioPersona: React.FC<FormularioPersonaProps> = ({
  titulo, data, vinculoCon, plans, guardando, onChange, onGuardar, onCancelar,
}) => (
  <Card className="border-primary/40">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{titulo}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <BeneficiaryFields value={data} onChange={onChange} isCompany vinculoCon={vinculoCon} plans={plans} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="button" onClick={onGuardar} disabled={guardando}>Guardar</Button>
      </div>
    </CardContent>
  </Card>
);

interface FilaPersonaProps {
  persona: NominaMember;
  rol: 'empleado' | 'adherente';
  planNombre?: string;
  disabled?: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}

const FilaPersona: React.FC<FilaPersonaProps> = ({
  persona, rol, planNombre, disabled, onEditar, onEliminar,
}) => {
  const activo = estaActivo(persona);

  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${activo ? '' : 'opacity-60'}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {persona.first_name as string} {persona.last_name as string}
          </span>
          {!activo && (
            <Badge variant="outline" className="shrink-0">
              Baja {formatFechaCorta(persona.coverage_end_date as string)}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {persona.dni ? `C.I.: ${persona.dni}` : ''}
          {persona.relationship ? ` • ${persona.relationship}` : ''}
          {planNombre ? ` • ${planNombre}` : ''}
          {` • ${formatCurrency(montoDe(persona))}`}
        </div>
      </div>

      {/* Un dado de baja no se edita ni se borra: su fila es la historia a la que
          apunta un anexo ya firmado. */}
      {!disabled && activo && (
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEditar}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Eliminar a {persona.first_name as string} {persona.last_name as string}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {rol === 'empleado'
                    ? 'Se elimina el empleado y TAMBIÉN todos sus adherentes. Esto sólo se puede hacer mientras el contrato no esté firmado; después, el camino es dar de baja por la pestaña Movimientos.'
                    : 'Se elimina el adherente de la nómina.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={onEliminar}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

const SaleEmployeesTab: React.FC<SaleEmployeesTabProps> = ({ saleId, disabled, defaultPlanId }) => {
  const { data: beneficiaries, isLoading } = useBeneficiaries(saleId || '');
  const { data: plans } = usePlans();
  const createBeneficiary = useCreateBeneficiary();
  const updateBeneficiary = useUpdateBeneficiary();
  const deleteBeneficiary = useDeleteBeneficiary();

  const [nuevoEmpleado, setNuevoEmpleado] = useState<PersonaFieldsData | null>(null);
  /** Id del empleado al que se le está agregando un adherente. */
  const [nuevoAdherenteDe, setNuevoAdherenteDe] = useState<string | null>(null);
  const [nuevoAdherente, setNuevoAdherente] = useState<PersonaFieldsData>(emptyPersonaFields());
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const planOptions = useMemo(
    () => (plans || []).map((p: any) => ({ id: p.id, name: p.name, price: p.price })),
    [plans],
  );
  const planPorId = useMemo(
    () => new Map(planOptions.map((p) => [p.id, p])),
    [planOptions],
  );

  // Orden de carga: la nómina se lee como se fue cargando. `useBeneficiaries`
  // trae descendente, así que se invierte acá y no en el hook, que lo comparten
  // otras pantallas.
  const nomina = useMemo(() => {
    const filas = [...((beneficiaries || []) as unknown as NominaMember[])].sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')),
    );
    return agruparNomina(filas);
  }, [beneficiaries]);

  const totalNomina = nomina.empleados.reduce((s, g) => s + g.subtotal, 0);
  const cantidadActivos = nomina.empleados.filter((g) => estaActivo(g.empleado)).length;

  if (!saleId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Guarde la venta primero</h3>
        <p className="text-muted-foreground">
          Debe guardar la venta en la pestaña "Básico" antes de cargar la nómina.
        </p>
      </div>
    );
  }

  /** Precarga el monto con el precio del plan, salvo que ya se haya tipeado uno. */
  const aplicarPlan = (
    actual: PersonaFieldsData,
    planId: string,
  ): Partial<PersonaFieldsData> => {
    const precio = Number(planPorId.get(planId)?.price ?? 0) || 0;
    // Sólo se pisa el monto si sigue en 0: si el vendedor ya lo escribió, mandó él.
    return actual.amount > 0 ? { plan_id: planId } : { plan_id: planId, amount: precio };
  };

  const abrirNuevoEmpleado = () => {
    const base = emptyPersonaFields();
    if (defaultPlanId) {
      Object.assign(base, aplicarPlan(base, defaultPlanId));
    }
    setNuevoEmpleado(base);
  };

  const abrirNuevoAdherente = (empleado: NominaMember) => {
    const base = emptyPersonaFields();
    // El adherente hereda el plan de su empleado; se puede cambiar a mano.
    const planHeredado = (empleado.plan_id as string) || defaultPlanId || '';
    if (planHeredado) Object.assign(base, aplicarPlan(base, planHeredado));
    setNuevoAdherente(base);
    setNuevoAdherenteDe(empleado.id);
  };

  const guardarEmpleado = async () => {
    if (!nuevoEmpleado) return;
    const error = validateEmployee({ ...nuevoEmpleado, plan_id: nuevoEmpleado.plan_id });
    if (error) return void toast.error(error);

    try {
      await createBeneficiary.mutateAsync({
        ...toPayload(nuevoEmpleado),
        sale_id: saleId,
        member_role: ROL_EMPLEADO,
        parent_beneficiary_id: null,
        is_primary: false,
      } as any);
      setNuevoEmpleado(null);
    } catch (e) {
      console.error('Error creando empleado:', e);
    }
  };

  const guardarAdherente = async () => {
    if (!nuevoAdherenteDe) return;
    const error = validateEmployeeDependent(nuevoAdherente);
    if (error) return void toast.error(error);

    try {
      await createBeneficiary.mutateAsync({
        ...toPayload(nuevoAdherente),
        sale_id: saleId,
        member_role: ROL_ADHERENTE,
        parent_beneficiary_id: nuevoAdherenteDe,
        is_primary: false,
      } as any);
      setNuevoAdherenteDe(null);
      setNuevoAdherente(emptyPersonaFields());
    } catch (e) {
      console.error('Error creando adherente:', e);
    }
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    const error =
      edicion.rol === 'empleado'
        ? validateEmployee(edicion.data)
        : validateEmployeeDependent(edicion.data);
    if (error) return void toast.error(error);

    try {
      await updateBeneficiary.mutateAsync({ id: edicion.id, ...toPayload(edicion.data) } as any);
      setEdicion(null);
    } catch (e) {
      console.error('Error actualizando la nómina:', e);
    }
  };

  const eliminar = async (id: string) => {
    try {
      await deleteBeneficiary.mutateAsync(id);
    } catch (e) {
      console.error('Error eliminando de la nómina:', e);
    }
  };

  const guardando = createBeneficiary.isPending || updateBeneficiary.isPending;

  /** El selector de plan precarga el monto, así que su patch se enriquece. */
  const conPlan = (actual: PersonaFieldsData, patch: Partial<PersonaFieldsData>) =>
    patch.plan_id !== undefined ? aplicarPlan(actual, patch.plan_id) : patch;

  const nombrePlan = (persona: NominaMember): string | undefined =>
    persona.plan_id ? planPorId.get(persona.plan_id as string)?.name : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Nómina ({cantidadActivos} empleado{cantidadActivos === 1 ? '' : 's'})
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Total: <strong className="text-foreground">{formatCurrency(totalNomina)}</strong>
          </span>
          {!disabled && !nuevoEmpleado && (
            <Button type="button" size="sm" onClick={abrirNuevoEmpleado}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar empleado
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Cada empleado contrata su propio plan por su propio monto, y de él cuelgan sus
        adherentes, que pueden tener otro plan. El total del contrato es la suma de toda
        la nómina activa y lo calcula el sistema.
      </p>

      {nuevoEmpleado && (
        <FormularioPersona
          titulo="Nuevo empleado"
          data={nuevoEmpleado}
          vinculoCon="titular"
          plans={planOptions}
          guardando={guardando}
          onChange={(patch) =>
            setNuevoEmpleado((prev) => (prev ? { ...prev, ...conPlan(prev, patch) } : prev))
          }
          onGuardar={guardarEmpleado}
          onCancelar={() => setNuevoEmpleado(null)}
        />
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Cargando la nómina...</div>
      ) : nomina.empleados.length === 0 ? (
        !nuevoEmpleado && (
          <div className="py-8 text-center text-muted-foreground">
            Todavía no hay empleados cargados. Use "Agregar empleado" para empezar.
          </div>
        )
      ) : (
        <div className="space-y-3">
          {nomina.empleados.map((grupo) => (
            <Card key={grupo.empleado.id}>
              <CardContent className="space-y-2 py-3 px-4">
                <FilaPersona
                  persona={grupo.empleado}
                  rol="empleado"
                  planNombre={nombrePlan(grupo.empleado)}
                  disabled={disabled}
                  onEditar={() =>
                    setEdicion({ id: grupo.empleado.id, rol: 'empleado', data: fromBeneficiary(grupo.empleado) })
                  }
                  onEliminar={() => eliminar(grupo.empleado.id)}
                />

                {(grupo.adherentes.length > 0 || nuevoAdherenteDe === grupo.empleado.id) && (
                  <div className="border-l-2 border-muted pl-4 ml-1 divide-y">
                    {grupo.adherentes.map((a) => (
                      <FilaPersona
                        key={a.id}
                        persona={a}
                        rol="adherente"
                        planNombre={nombrePlan(a)}
                        disabled={disabled}
                        onEditar={() => setEdicion({ id: a.id, rol: 'adherente', data: fromBeneficiary(a) })}
                        onEliminar={() => eliminar(a.id)}
                      />
                    ))}
                  </div>
                )}

                {nuevoAdherenteDe === grupo.empleado.id && (
                  <div className="pt-2">
                    <FormularioPersona
                      titulo={`Nuevo adherente de ${grupo.empleado.first_name as string}`}
                      data={nuevoAdherente}
                      vinculoCon="empleado"
                      plans={planOptions}
                      guardando={guardando}
                      onChange={(patch) => setNuevoAdherente((prev) => ({ ...prev, ...conPlan(prev, patch) }))}
                      onGuardar={guardarAdherente}
                      onCancelar={() => setNuevoAdherenteDe(null)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm text-muted-foreground">
                    Subtotal del grupo: <strong className="text-foreground">{formatCurrency(grupo.subtotal)}</strong>
                  </span>
                  {!disabled && estaActivo(grupo.empleado) && nuevoAdherenteDe !== grupo.empleado.id && (
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => abrirNuevoAdherente(grupo.empleado)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Agregar adherente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Personas cargadas antes de que la venta tuviera nómina, o cuyo empleado
          ya no está. No se ocultan: desaparecer en silencio sería peor. */}
      {nomina.sueltos.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sin empleado asignado ({nomina.sueltos.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y py-2">
            {nomina.sueltos.map((p) => (
              <FilaPersona
                key={p.id}
                persona={p}
                rol="adherente"
                planNombre={nombrePlan(p)}
                disabled={disabled}
                onEditar={() => setEdicion({ id: p.id, rol: 'adherente', data: fromBeneficiary(p) })}
                onEliminar={() => eliminar(p.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {edicion && (
        <FormularioPersona
          titulo={edicion.rol === 'empleado' ? 'Editar empleado' : 'Editar adherente'}
          data={edicion.data}
          vinculoCon={edicion.rol === 'empleado' ? 'titular' : 'empleado'}
          plans={planOptions}
          guardando={guardando}
          onChange={(patch) =>
            setEdicion((prev) =>
              prev ? { ...prev, data: { ...prev.data, ...conPlan(prev.data, patch) } } : prev,
            )
          }
          onGuardar={guardarEdicion}
          onCancelar={() => setEdicion(null)}
        />
      )}
    </div>
  );
};

export default SaleEmployeesTab;
