# Planilla de liquidación de comisiones (Fase 1)

`build_plantilla_liquidacion.py` genera la planilla Excel de liquidación con las
fórmulas parametrizadas: una hoja por vendedor, `Parametros`, `Resumen` y `Leeme`.
Requiere Python 3.10+ y `openpyxl`.

```bash
# Plantilla vacía (7 vendedores, una fila en blanco por tabla)
python -I scripts/comisiones/build_plantilla_liquidacion.py --salida Comisiones_Plantilla_Vacia.xlsx

# Con los datos de una planilla vieja (formato "Comisiones Junio 2026.xlsx")
python -I scripts/comisiones/build_plantilla_liquidacion.py --salida Comisiones_Plantilla.xlsx \
  --origen "Comisiones Junio 2026.xlsx"
```

Con `--origen`, el script hace tres cosas:

- **Importa las filas al ejecutarse.** En el repo no hay datos de clientes: en el
  script solo hay parámetros (IVA, gastos administrativos, % por vendedor,
  excepciones y adicional por plan).
- **Marca los valores que no siguen la regla.** Si un G Adm, un % o un Adicional
  de la planilla vieja no coincide con lo que da la regla, lo copia en la columna
  *manual* de esa fila (en naranja). Las filas dudosas llevan una nota en `Obs`.
- **Valida los totales.** Recalcula en Python el TOTAL A COBRAR de cada hoja con
  las mismas fórmulas de la plantilla y lo compara con el de la planilla vieja.
  También compara fila por fila. Sale con código 1 si algo no cuadra.

## Diseño de cada hoja

El diseño es fijo y es el mismo que usa el exportador de la Fase 2. Si se cambia
acá, hay que cambiarlo también en `src/lib/commissions/exportLiquidacionXlsx.ts`.

- **Bloque de arriba (filas 1 a 11):** son celdas fijas. El `Resumen` las lee por
  dirección con `INDIRECT`.
- **Insumos del pie:** `B4` Viático, `B5` Recupero, `B6`/`B7` la bonificación
  (base y %), `B8` Adicional extra, `B9` Descuentos.
- **Total:** `E11` = TOTAL A COBRAR.
- **Tabla `T_<hoja>`:** encabezado en la fila 13 y datos desde la fila 14. Columnas
  A–P según el spec, y a la derecha las manuales Q `G Adm manual`, R `% manual` y
  S `Adicional manual`.

En la hoja `Leeme` de la planilla generada está cómo usarla: cambiar parámetros,
pisar una fila, agregar filas y agregar vendedores.
