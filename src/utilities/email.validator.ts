import dns from 'dns/promises';

const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'temp-mail.org',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  // Add more disposable domains here as needed
];

export const EmailValidator = {
  /**
   * Performs advanced validation on an email address.
   * Checks syntax, disposable domains, and MX records.
   */
  async validateAdvanced(email: string): Promise<boolean> {
    if (!email || typeof email !== 'string') return false;

    // 1. Basic syntax check (handled by Joi as well, but good to ensure here)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw { statusCode: 400, message: 'Invalid email format' };
    }

    const domain = email.split('@')[1].toLowerCase();

    // 2. Block disposable email providers
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      throw { statusCode: 400, message: 'Disposable email addresses are not allowed' };
    }

    // 3. Check for MX records (Domain exists and accepts mail)
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        throw { statusCode: 400, message: 'Email domain does not have active mail servers' };
      }
    } catch (error: any) {
      // If DNS resolution fails entirely (e.g. domain doesn't exist)
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        throw { statusCode: 400, message: 'Email domain does not exist or is invalid' };
      }
      // For network errors during DNS check, we might want to log it and optionally allow
      // to avoid blocking signups during temporary DNS issues, but strict validation throws here.
      throw { statusCode: 400, message: 'Failed to verify email domain' };
    }

    return true;
  }
};
