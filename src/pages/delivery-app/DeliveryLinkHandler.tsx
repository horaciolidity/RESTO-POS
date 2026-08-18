import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { useAuthStore, UserProfile } from '../../store/useAuthStore';
import { MapPin } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function DeliveryLinkHandler() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleLink() {
      if (!employeeId) {
        setError("Enlace inválido");
        return;
      }

      try {
        if (isSupabaseConfigured()) {
          // Busca el empleado público
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, first_name, last_name, role, tenant_id, branch_id')
            .eq('id', employeeId)
            .single();

          if (empError || !employee) {
            setError("No se encontró el repartidor o el enlace expiró");
            return;
          }

          // Busca los datos del tenant
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', employee.tenant_id)
            .single();

          const simulatedProfile: UserProfile = {
            id: employee.id,
            name: `${employee.first_name} ${employee.last_name}`,
            email: `delivery_${employee.id}@local`,
            role: 'delivery',
            branchId: employee.branch_id,
            branchName: 'Sucursal',
            tenantId: employee.tenant_id,
            tenantName: tenant?.name || 'Restaurante',
            planType: 'pro', // Simulated
          };

          sessionStorage.setItem('simulated_delivery', JSON.stringify(simulatedProfile));
          await initialize(); // Reloads auth state to pick up the simulated profile
          navigate('/repartidor', { replace: true });

        } else {
          // Demo local mode
          const { employees, businessName } = useSettingsStore.getState();
          const localEmp = employees.find(e => e.id === employeeId);
          if (localEmp) {
            const simulatedProfile: UserProfile = {
              id: localEmp.id,
              name: `${localEmp.firstName} ${localEmp.lastName}`,
              email: `delivery_${localEmp.id}@local`,
              role: 'delivery',
              branchId: 'local-branch',
              branchName: 'Local',
              tenantId: 'local-tenant',
              tenantName: businessName,
              planType: 'pro',
            };
            sessionStorage.setItem('simulated_delivery', JSON.stringify(simulatedProfile));
            await initialize();
            navigate('/repartidor', { replace: true });
          } else {
            setError("No se encontró el repartidor en modo local");
          }
        }
      } catch (err) {
        console.error("Error setting up delivery link:", err);
        setError("Ocurrió un error al cargar la app.");
      }
    }

    handleLink();
  }, [employeeId, navigate, initialize]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 font-bold text-2xl">
          !
        </div>
        <p className="font-bold text-lg text-foreground">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <MapPin className="w-12 h-12 text-primary mx-auto animate-bounce" />
        <p className="text-muted-foreground text-sm font-semibold">Abriendo app de repartidor...</p>
      </div>
    </div>
  );
}
