import { recoveryEmailAuthorized } from '../caja-access';
import { CajaAccessForm } from '../caja-access-form';
import { CajaAccessShell } from '../caja-access-shell';
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from '../chatgpt-auth';

export const dynamic = 'force-dynamic';
const path = '/recuperar-acceso';

export default async function RecoverCajaAccess() {
  const user = await getChatGPTUser();
  const authorized = await recoveryEmailAuthorized();
  return <CajaAccessShell title="Recuperar acceso">
    {authorized ? <>
      <p>Identidad verificada. Elegí un nuevo PIN para la Caja.</p>
      <CajaAccessForm recovery />
    </> : <>
      <p>{user ? 'Este correo no está autorizado para recuperar el acceso.' : 'Verificá tu identidad con uno de los dos correos autorizados de Copy Print.'}</p>
      <a className="caja-access-primary" href={user ? chatGPTSignOutPath(path) : chatGPTSignInPath(path)} target="_top">
        {user ? 'Usar otra cuenta' : 'Verificar mi correo'}
      </a>
    </>}
    <a className="caja-access-link" href="/">Volver al acceso</a>
  </CajaAccessShell>;
}
