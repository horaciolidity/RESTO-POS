import { useEffect, useState } from 'react';
import { Payment } from '@mercadopago/sdk-react';
import { initMercadoPago } from '@mercadopago/sdk-react';

interface MPPaymentBrickProps {
  preferenceId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onReady?: () => void;
}

export function MPPaymentBrick({ preferenceId, amount, onSuccess, onError, onReady }: MPPaymentBrickProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize MercadoPago SDK with the Public Key
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'es-AR' });
    } else {
      console.error('MercadoPago Public Key not found in environment variables');
    }
  }, []);

  const initialization = {
    amount: amount,
    preferenceId: preferenceId,
  };

  const customization = {
    paymentMethods: {
      ticket: "all" as const,
      bankTransfer: "all" as const,
      creditCard: "all" as const,
      debitCard: "all" as const,
      mercadoPago: "all" as const,
    },
  };

  const onSubmit = async (
    { formData }: any,
  ) => {
    // In Bricks with preferenceId, the payment processing is handled automatically by MP.
    // We just return a resolved promise to satisfy the onSubmit signature if needed,
    // or let the SDK handle it entirely.
    return new Promise((resolve, reject) => {
      fetch("/process_payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((response) => {
          // recibir el resultado del pago
          if (onSuccess) onSuccess();
          resolve(response);
        })
        .catch((error) => {
          // manejar la respuesta de error al intentar crear el pago
          reject(error);
        });
    });
  };

  const onErrorHandler = (error: any) => {
    console.error('MercadoPago Brick Error:', error);
    if (onError) onError(error);
  };

  const onReadyHandler = () => {
    setIsReady(true);
    if (onReady) onReady();
  };

  return (
    <div className="w-full">
      {!isReady && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <Payment
        initialization={initialization}
        customization={customization}
        onSubmit={onSubmit}
        onReady={onReadyHandler}
        onError={onErrorHandler}
      />
    </div>
  );
}
