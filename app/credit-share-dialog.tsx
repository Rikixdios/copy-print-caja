'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { CreditAccount } from './business-model';
import { openWhatsApp } from './business-documents';

export function CreditShareDialog({account, link, onClose}: {
  account: CreditAccount;
  link: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [disabling, setDisabling] = useState(false);

  async function disable() {
    if (!window.confirm('¿Desactivar este enlace? El cliente ya no podrá abrirlo.')) return;
    setDisabling(true);
    try {
      const token = new URL(link).pathname.split('/').at(-1);
      const response = await fetch('/api/credit-share', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token}),
      });
      if (!response.ok) throw new Error('No se pudo desactivar el enlace.');
      toast.success('Enlace desactivado');
      onClose();
    } catch {
      toast.error('No se pudo desactivar el enlace. Volvé a intentar.');
    } finally {
      setDisabling(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      toast.error('Seleccioná el enlace y copialo manualmente.');
    }
  }

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="business-dialog">
      <DialogHeader><DialogTitle>Compartir estado de cuenta</DialogTitle></DialogHeader>
      <p>Compartí este enlace con {account.name} para que pueda consultar sus compras, pagos y saldo, y descargar el PDF.</p>
      <label className="business-field">
        <span>Enlace del cliente</span>
        <input readOnly value={link} onFocus={event => event.target.select()}/>
      </label>
      <div className="business-actions">
        <Button size="sm" disabled={disabling} onClick={() => void copy()}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</Button>
        <Button size="sm" variant="outline" disabled={disabling} onClick={() => openWhatsApp(account.phone,
          `Hola ${account.name}, podés consultar tu estado de cuenta de Copy Print y descargar el PDF acá: ${link}`)}>
          Compartir por WhatsApp
        </Button>
        <Button size="sm" variant="ghost" disabled={disabling} onClick={() => void disable()}>
          Desactivar enlace
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}
