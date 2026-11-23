'use client';

import { useState, type FormEvent } from 'react';

export function CajaAccessForm({recovery = false}: {recovery?: boolean}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const pin = fields.get('pin');
    if (recovery && pin !== fields.get('confirmPin')) {
      setError('Los PIN no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(recovery ? '/api/caja/recuperar' : '/api/caja/ingresar', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: fields.get('username'), pin}),
      });
      const result = await response.json() as {error?: string};
      if (!response.ok) throw new Error(result.error || 'No se pudo completar el acceso.');
      window.location.replace(recovery ? '/?pin=actualizado' : '/');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo conectar con la Caja.');
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="caja-access-form">
    {!recovery && <label>Usuario<input name="username" autoComplete="username" maxLength={64} required autoFocus /></label>}
    <label>{recovery ? 'Nuevo PIN' : 'PIN'}
      <input name="pin" type="password" inputMode="numeric" autoComplete={recovery ? 'new-password' : 'current-password'}
        minLength={4} maxLength={12} pattern="[0-9]{4,12}" required />
    </label>
    {recovery && <label>Confirmar PIN
      <input name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password"
        minLength={4} maxLength={12} pattern="[0-9]{4,12}" required />
    </label>}
    {error && <p role="alert" className="caja-access-error">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Verificando…' : recovery ? 'Guardar nuevo PIN' : 'Ingresar'}</button>
  </form>;
}
