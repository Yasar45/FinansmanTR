'use client';

import { useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  actorEmail: string | null;
}

interface Props {
  logs: AuditLogEntry[];
}

export function AuditLogPanel({ logs }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return logs;
    const lower = query.toLowerCase();
    return logs.filter((log) =>
      [log.action, log.entity, log.actorEmail ?? ''].some((field) => field.toLowerCase().includes(lower))
    );
  }, [logs, query]);

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Audit Kayıtları</h2>
          <p className="text-sm text-slate-600">En son yönetim işlemlerini inceleyin.</p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrele (aksiyon, varlık, kullanıcı)"
          className="md:w-64"
        />
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">Kayıt bulunamadı.</p>
        ) : (
          filtered.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('tr-TR')}</p>
              </div>
              <p className="text-xs text-slate-500">{log.entity}</p>
              <p className="text-xs text-slate-400">{log.actorEmail ?? 'Sistem'}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
