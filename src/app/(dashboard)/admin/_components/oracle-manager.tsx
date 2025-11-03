'use client';

import { useMemo, useState, useTransition } from 'react';

import type { OraclePricingConfig } from '@/lib/economy';
import { EXCHANGE_SYMBOLS } from '@/lib/economy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  importOracleReferencesAction,
  runOracleNowAction,
  updateOracleSettingsAction
} from '../actions';

interface OracleReferenceRow {
  id: string;
  symbol: string;
  midPriceTRY: number;
  effectiveDate: string;
  source: string;
}

interface Props {
  config: OraclePricingConfig;
  references: OracleReferenceRow[];
}

export function OracleManager({ config, references }: Props) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [provider, setProvider] = useState<OraclePricingConfig['provider']>(config.provider);
  const [offsets, setOffsets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const symbol of EXCHANGE_SYMBOLS) {
      const value = config.mockOffsets[symbol];
      initial[symbol] = value !== undefined ? String(value) : '';
    }
    return initial;
  });
  const [bounds, setBounds] = useState<Record<string, { min: string; max: string }>>(() => {
    const initial: Record<string, { min: string; max: string }> = {};
    for (const symbol of EXCHANGE_SYMBOLS) {
      const value = config.bounds[symbol];
      initial[symbol] = {
        min: value?.min !== undefined ? String(value.min) : '',
        max: value?.max !== undefined ? String(value.max) : ''
      };
    }
    return initial;
  });
  const [csvPayload, setCsvPayload] = useState('');
  const [uploadSource, setUploadSource] = useState<'MANUAL' | 'CSV'>('MANUAL');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isUploading, startUpload] = useTransition();
  const [isRunning, startRun] = useTransition();

  const latestReferences = useMemo(() => references.slice(0, 5), [references]);

  const handleOffsetChange = (symbol: string, value: string) => {
    setOffsets((prev) => ({ ...prev, [symbol]: value }));
  };

  const handleBoundChange = (symbol: string, key: 'min' | 'max', value: string) => {
    setBounds((prev) => ({ ...prev, [symbol]: { ...prev[symbol], [key]: value } }));
  };

  const handleSave = () => {
    setMessage(null);
    startSave(async () => {
      try {
        const mockOffsets = Object.fromEntries(
          Object.entries(offsets)
            .filter(([, value]) => value !== '')
            .map(([symbol, value]) => [symbol, Number(value)])
        );
        const oracleBounds = Object.fromEntries(
          Object.entries(bounds)
            .filter(([, pair]) => pair.min !== '' && pair.max !== '')
            .map(([symbol, pair]) => [symbol, { min: Number(pair.min), max: Number(pair.max) }])
        );
        await updateOracleSettingsAction({
          enabled,
          provider,
          mockOffsets,
          bounds: oracleBounds
        });
        setMessage('Oracle ayarları güncellendi.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Oracle ayarları kaydedilemedi.');
      }
    });
  };

  const handleUpload = () => {
    setUploadMessage(null);
    startUpload(async () => {
      try {
        await importOracleReferencesAction({
          payload: csvPayload,
          source: uploadSource,
          effectiveDate
        });
        setCsvPayload('');
        setUploadMessage('Referans fiyatlar kaydedildi.');
      } catch (error) {
        setUploadMessage(error instanceof Error ? error.message : 'Referanslar yüklenemedi.');
      }
    });
  };

  const handleRun = () => {
    setRunMessage(null);
    startRun(async () => {
      try {
        const result = await runOracleNowAction();
        const updated = result.updated.length > 0 ? result.updated.join(', ') : 'Güncelleme yapılmadı';
        const rejected = result.rejected.length > 0 ? result.rejected.length : 0;
        setRunMessage(`Oracle çalıştırıldı. Güncellenen: ${updated}. Reddedilen: ${rejected}.`);
      } catch (error) {
        setRunMessage(error instanceof Error ? error.message : 'Oracle çalıştırılamadı.');
      }
    });
  };

  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Fiyat Oracle Yönetimi</h2>
        <p className="text-sm text-slate-600">
          Dış piyasa verileriyle sistem fiyatlarını güncelleyin, güvenlik sınırları belirleyin ve manuel referans
          yükleyin.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Oracle etkin
          </label>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span>Sağlayıcı</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={provider}
              onChange={(event) => setProvider(event.target.value as OraclePricingConfig['provider'])}
            >
              <option value="MOCK">Mock</option>
              <option value="MANUAL">Manuel</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Mock Sapmaları</h3>
          <p className="text-xs text-slate-500">
            Her sembol için baz fiyat üzerine uygulanacak çarpan. Örnek: 0.05 = %5 artış.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {EXCHANGE_SYMBOLS.map((symbol) => (
              <div key={symbol} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">{symbol}</span>
                <Input
                  value={offsets[symbol]}
                  onChange={(event) => handleOffsetChange(symbol, event.target.value)}
                  placeholder="0.00"
                  className="md:max-w-[120px]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Güvenlik Sınırları</h3>
          <p className="text-xs text-slate-500">
            Oracle tarafından yayınlanacak fiyatların minimum ve maksimum değerlerini belirtin.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {EXCHANGE_SYMBOLS.map((symbol) => (
              <div key={symbol} className="grid gap-2 rounded-md border border-slate-200 p-3">
                <span className="text-sm font-medium text-slate-700">{symbol}</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={bounds[symbol]?.min ?? ''}
                    onChange={(event) => handleBoundChange(symbol, 'min', event.target.value)}
                    placeholder="Min"
                  />
                  <Input
                    value={bounds[symbol]?.max ?? ''}
                    onChange={(event) => handleBoundChange(symbol, 'max', event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            Ayarları Kaydet
          </Button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">CSV / Manuel Referans Yükleme</h3>
          <p className="text-xs text-slate-500">Her satır "Sembol,Fiyat" formatında olmalıdır.</p>
        </div>
        <textarea
          value={csvPayload}
          onChange={(event) => setCsvPayload(event.target.value)}
          className="h-32 w-full rounded-md border border-slate-200 p-3 text-sm"
          placeholder={`EGG_TRY,32.50\nMILK_TRY,45.10`}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span>Kaynak</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={uploadSource}
              onChange={(event) => setUploadSource(event.target.value as 'MANUAL' | 'CSV')}
            >
              <option value="MANUAL">Manuel</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Tarih</span>
            <Input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          </label>
          <Button onClick={handleUpload} disabled={isUploading}>
            Referansları Kaydet
          </Button>
        </div>
        {uploadMessage ? <p className="text-sm text-slate-600">{uploadMessage}</p> : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Son Referanslar</h3>
          <Button variant="secondary" onClick={handleRun} disabled={isRunning}>
            Oracle&apos;ı Çalıştır
          </Button>
        </div>
        {runMessage ? <p className="text-sm text-slate-600">{runMessage}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Sembol</th>
                <th className="px-3 py-2">Fiyat (TRY)</th>
                <th className="px-3 py-2">Kaynak</th>
                <th className="px-3 py-2">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {latestReferences.map((reference) => (
                <tr key={reference.id}>
                  <td className="px-3 py-2 font-medium text-slate-700">{reference.symbol}</td>
                  <td className="px-3 py-2">{reference.midPriceTRY.toFixed(2)}</td>
                  <td className="px-3 py-2">{reference.source}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(reference.effectiveDate).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Card>
  );
}
