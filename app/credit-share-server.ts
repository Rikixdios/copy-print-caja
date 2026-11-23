import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { appState, creditLinks } from '../db/schema';
import { randomToken } from './caja-access';
import { creditStatement, type CreditStatementStore } from './credit-statement';

export const statementHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
};

export const creditTokenPattern = /^[a-f0-9]{64}$/;

export async function getOrCreateCreditLink(accountId: string) {
  const db = getDb();
  await db.insert(creditLinks).values({accountId, token: randomToken()})
    .onConflictDoNothing({target: creditLinks.accountId});
  const [link] = await db.select({token: creditLinks.token}).from(creditLinks)
    .where(eq(creditLinks.accountId, accountId)).limit(1);
  return link?.token;
}

export async function disableCreditLink(token: string) {
  await getDb().delete(creditLinks).where(eq(creditLinks.token, token));
}

export async function readCreditStore(): Promise<CreditStatementStore> {
  const [row] = await getDb().select({payload: appState.payload}).from(appState)
    .where(eq(appState.id, 1)).limit(1);
  return row ? JSON.parse(row.payload) : {};
}

export async function readCreditStatement(token: string) {
  if (!creditTokenPattern.test(token)) return null;
  const [link] = await getDb().select({accountId: creditLinks.accountId}).from(creditLinks)
    .where(eq(creditLinks.token, token)).limit(1);
  return link ? creditStatement(await readCreditStore(), link.accountId) : null;
}
