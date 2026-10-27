export type SignupEvent =
  | { event: 'FINISH'; assets: { waba_id: string; phone_number_id: string } }
  | { event: 'CANCEL' | 'INCOMPLETE' };

export function parseSignupEvent(origin: string, raw: unknown): SignupEvent | null {
  if (!['https://www.facebook.com', 'https://web.facebook.com', 'https://business.facebook.com'].includes(origin)) return null;
  let message;
  try { message = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!message || typeof message !== 'object' || message.type !== 'WA_EMBEDDED_SIGNUP') return null;
  if (message.event === 'FINISH') {
    const values = message.data;
    if (!values || typeof values.waba_id !== 'string' || typeof values.phone_number_id !== 'string' || !/^[0-9]{5,30}$/.test(values.waba_id) || !/^[0-9]{5,30}$/.test(values.phone_number_id)) return { event: 'INCOMPLETE' };
    return { event: 'FINISH', assets: { waba_id: values.waba_id, phone_number_id: values.phone_number_id } };
  }
  if (message.event === 'CANCEL') return { event: 'CANCEL' };
  if (['ERROR', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'].includes(message.event)) return { event: 'INCOMPLETE' };
  return null;
}
