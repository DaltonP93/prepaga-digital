import { Plus, UserPlus, FileText, BarChart3, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const QuickActionsWidget = () => {
  const actions = [
    {
      title: "Nueva Venta",
      icon: Plus,
      href: "/sales",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Nuevo Cliente",
      icon: UserPlus,
      href: "/clients",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Documentos",
      icon: FileText,
      href: "/documents",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Analytics",
      icon: BarChart3,
      href: "/analytics",
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.title}
                asChild
                variant="ghost"
                className="h-auto flex-col gap-2 p-4 hover:bg-muted"
              >
                <Link to={action.href}>
                  <div className={`p-3 rounded-lg text-white ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">{action.title}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsWidget;