'use client';

import { useState, useTransition } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setUserFrozenAction, resetTotpAction } from '../actions';

interface WalletSummary {
  id: string;
  balance: number;
  currency: string;
}

interface AdminUserSummary {
  id: string;
  email: string;
  role: string;
  isFrozen: boolean;
  fullName: string | null;
  kycStatus: string | null;
  totpEnabled: boolean;
  wallets: WalletSummary[];
}

interface Props {
  initialUsers: AdminUserSummary[];
}

export function UserAdminPanel({ initialUsers }: Props) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(initialUsers[0] ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    if (!query) {
      setMessage('Arama için e-posta veya ad girin.');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Kullanıcılar getirilemedi');
        }
        const data = (await response.json()) as { users: AdminUserSummary[] };
        setUsers(data.users);
        setSelectedUser(data.users[0] ?? null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Arama başarısız oldu.');
      }
    });
  };

  const applyUserUpdate = (user: AdminUserSummary) => {
    setUsers((prev) => prev.map((item) => (item.id === user.id ? user : item)));
    setSelectedUser((prev) => (prev && prev.id === user.id ? user : prev));
  };

  const handleFreeze = (frozen: boolean) => {
    if (!selectedUser) {
      setMessage('Önce bir kullanıcı seçin.');
      return;
    }
    setMessage(null);
    const snapshot = selectedUser;
    applyUserUpdate({ ...selectedUser, isFrozen: frozen });
    startTransition(async () => {
      try {
        const updated = await setUserFrozenAction({ userId: snapshot.id, frozen });
        applyUserUpdate({ ...snapshot, isFrozen: updated.isFrozen });
        setMessage(`Kullanıcı ${frozen ? 'donduruldu' : 'aktif'} durumuna alındı.`);
      } catch (error) {
        applyUserUpdate(snapshot);
        setMessage(error instanceof Error ? error.message : 'Kullanıcı güncellenemedi.');
      }
    });
  };

  const handleResetTotp = () => {
    if (!selectedUser) {
      setMessage('Önce bir kullanıcı seçin.');
      return;
    }
    setMessage(null);
    const snapshot = selectedUser;
    applyUserUpdate({ ...selectedUser, totpEnabled: false });
    startTransition(async () => {
      try {
        await resetTotpAction({ userId: snapshot.id });
        applyUserUpdate({ ...snapshot, totpEnabled: false });
        setMessage('2FA sıfırlandı.');
      } catch (error) {
        applyUserUpdate(snapshot);
        setMessage(error instanceof Error ? error.message : '2FA sıfırlanamadı.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Kullanıcı Yönetimi</h2>
        <p className="text-sm text-slate-600">
          Cüzdan bakiyelerini inceleyin, KYC durumuna bakın ve riskli hesapları dondurun.
        </p>
      </header>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="E-posta veya ad"
          className="md:w-72"
        />
        <Button size="sm" disabled={isPending} onClick={handleSearch}>
          Ara
        </Button>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sonuçlar</p>
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">Eşleşen kullanıcı bulunamadı.</p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-slate-400 ${
                    selectedUser?.id === user.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{user.fullName ?? user.email}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-400">KYC: {user.kycStatus ?? '—'} · Rol: {user.role}</p>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seçilen</p>
          {selectedUser ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{selectedUser.fullName ?? selectedUser.email}</p>
                <p className="text-xs text-slate-500">{selectedUser.email}</p>
                <p className="text-xs text-slate-500">Durum: {selectedUser.isFrozen ? 'Dondurulmuş' : 'Aktif'}</p>
                <p className="text-xs text-slate-500">2FA: {selectedUser.totpEnabled ? 'Aktif' : 'Pasif'}</p>
                <div className="mt-3 space-y-2">
                  {selectedUser.wallets.map((wallet) => (
                    <div key={wallet.id} className="rounded border border-slate-200 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{wallet.currency}</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {wallet.balance.toLocaleString('tr-TR', { style: 'currency', currency: wallet.currency })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleFreeze(!selectedUser.isFrozen)}>
                  {selectedUser.isFrozen ? 'Çöz' : 'Dondur'}
                </Button>
                <Button size="sm" variant="ghost" disabled={isPending} onClick={handleResetTotp}>
                  2FA Sıfırla
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Detay görmek için sonuç listesinden seçim yapın.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
