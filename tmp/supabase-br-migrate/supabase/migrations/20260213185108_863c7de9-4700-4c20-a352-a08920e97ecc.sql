
UPDATE templates 
SET content = REPLACE(
  REPLACE(
    content, 
    'Razón Social: ________________________________________', 
    'Razón Social: <strong>{{facturacion.razonSocial}}</strong>'
  ), 
  'R.U.C: ________________________________________', 
  'R.U.C: <strong>{{facturacion.ruc}}</strong>'
)
WHERE id = 'f66ef9fe-79e1-416e-88ae-304066126037';
