import { Dashboard } from './dashboard';
import { cajaSessionValid } from './caja-access';
import { CajaAccessForm } from './caja-access-form';
import { CajaAccessShell } from './caja-access-shell';

export const dynamic = 'force-dynamic';

export default async function Home({searchParams}: {searchParams: Promise<{pin?: string}>}) {
  if (await cajaSessionValid().catch(() => false)) return <Dashboard />;
  const {pin} = await searchParams;
  return <CajaAccessShell title="Acceso a Caja">
    <p>{pin === 'actualizado' ? 'PIN actualizado. Ingresá con tu nuevo PIN.' : 'Ingresá el usuario y PIN de tu equipo.'}</p>
    <CajaAccessForm />
    <a className="caja-access-link" href="/recuperar-acceso">Olvidé mi PIN</a>
  </CajaAccessShell>;
}
