import { Resend } from 'resend';

// Sends transactional email. Never log the body: it contains one-time links.
export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export class ResendMailer implements Mailer {
  private client: Resend;
  constructor(apiKey: string, private from: string) {
    this.client = new Resend(apiKey);
  }
  async send(to: string, subject: string, text: string) {
    const { error } = await this.client.emails.send({ from: this.from, to, subject, text });
    if (error) throw new Error(`email send failed: ${error.name}`);
  }
}

export function defaultMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    // Fails closed: flows that need email report a generic failure and log the cause.
    return {
      async send() {
        throw new Error('Email is not configured (RESEND_API_KEY and EMAIL_FROM)');
      },
    };
  }
  return new ResendMailer(key, from);
}
