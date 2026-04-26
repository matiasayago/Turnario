import React, { useEffect, useState } from 'react';
import { useAppointments } from '../contexts/AppointmentContext';
import { useAuth } from '../contexts/AuthContext';
import { useReservaConSena } from '../contexts/ReservaConSenaContext';
import { ExpoDepositPaymentModal } from './ExpoDepositPaymentModal';

/**
 * Escucha notificaciones de seña (contexto) y abre el pago con Mercado Pago
 * aunque el usuario no esté en Configuración.
 */
export function DepositPaymentHost() {
  const { user } = useAuth();
  const { refreshAppointments } = useAppointments();
  const {
    shouldOpenReservaConSenaModal,
    appointmentData,
    closeReservaConSenaModal,
  } = useReservaConSena();

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<{
    appointmentId: string;
    depositAmount: number;
    summary?: {
      service?: string;
      professional?: string;
      date?: string;
      time?: string;
    };
  } | null>(null);

  const isProfessional = user?.userType === 'professional';

  useEffect(() => {
    if (!shouldOpenReservaConSenaModal || isProfessional) return;

    const aid = appointmentData?.appointmentId && String(appointmentData.appointmentId);
    const isMongo = aid && /^[a-fA-F0-9]{24}$/.test(aid);
    if (!isMongo) return;

    const dep = Number(appointmentData.depositAmount);
    setPayload({
      appointmentId: aid,
      depositAmount: Number.isFinite(dep) && dep > 0 ? dep : 2000,
      summary: {
        service: appointmentData.service,
        professional:
          appointmentData.professional || appointmentData.professionalName,
        date: appointmentData.date,
        time: appointmentData.time,
      },
    });
    setVisible(true);
    const t = setTimeout(() => closeReservaConSenaModal(), 100);
    return () => clearTimeout(t);
  }, [
    shouldOpenReservaConSenaModal,
    isProfessional,
    appointmentData,
    closeReservaConSenaModal,
  ]);

  return (
    <ExpoDepositPaymentModal
      visible={visible}
      onClose={() => {
        setVisible(false);
        setPayload(null);
      }}
      appointmentId={payload?.appointmentId || ''}
      depositAmount={payload?.depositAmount || 0}
      summary={payload?.summary}
      onPaymentConfirmed={() => refreshAppointments()}
    />
  );
}
