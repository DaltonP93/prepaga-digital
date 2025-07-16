import { Users, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClients } from '@/hooks/useClients';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const RecentClientsWidget = () => {
  const { data: clients, isLoading } = useClients();

  const recentClients = clients?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Recientes
          </CardTitle>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/clients">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentClients.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay clientes registrados</p>
            <Button size="sm" className="mt-2" asChild>
              <Link to="/clients">Agregar Cliente</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentClients.map((client) => (
              <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {client.first_name?.[0]}{client.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(client.created_at), {
                      addSuffix: true,
                      locale: es
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link to="/clients">Ver todos los clientes →</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentClientsWidget;