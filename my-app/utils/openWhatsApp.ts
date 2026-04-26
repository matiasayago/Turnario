import { Alert, Linking } from 'react-native';

/** Deja solo dígitos para wa.me (código país sin +). */
export function normalizePhoneForWhatsApp(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/**
 * Abre WhatsApp (app o web) con el número indicado.
 * @param prefilledText opcional, mensaje inicial codificado en la URL
 */
export async function openWhatsApp(
  phone: string | undefined | null,
  prefilledText?: string
): Promise<void> {
  const n = normalizePhoneForWhatsApp(phone || '');
  if (!n) {
    Alert.alert(
      'WhatsApp',
      'Este contacto no tiene un número válido cargado. Podés pedirle el número por otros medios o actualizar el teléfono en el perfil del profesional.'
    );
    return;
  }
  const base = `https://wa.me/${n}`;
  const url =
    prefilledText && prefilledText.trim()
      ? `${base}?text=${encodeURIComponent(prefilledText.trim())}`
      : base;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp en este dispositivo.');
  }
}
