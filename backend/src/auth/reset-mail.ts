import { ServiceUnavailableException } from '@nestjs/common';

export const mailUnavailable = 'Password reset email is unavailable. Please ask the administrator to check the SMTP configuration.';

export function resetMailOptions(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.MAIL_PORT || 587);
  if ((env.MAIL_MAILER && env.MAIL_MAILER !== 'smtp') || !env.MAIL_HOST || !env.MAIL_FROM_ADDRESS || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ServiceUnavailableException(mailUnavailable);
  }
  const scheme = env.MAIL_SCHEME?.toLowerCase();
  const encryption = env.MAIL_ENCRYPTION?.toLowerCase();
  return {
    host: env.MAIL_HOST,
    port,
    secure: scheme === 'smtps' || encryption === 'ssl' || port === 465,
    requireTLS: encryption === 'tls' || encryption === 'starttls',
    auth: env.MAIL_USERNAME ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  };
}
