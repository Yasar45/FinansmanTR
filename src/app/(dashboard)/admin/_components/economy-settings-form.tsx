'use client';

import { useState, useTransition } from 'react';

import type { EconomySettings } from '@/lib/economy';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateEconomySettingsAction } from '../actions';

interface Props {
  initialSettings: EconomySettings;
}

type EconomyFormState = {
  tickLengthMinutes: string;
  animalProductivityMultiplier: string;
  cropProductivityMultiplier: string;
  mortalityRateBps: string;
  diseasePenalty: string;
  diseaseActive: boolean;
  droughtPenalty: string;
  droughtActive: boolean;
  seasonality: string;
  makerFeeBps: string;
  takerFeeBps: string;
  floorPrices: string;
  ceilingPrices: string;
  relistCooldownHours: string;
  exchangeSpreadBps: string;
  exchangeTradeFeeBps: string;
  depositFeeBps: string;
  withdrawFeeBps: string;
  maxAnimalsPerUser: string;
  maxPlotsPerUser: string;
  rentEscalationBps: string;
  dailyListingLimit: string;
  diseaseKeys: string;
  droughtSeverity: string;
  diseaseEventActive: boolean;
  droughtEventActive: boolean;
};

export function EconomySettingsForm({ initialSettings }: Props) {
  const [form, setForm] = useState<EconomyFormState>(() => ({
    tickLengthMinutes: initialSettings.tick.tickLengthMinutes.toString(),
    animalProductivityMultiplier: initialSettings.tick.animalProductivityMultiplier.toString(),
    cropProductivityMultiplier: initialSettings.tick.cropProductivityMultiplier.toString(),
    mortalityRateBps: initialSettings.tick.mortalityRateBps.toString(),
    diseasePenalty: (initialSettings.tick.diseaseEvent?.penalty ?? 0.3).toString(),
    diseaseActive: initialSettings.tick.diseaseEvent?.active ?? false,
    droughtPenalty: (initialSettings.tick.droughtEvent?.penalty ?? 0.25).toString(),
    droughtActive: initialSettings.tick.droughtEvent?.active ?? false,
    seasonality: JSON.stringify(initialSettings.tick.seasonality, null, 2),
    makerFeeBps: initialSettings.pricing.marketplace.makerFeeBps.toString(),
    takerFeeBps: initialSettings.pricing.marketplace.takerFeeBps.toString(),
    floorPrices: JSON.stringify(initialSettings.pricing.marketplace.floorPrices, null, 2),
    ceilingPrices: JSON.stringify(initialSettings.pricing.marketplace.ceilingPrices, null, 2),
    relistCooldownHours: initialSettings.pricing.marketplace.relistCooldownHours.toString(),
    dailyListingLimit: initialSettings.pricing.marketplace.dailyListingLimit.toString(),
    exchangeSpreadBps: initialSettings.pricing.exchange.defaultSpreadBps.toString(),
    exchangeTradeFeeBps: initialSettings.pricing.exchange.tradeFeeBps.toString(),
    depositFeeBps: initialSettings.pricing.wallet.depositFeeBps.toString(),
    withdrawFeeBps: initialSettings.pricing.wallet.withdrawFeeBps.toString(),
    maxAnimalsPerUser: initialSettings.pricing.guardrails.maxAnimalsPerUser.toString(),
    maxPlotsPerUser: initialSettings.pricing.guardrails.maxPlotsPerUser.toString(),
    rentEscalationBps: initialSettings.pricing.rentEscalationBps.toString(),
    diseaseKeys: (initialSettings.events.disease.affectedSeasonalityKeys ?? []).join(','),
    droughtSeverity: initialSettings.events.drought.severity.toString(),
    diseaseEventActive: initialSettings.events.disease.active,
    droughtEventActive: initialSettings.events.drought.active
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = <K extends keyof EconomyFormState>(key: K, value: EconomyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const seasonality = JSON.parse(form.seasonality || '{}');
        const floorPrices = JSON.parse(form.floorPrices || '{}');
        const ceilingPrices = JSON.parse(form.ceilingPrices || '{}');

        await updateEconomySettingsAction({
          tick: {
            tickLengthMinutes: Number(form.tickLengthMinutes),
            animalProductivityMultiplier: Number(form.animalProductivityMultiplier),
            cropProductivityMultiplier: Number(form.cropProductivityMultiplier),
            mortalityRateBps: Number(form.mortalityRateBps),
            diseaseEvent: {
              active: Boolean(form.diseaseActive),
              penalty: Number(form.diseasePenalty),
              affectedSeasonalityKeys: form.diseaseKeys
                .split(',')
                .map((key) => key.trim())
                .filter(Boolean)
            },
            droughtEvent: {
              active: Boolean(form.droughtActive),
              penalty: Number(form.droughtPenalty)
            },
            seasonality
          },
          pricing: {
            exchange: {
              defaultSpreadBps: Number(form.exchangeSpreadBps),
              tradeFeeBps: Number(form.exchangeTradeFeeBps)
            },
            marketplace: {
              makerFeeBps: Number(form.makerFeeBps),
              takerFeeBps: Number(form.takerFeeBps),
              floorPrices,
              ceilingPrices,
              relistCooldownHours: Number(form.relistCooldownHours),
              dailyListingLimit: Number(form.dailyListingLimit)
            },
            wallet: {
              depositFeeBps: Number(form.depositFeeBps),
              withdrawFeeBps: Number(form.withdrawFeeBps)
            },
            guardrails: {
              maxAnimalsPerUser: Number(form.maxAnimalsPerUser),
              maxPlotsPerUser: Number(form.maxPlotsPerUser)
            },
            rentEscalationBps: Number(form.rentEscalationBps)
          },
          events: {
            disease: {
              active: Boolean(form.diseaseEventActive),
              affectedSeasonalityKeys: form.diseaseKeys
                .split(',')
                .map((key) => key.trim())
                .filter(Boolean)
            },
            drought: {
              active: Boolean(form.droughtEventActive),
              severity: Number(form.droughtSeverity)
            }
          }
        });
        setMessage('Ekonomi ayarları başarıyla güncellendi.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
      }
    });
  };

  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Ekonomi Motoru</h2>
        <p className="text-sm text-slate-600">
          Tick süreleri, üretkenlik çarpanları ve sezonluk etkileri buradan yönetebilirsiniz.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tick Süresi (dakika)" value={form.tickLengthMinutes} onChange={(value) => handleChange('tickLengthMinutes', value)} />
        <Field
          label="Hayvan Üretkenlik Çarpanı"
          value={form.animalProductivityMultiplier}
          onChange={(value) => handleChange('animalProductivityMultiplier', value)}
        />
        <Field
          label="Bitki Üretkenlik Çarpanı"
          value={form.cropProductivityMultiplier}
          onChange={(value) => handleChange('cropProductivityMultiplier', value)}
        />
        <Field
          label="Mortalite (bps)"
          value={form.mortalityRateBps}
          onChange={(value) => handleChange('mortalityRateBps', value)}
        />
        <Field label="Hastalık Cezası" value={form.diseasePenalty} onChange={(value) => handleChange('diseasePenalty', value)} />
        <Field label="Kuraklık Cezası" value={form.droughtPenalty} onChange={(value) => handleChange('droughtPenalty', value)} />
        <ToggleField label="Hastalık Aktif" checked={form.diseaseActive} onChange={(value) => handleChange('diseaseActive', value)} />
        <ToggleField label="Kuraklık Aktif" checked={form.droughtActive} onChange={(value) => handleChange('droughtActive', value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Maker Ücreti (bps)"
          value={form.makerFeeBps}
          onChange={(value) => handleChange('makerFeeBps', value)}
        />
        <Field
          label="Taker Ücreti (bps)"
          value={form.takerFeeBps}
          onChange={(value) => handleChange('takerFeeBps', value)}
        />
        <Field
          label="Exchange Spread (bps)"
          value={form.exchangeSpreadBps}
          onChange={(value) => handleChange('exchangeSpreadBps', value)}
        />
        <Field
          label="Exchange Ücreti (bps)"
          value={form.exchangeTradeFeeBps}
          onChange={(value) => handleChange('exchangeTradeFeeBps', value)}
        />
        <Field
          label="Rent Eskalasyonu (bps)"
          value={form.rentEscalationBps}
          onChange={(value) => handleChange('rentEscalationBps', value)}
        />
        <Field
          label="Depozito Ücreti (bps)"
          value={form.depositFeeBps}
          onChange={(value) => handleChange('depositFeeBps', value)}
        />
        <Field
          label="Çekim Ücreti (bps)"
          value={form.withdrawFeeBps}
          onChange={(value) => handleChange('withdrawFeeBps', value)}
        />
        <Field
          label="Maksimum Hayvan"
          value={form.maxAnimalsPerUser}
          onChange={(value) => handleChange('maxAnimalsPerUser', value)}
        />
        <Field
          label="Maksimum Parsel"
          value={form.maxPlotsPerUser}
          onChange={(value) => handleChange('maxPlotsPerUser', value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextareaField
          label="Sezon Çarpanları (JSON)"
          value={form.seasonality}
          onChange={(value) => handleChange('seasonality', value)}
        />
        <TextareaField
          label="Taban Fiyatlar (JSON)"
          value={form.floorPrices}
          onChange={(value) => handleChange('floorPrices', value)}
        />
        <TextareaField
          label="Tavan Fiyatlar (JSON)"
          value={form.ceilingPrices}
          onChange={(value) => handleChange('ceilingPrices', value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Hastalık Etkilenen Anahtarlar" value={form.diseaseKeys} onChange={(value) => handleChange('diseaseKeys', value)} />
        <Field label="Kuraklık Şiddeti" value={form.droughtSeverity} onChange={(value) => handleChange('droughtSeverity', value)} />
        <ToggleField
          label="Hastalık Olayı Aktif"
          checked={form.diseaseEventActive}
          onChange={(value) => handleChange('diseaseEventActive', value)}
        />
        <ToggleField
          label="Kuraklık Olayı Aktif"
          checked={form.droughtEventActive}
          onChange={(value) => handleChange('droughtEventActive', value)}
        />
        <Field
          label="Relist Bekleme (saat)"
          value={form.relistCooldownHours}
          onChange={(value) => handleChange('relistCooldownHours', value)}
        />
        <Field
          label="Günlük İlan Limiti"
          value={form.dailyListingLimit}
          onChange={(value) => handleChange('dailyListingLimit', value)}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {message ? <p className="text-sm text-slate-600">{message}</p> : <span />}
        <Button type="button" disabled={isPending} onClick={handleSubmit}>
          {isPending ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
        </Button>
      </div>
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextareaField({ label, value, onChange }: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <textarea
        className="min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
