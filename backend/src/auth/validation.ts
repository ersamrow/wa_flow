import { UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

export function validate<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) (errors[String(issue.path[0] ?? 'form')] ??= []).push(issue.message);
    throw new UnprocessableEntityException({ message: 'The given data was invalid.', errors });
  }
  return result.data;
}

export const password = z.string().min(10).max(200).regex(/[a-z]/i, 'Password must include a letter.').regex(/[0-9]/, 'Password must include a number.');
export const registration = z.object({ name: z.string().trim().min(1).max(100), business: z.string().trim().min(1).max(100), email: z.string().email().max(255).transform(v => v.toLowerCase()), password, password_confirmation: z.string() }).refine(v => v.password === v.password_confirmation, { path: ['password'], message: 'The password confirmation does not match.' });
