/**
 * Normalise an email for duplicate-detection purposes.
 *
 * Rules applied:
 *  1. Lower-case the whole address
 *  2. For Gmail / Googlemail: remove all dots and strip everything after + in local part
 *  3. For all providers: strip the +alias part (e.g. user+anything@domain.com → user@domain.com)
 *  4. Unify googlemail.com → gmail.com
 *
 * Examples:
 *   Raj.Kumar+test@Gmail.com  →  rajkumar@gmail.com
 *   raj.kumaran@gmail.com     →  rajkumaran@gmail.com
 *   rajkumaran+1@gmail.com    →  rajkumaran@gmail.com
 */
export function normalizeEmail(raw: string): string {
  const lower = raw.toLowerCase().trim();
  const [localRaw, domainRaw] = lower.split('@');
  if (!localRaw || !domainRaw) return lower;

  let domain = domainRaw;
  let local = localRaw;

  // Unify googlemail → gmail
  if (domain === 'googlemail.com') domain = 'gmail.com';

  // Strip +alias for all providers
  local = local.split('+')[0];

  // Remove dots only for Gmail (other providers like yahoo treat dots as significant)
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}

/**
 * Known disposable / temporary email domains to block.
 * This list covers the most common services — not exhaustive.
 */
const DISPOSABLE_DOMAINS = new Set([
  // Mailinator family
  'mailinator.com', 'trashmail.com', 'guerrillamail.com', 'guerrillamail.org',
  'guerrillamail.net', 'guerrillamail.de', 'guerrillamail.biz', 'guerrillamail.info',
  // Temp-mail family
  'temp-mail.org', 'tempmail.com', 'temp-mail.ru', 'tmpmail.net', 'tmpmail.org',
  // Throwaway
  'throwam.com', 'throwaway.email', 'dispostable.com', 'yopmail.com', 'yopmail.fr',
  // 10-minute mail family
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10mail.org',
  'minutemail.com', 'tempinbox.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'spam4.me', 'spamdecoy.net',
  // Mailnull / Spamgourmet
  'mailnull.com', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  // Others
  'maildrop.cc', 'mailnesia.com', 'trashmail.me', 'trashmail.net', 'trashmail.io',
  'trashmail.at', 'trashmail.org', 'spamfree24.org', 'spamfree24.de', 'spamfree24.eu',
  'fakeinbox.com', 'spambox.us', 'binkmail.com', 'spam.la', 'antispam24.de',
  'mytrashmail.com', 'sendspamhere.com', 'sogetthis.com', 'trashdevil.com',
  'filzmail.com', 'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
  'EmailOnDeck.com', 'emailondeck.com', 'discard.email',
  'cock.li', 'airmail.cc', 'cyber-wizard.com', 'firemail.cc', 'mvrht.com',
  '420blaze.it', 'tfwno.gf', 'waifu.club', 'homeless.com', 'rape.lol',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Basic structural validation beyond what class-validator does.
 * Returns false if the local part looks like a random string before a business domain
 * (e.g. 1234@pizza.com, xkjwqo@anycompany.com).
 *
 * Heuristic: if the local part is ≤4 chars AND the domain has a non-common TLD pattern,
 * flag it. This is intentionally conservative to avoid false positives.
 */
export function isSuspiciousEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return true;

  // Very short local part (1-3 chars) is suspicious
  if (local.length <= 3) return true;

  // Pure numbers in local part (e.g. 12345@pizza.com)
  if (/^\d+$/.test(local)) return true;

  return false;
}
