import { readCreditStatement, statementHeaders } from '../../../credit-share-server';
import { buildCreditStatementPdf } from '../../../credit-statement-pdf';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, {params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const statement = await readCreditStatement(token);
  if (!statement) return new Response('Enlace no disponible.', {status: 404, headers: statementHeaders});
  const pdf = await buildCreditStatementPdf(statement);
  return new Response(new Uint8Array(pdf), {
    headers: {
      ...statementHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="estado-de-cuenta-copy-print.pdf"',
    },
  });
}
