'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type PendingProfile = {
  id: string;
  fullName: string | null;
  nationalId: string | null;
  phoneNumber: string | null;
  kycSubmittedAt: string | null;
  selfieObjectKey: string | null;
  idFrontObjectKey: string | null;
  idBackObjectKey: string | null;
  user: { email: string };
};

interface Props {
  profiles: PendingProfile[];
}

export function KycReviewQueue({ profiles }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDecision = (profileId: string, decision: 'APPROVE' | 'REJECT') => {
    const reason =
      decision === 'REJECT'
        ? window.prompt('Red gerekçesi ekleyin (opsiyonel)') ?? undefined
        : undefined;

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/kyc/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.message ?? 'KYC kararı kaydedilemedi.');
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bekleyen KYC İncelemeleri</h2>
          <p className="text-sm text-slate-600">
            Kimlik belgelerini doğrulayın ve kullanıcıların para çekimine izin verin.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
          {profiles.length} bekliyor
        </span>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-500">Bekleyen KYC başvurusu bulunmuyor.</p>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  {profile.fullName ?? 'İsim bilinmiyor'}
                </p>
                <p className="text-xs text-slate-500">{profile.user.email}</p>
                <p className="text-xs text-slate-500">
                  TCKN: {profile.nationalId ?? '—'} · Telefon: {profile.phoneNumber ?? '—'}
                </p>
                <p className="text-xs text-slate-400">
                  Gönderim:{' '}
                  {profile.kycSubmittedAt ? new Date(profile.kycSubmittedAt).toLocaleString('tr-TR') : '—'}
                </p>
                <p className="text-xs text-slate-400">
                  Belgeler: {profile.idFrontObjectKey ?? 'kimlik'} / {profile.selfieObjectKey ?? 'selfie'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDecision(profile.id, 'REJECT')}
                >
                  Reddet
                </Button>
                <Button size="sm" disabled={isPending} onClick={() => handleDecision(profile.id, 'APPROVE')}>
                  Onayla
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
