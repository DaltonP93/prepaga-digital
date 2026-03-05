import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import type { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';

type FilterState = ReturnType<typeof useAnalyticsFilters>;

interface AnalyticsFilterBarProps {
  filterState: FilterState;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({ filterState }) => {
  const {
    filters,
    companies,
    plans,
    salespersons,
    isAdminRole,
    setCompanyId,
    setPlanId,
    setSalespersonId,
    clearFilters,
    hasActiveFilters,
  } = filterState;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

      {companies.length > 0 && (
        <Select
          value={filters.companyId || '_all'}
          onValueChange={(v) => setCompanyId(v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {plans.length > 0 && (
        <Select
          value={filters.planId || '_all'}
          onValueChange={(v) => setPlanId(v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los planes</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isAdminRole && salespersons.length > 0 && (
        <Select
          value={filters.salespersonId || '_all'}
          onValueChange={(v) => setSalespersonId(v === '_all' ? undefined : v)}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los vendedores</SelectItem>
            {salespersons.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
          <X className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
};
