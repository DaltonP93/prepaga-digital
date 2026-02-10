import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { useUpdateUser } from '@/hooks/useUsers';

const NO_COMPANY_VALUE = '__none__';

export function ProfileCompanyAssignmentPanel() {
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const updateUser = useUpdateUser();

  const [selectedCompanies, setSelectedCompanies] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const visibleUsers = useMemo(
    () => users.filter((user) => user.is_active !== false),
    [users],
  );

  const getCurrentSelection = (userId: string, currentCompanyId: string | null) => {
    return selectedCompanies[userId] ?? (currentCompanyId || NO_COMPANY_VALUE);
  };

  const handleSave = async (userId: string, selectedCompanyId: string) => {
    setSavingUserId(userId);
    try {
      await updateUser.mutateAsync({
        id: userId,
        company_id: selectedCompanyId === NO_COMPANY_VALUE ? null : selectedCompanyId,
      });
      setSelectedCompanies((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } finally {
      setSavingUserId(null);
    }
  };

  if (usersLoading || companiesLoading) {
    return <p className="text-sm text-muted-foreground">Cargando usuarios y empresas...</p>;
  }

  if (visibleUsers.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay usuarios activos para configurar.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Asigna o corrige el <code>company_id</code> de cada perfil. Si el usuario no tiene empresa, no verá clientes con RLS activo.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Empresa actual</TableHead>
            <TableHead>Nueva empresa</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleUsers.map((user) => {
            const selectedValue = getCurrentSelection(user.id, user.company_id);
            const hasChanges = (user.company_id || NO_COMPANY_VALUE) !== selectedValue;
            const isSaving = savingUserId === user.id;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
                </TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{user.companies?.name || 'Sin empresa'}</TableCell>
                <TableCell>
                  <Select
                    value={selectedValue}
                    onValueChange={(value) =>
                      setSelectedCompanies((prev) => ({ ...prev, [user.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COMPANY_VALUE}>Sin empresa</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={!hasChanges || updateUser.isPending || isSaving}
                    onClick={() => handleSave(user.id, selectedValue)}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

