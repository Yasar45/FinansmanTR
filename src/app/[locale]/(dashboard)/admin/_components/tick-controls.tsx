'use client';

import { useState, useTransition } from 'react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toggleTickQueueAction, triggerUserTickAction } from '../actions';

interface QueueState {
  name: 'hourly' | 'daily';
  waiting: number;
  active: number;
  delayed: number;
  paused: boolean;
  isRunning: boolean;
}

interface Props {
  queues: QueueState[];
}

export function TickControls({ queues }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleQueueCommand = (queue: 'hourly' | 'daily', command: 'pause' | 'resume' | 'drain') => {
    setMessage(null);
    startTransition(async () => {
      try {
        await toggleTickQueueAction({ queue, command });
        setMessage(`Kuyruk ${command === 'pause' ? 'duraklatıldı' : command === 'resume' ? 'başlatıldı' : 'boşaltıldı'}.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Kuyruk komutu uygulanamadı.');
      }
    });
  };

  const handleManualTick = () => {
    if (!userId) {
      setMessage('Kullanıcı ID girilmelidir.');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await triggerUserTickAction({ userId });
        setMessage('Manuel tick kuyruğa işlendi.');
        setUserId('');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Tick tetiklenemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Tick Motoru Kontrolleri</h2>
        <p className="text-sm text-slate-600">
          Kuyrukları durdurup başlatabilir veya tekil kullanıcılar için idempotent üretim tetiği gönderebilirsiniz.
        </p>
      </div>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {queues.map((queue) => (
          <div key={queue.name} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{queue.name === 'hourly' ? 'Saatlik' : 'Günlük'} Kuyruk</p>
              <span className={`text-xs font-semibold ${queue.paused ? 'text-red-600' : 'text-emerald-600'}`}>
                {queue.paused ? 'Duraklatıldı' : queue.isRunning ? 'Aktif' : 'Beklemede'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
              <div>
                <dt>Bekleyen</dt>
                <dd className="font-semibold text-slate-900">{queue.waiting}</dd>
              </div>
              <div>
                <dt>Aktif</dt>
                <dd className="font-semibold text-slate-900">{queue.active}</dd>
              </div>
              <div>
                <dt>Gecikmiş</dt>
                <dd className="font-semibold text-slate-900">{queue.delayed}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleQueueCommand(queue.name, 'pause')}>
                Duraklat
              </Button>
              <Button size="sm" disabled={isPending} onClick={() => handleQueueCommand(queue.name, 'resume')}>
                Başlat
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleQueueCommand(queue.name, 'drain')}>
                Boşalt
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Kullanıcı için manuel tick</p>
          <p className="text-xs text-slate-500">Tek seferlik üretim; idempotent ve bakım amaçlıdır.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="kullanıcı cuid"
            className="sm:w-64"
          />
          <Button size="sm" disabled={isPending} onClick={handleManualTick}>
            Tetikle
          </Button>
        </div>
      </div>
    </Card>
  );
}
