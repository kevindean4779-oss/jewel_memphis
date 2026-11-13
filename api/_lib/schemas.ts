import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const token = z.string().min(20).max(200);
const code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');
const password = z.string().min(12, 'Use at least 12 characters').max(128, 'Use at most 128 characters');

export const schemas = {
  login: z.object({ email, password: z.string().min(1).max(128) }),
  mfaLogin: z.object({ mfaToken: token, code: code.optional(), backupCode: z.string().trim().max(20).optional() })
    .refine(v => Boolean(v.code || v.backupCode), 'Enter a code'),
  forgotPassword: z.object({ email }),
  resetPassword: z.object({ token, password }),
  verifyEmail: z.object({ token }),
  acceptInvite: z.object({ token, password, name: z.string().trim().max(120).optional() }),
  resendVerification: z.object({ email }),
  totpEnable: z.object({ code }),
  totpDisable: z.object({ password: z.string().min(1).max(128), code }),
  inviteUser: z.object({
    email,
    name: z.string().trim().min(1).max(120),
    role: z.enum(['admin', 'manager', 'user']).default('user'),
  }),
  updateUser: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: email.optional(),
    role: z.enum(['admin', 'manager', 'user']).optional(),
  }),
  setStatus: z.object({ status: z.enum(['active', 'suspended']) }),
  pinLogin: z.object({ pin: z.string().regex(/^\d{4,6}$/, 'Enter your 4 to 6 digit PIN') }),
  changePin: z.object({ pin: z.string().regex(/^\d{4,6}$/, 'Use a PIN of 4 to 6 digits') }),
  changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }),
};

export { password as passwordSchema };
