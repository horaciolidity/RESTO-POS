import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function ScanOrderHandler() {
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderNum, setOrderNum] = useState('');

  useEffect(() => {
    async function processScan() {
      if (!orderId) {
        setStatus('error');
        setErrorMsg('ID de pedido inválido.');
        return;
      }

      try {
        // 1. Get the order to verify and show the number
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('order_number, status')
          .eq('id', orderId)
          .single();

        if (fetchError || !order) {
          setStatus('error');
          setErrorMsg('No se encontró el pedido.');
          return;
        }

        setOrderNum(order.order_number);

        // 2. Update status to 'listo'
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'listo' })
          .eq('id', orderId);

        if (updateError) {
          setStatus('error');
          setErrorMsg('Error al actualizar el estado.');
          return;
        }

        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Error inesperado.');
      }
    }

    processScan();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      {status === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Procesando código QR...</h2>
          <p className="text-xs text-slate-400">Actualizando estado de la comanda en tiempo real</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-emerald-400">¡Pedido Listo!</h1>
            <p className="text-sm text-slate-400 mt-2">La comanda número se actualizó con éxito.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Número de Turno</p>
            <p className="text-5xl font-black text-primary mt-1">{orderNum}</p>
          </div>
          <p className="text-xs text-slate-400">Aparecerá inmediatamente en la pantalla de turnos listos.</p>
          <div className="pt-4">
            <Link to="/" className="text-xs text-primary font-bold hover:underline">Ir al Panel Principal</Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-red-400">Error al escanear</h1>
            <p className="text-xs text-slate-400 mt-2">{errorMsg}</p>
          </div>
          <div className="pt-4">
            <Link to="/" className="text-xs text-primary font-bold hover:underline">Ir al Panel Principal</Link>
          </div>
        </div>
      )}
    </div>
  );
}
