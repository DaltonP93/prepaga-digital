
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Filter, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface FilterOptions {
  search: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  company?: string;
  plan?: string;
}

interface SearchAndFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  companyOptions?: Array<{ value: string; label: string }>;
  planOptions?: Array<{ value: string; label: string }>;
  onExport?: () => void;
  showExport?: boolean;
}

export const SearchAndFilters = ({
  filters,
  onFiltersChange,
  statusOptions = [],
  companyOptions = [],
  planOptions = [],
  onExport,
  showExport = false,
}: SearchAndFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof FilterOptions) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({ search: '' });
  };

  const getActiveFiltersCount = () => {
    const { search, ...otherFilters } = filters;
    return Object.values(otherFilters).filter(value => value !== undefined && value !== '').length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {showExport && onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Estado: {statusOptions.find(s => s.value === filters.status)?.label || filters.status}
              <button onClick={() => clearFilter('status')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.company && (
            <Badge variant="secondary" className="gap-1">
              Empresa: {companyOptions.find(c => c.value === filters.company)?.label || filters.company}
              <button onClick={() => clearFilter('company')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.plan && (
            <Badge variant="secondary" className="gap-1">
              Plan: {planOptions.find(p => p.value === filters.plan)?.label || filters.plan}
              <button onClick={() => clearFilter('plan')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              Fecha: {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yyyy', { locale: es }) : '...'} - {filters.dateTo ? format(filters.dateTo, 'dd/MM/yyyy', { locale: es }) : '...'}
              <button onClick={() => {
                clearFilter('dateFrom');
                clearFilter('dateTo');
              }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              {statusOptions.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado</label>
                  <Select value={filters.status || ''} onValueChange={(value) => updateFilter('status', value || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los estados</SelectItem>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Company Filter */}
              {companyOptions.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Empresa</label>
                  <Select value={filters.company || ''} onValueChange={(value) => updateFilter('company', value || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las empresas</SelectItem>
                      {companyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Plan Filter */}
              {planOptions.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Plan</label>
                  <Select value={filters.plan || ''} onValueChange={(value) => updateFilter('plan', value || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los planes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los planes</SelectItem>
                      {planOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rango de fechas</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {filters.dateFrom ? format(filters.dateFrom, 'dd/MM', { locale: es }) : 'Desde'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => updateFilter('dateFrom', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {filters.dateTo ? format(filters.dateTo, 'dd/MM', { locale: es }) : 'Hasta'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => updateFilter('dateTo', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
