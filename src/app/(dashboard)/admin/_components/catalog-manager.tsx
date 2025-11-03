'use client';

import { useState, useTransition, useOptimistic } from 'react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  upsertAnimalTypeAction,
  deleteAnimalTypeAction,
  upsertCropTypeAction,
  deleteCropTypeAction,
  upsertFeedTypeAction,
  deleteFeedTypeAction,
  upsertSupplyTypeAction,
  deleteSupplyTypeAction
} from '../actions';

interface FeedOption {
  id: string;
  name: string;
}

interface AnimalView {
  id: string;
  name: string;
  feedTypeId: string;
  feedTypeName: string;
  feedPerTick: number;
  baseHourlyOutput: number;
  maturityDays: number;
  lifespanDays?: number | null;
  baseSellPriceTRY: number;
  purchasePriceTRY: number;
  healthFloor: number;
  mortalityRateBps: number;
  seasonalityKey?: string | null;
}

interface CropView {
  id: string;
  name: string;
  cycleDays: number;
  yieldPerCycle: number;
  plantingCostTRY: number;
  outputUnit: string;
  baseSellPriceTRY: number;
  seasonalityKey?: string | null;
  electricityCostTRY: number;
  droughtResilient: boolean;
}

interface FeedView {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitCostTRY: number;
}

interface SupplyView {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitCostTRY: number;
  feedTypeId?: string | null;
}

interface Props {
  animalTypes: AnimalView[];
  cropTypes: CropView[];
  feedTypes: FeedView[];
  supplyTypes: SupplyView[];
  feedOptions: FeedOption[];
}

type AnimalAction =
  | { type: 'upsert'; value: AnimalView }
  | { type: 'delete'; id: string }
  | { type: 'replace'; values: AnimalView[] };

type CropAction =
  | { type: 'upsert'; value: CropView }
  | { type: 'delete'; id: string }
  | { type: 'replace'; values: CropView[] };

type FeedAction =
  | { type: 'upsert'; value: FeedView }
  | { type: 'delete'; id: string }
  | { type: 'replace'; values: FeedView[] };

type SupplyAction =
  | { type: 'upsert'; value: SupplyView }
  | { type: 'delete'; id: string }
  | { type: 'replace'; values: SupplyView[] };

export function CatalogManager({ animalTypes, cropTypes, feedTypes, supplyTypes, feedOptions }: Props) {
  return (
    <div className="space-y-4">
      <AnimalCatalogCard animals={animalTypes} feedOptions={feedOptions} />
      <CropCatalogCard crops={cropTypes} />
      <FeedCatalogCard feeds={feedTypes} />
      <SupplyCatalogCard supplies={supplyTypes} feedOptions={feedOptions} />
    </div>
  );
}

function AnimalCatalogCard({ animals, feedOptions }: { animals: AnimalView[]; feedOptions: FeedOption[] }) {
  const emptyForm = {
    id: '',
    name: '',
    feedTypeId: feedOptions[0]?.id ?? '',
    feedPerTick: '0',
    baseHourlyOutput: '0',
    maturityDays: '0',
    lifespanDays: '',
    baseSellPriceTRY: '0',
    purchasePriceTRY: '0',
    healthFloor: '60',
    mortalityRateBps: '0',
    seasonalityKey: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticAnimals, dispatch] = useOptimistic<AnimalView[], AnimalAction>(animals, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'delete':
        return state.filter((item) => item.id !== action.id);
      case 'upsert':
        if (state.some((item) => item.id === action.value.id)) {
          return state.map((item) => (item.id === action.value.id ? action.value : item));
        }
        return [...state, action.value];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.name || !form.feedTypeId) {
      setMessage('İsim ve yem tipi zorunludur.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticAnimals;
    const feedName = feedOptions.find((option) => option.id === form.feedTypeId)?.name ?? 'Bilinmiyor';
    const optimisticValue: AnimalView = {
      id: form.id || `optimistic-${Date.now()}`,
      name: form.name,
      feedTypeId: form.feedTypeId,
      feedTypeName: feedName,
      feedPerTick: Number(form.feedPerTick),
      baseHourlyOutput: Number(form.baseHourlyOutput),
      maturityDays: Number(form.maturityDays),
      lifespanDays: form.lifespanDays ? Number(form.lifespanDays) : null,
      baseSellPriceTRY: Number(form.baseSellPriceTRY),
      purchasePriceTRY: Number(form.purchasePriceTRY),
      healthFloor: Number(form.healthFloor),
      mortalityRateBps: Number(form.mortalityRateBps),
      seasonalityKey: form.seasonalityKey || null
    };
    dispatch({ type: 'upsert', value: optimisticValue });

    startTransition(async () => {
      try {
        const saved = await upsertAnimalTypeAction({
          id: form.id || undefined,
          name: form.name,
          feedTypeId: form.feedTypeId,
          feedPerTick: Number(form.feedPerTick),
          baseHourlyOutput: Number(form.baseHourlyOutput),
          maturityDays: Number(form.maturityDays),
          lifespanDays: form.lifespanDays ? Number(form.lifespanDays) : undefined,
          baseSellPriceTRY: Number(form.baseSellPriceTRY),
          purchasePriceTRY: Number(form.purchasePriceTRY),
          healthFloor: Number(form.healthFloor),
          mortalityRateBps: Number(form.mortalityRateBps),
          productionUnit: 'unit',
          seasonalityKey: form.seasonalityKey || undefined,
          agingCurve: undefined,
          outputIntervalHours: undefined
        });
        dispatch({
          type: 'upsert',
          value: {
            id: saved.id,
            name: saved.name,
            feedTypeId: saved.feedTypeId,
            feedTypeName: feedOptions.find((option) => option.id === saved.feedTypeId)?.name ?? feedName,
            feedPerTick: Number(saved.feedPerTick),
            baseHourlyOutput: Number(saved.baseHourlyOutput),
            maturityDays: saved.maturityDays,
            lifespanDays: saved.lifespanDays ?? null,
            baseSellPriceTRY: Number(saved.baseSellPriceTRY),
            purchasePriceTRY: Number(saved.purchasePriceTRY),
            healthFloor: saved.healthFloor,
            mortalityRateBps: saved.mortalityRateBps,
            seasonalityKey: saved.seasonalityKey ?? null
          }
        });
        setMessage('Hayvan tipi kaydedildi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Hayvan tipi kaydedilemedi.');
      }
    });
  };

  const handleDelete = () => {
    if (!form.id) {
      setMessage('Silmek için bir kayıt seçin.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticAnimals;
    dispatch({ type: 'delete', id: form.id });
    startTransition(async () => {
      try {
        await deleteAnimalTypeAction({ id: form.id });
        setMessage('Hayvan tipi silindi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Hayvan tipi silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Hayvan Tipleri</h2>
        <p className="text-sm text-slate-600">Beslenme parametreleri ve üretim verimlerini buradan yönetebilirsiniz.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {optimisticAnimals.map((animal) => (
          <button
            key={animal.id}
            type="button"
            onClick={() =>
              setForm({
                id: animal.id,
                name: animal.name,
                feedTypeId: animal.feedTypeId,
                feedPerTick: animal.feedPerTick.toString(),
                baseHourlyOutput: animal.baseHourlyOutput.toString(),
                maturityDays: animal.maturityDays.toString(),
                lifespanDays: animal.lifespanDays ? animal.lifespanDays.toString() : '',
                baseSellPriceTRY: animal.baseSellPriceTRY.toString(),
                purchasePriceTRY: animal.purchasePriceTRY.toString(),
                healthFloor: animal.healthFloor.toString(),
                mortalityRateBps: animal.mortalityRateBps.toString(),
                seasonalityKey: animal.seasonalityKey ?? ''
              })
            }
            className={`rounded-lg border p-4 text-left transition hover:border-slate-400 ${
              form.id === animal.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{animal.name}</p>
            <p className="text-xs text-slate-500">
              Yem: {animal.feedTypeName} · Olgunluk: {animal.maturityDays}g · Üretim: {animal.baseHourlyOutput}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="İsim" />
        <select
          value={form.feedTypeId}
          onChange={(event) => setForm((prev) => ({ ...prev, feedTypeId: event.target.value }))}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-700"
        >
          {feedOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <Input
          value={form.feedPerTick}
          onChange={(event) => setForm((prev) => ({ ...prev, feedPerTick: event.target.value }))}
          placeholder="Tick başına yem"
        />
        <Input
          value={form.baseHourlyOutput}
          onChange={(event) => setForm((prev) => ({ ...prev, baseHourlyOutput: event.target.value }))}
          placeholder="Saatlik üretim"
        />
        <Input
          value={form.maturityDays}
          onChange={(event) => setForm((prev) => ({ ...prev, maturityDays: event.target.value }))}
          placeholder="Olgunluk günü"
        />
        <Input
          value={form.lifespanDays}
          onChange={(event) => setForm((prev) => ({ ...prev, lifespanDays: event.target.value }))}
          placeholder="Yaşam süresi (ops)"
        />
        <Input
          value={form.baseSellPriceTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, baseSellPriceTRY: event.target.value }))}
          placeholder="Taban satış fiyatı"
        />
        <Input
          value={form.purchasePriceTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, purchasePriceTRY: event.target.value }))}
          placeholder="Satın alma fiyatı"
        />
        <Input
          value={form.healthFloor}
          onChange={(event) => setForm((prev) => ({ ...prev, healthFloor: event.target.value }))}
          placeholder="Sağlık alt sınırı"
        />
        <Input
          value={form.mortalityRateBps}
          onChange={(event) => setForm((prev) => ({ ...prev, mortalityRateBps: event.target.value }))}
          placeholder="Mortalite bps"
        />
        <Input
          value={form.seasonalityKey}
          onChange={(event) => setForm((prev) => ({ ...prev, seasonalityKey: event.target.value }))}
          placeholder="Sezonsal anahtar"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          Kaydet
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={resetForm}>
          Temizle
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDelete}>
          Sil
        </Button>
      </div>
    </Card>
  );
}

function CropCatalogCard({ crops }: { crops: CropView[] }) {
  const emptyForm = {
    id: '',
    name: '',
    cycleDays: '0',
    yieldPerCycle: '0',
    plantingCostTRY: '0',
    outputUnit: '',
    baseSellPriceTRY: '0',
    seasonalityKey: '',
    electricityCostTRY: '0',
    droughtResilient: false
  };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticCrops, dispatch] = useOptimistic<CropView[], CropAction>(crops, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'delete':
        return state.filter((item) => item.id !== action.id);
      case 'upsert':
        if (state.some((item) => item.id === action.value.id)) {
          return state.map((item) => (item.id === action.value.id ? action.value : item));
        }
        return [...state, action.value];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.name || !form.outputUnit) {
      setMessage('Ürün adı ve birimi zorunludur.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticCrops;
    const optimisticValue: CropView = {
      id: form.id || `optimistic-${Date.now()}`,
      name: form.name,
      cycleDays: Number(form.cycleDays),
      yieldPerCycle: Number(form.yieldPerCycle),
      plantingCostTRY: Number(form.plantingCostTRY),
      outputUnit: form.outputUnit,
      baseSellPriceTRY: Number(form.baseSellPriceTRY),
      seasonalityKey: form.seasonalityKey || null,
      electricityCostTRY: Number(form.electricityCostTRY),
      droughtResilient: form.droughtResilient
    };
    dispatch({ type: 'upsert', value: optimisticValue });

    startTransition(async () => {
      try {
        const saved = await upsertCropTypeAction({
          id: form.id || undefined,
          name: form.name,
          cycleDays: Number(form.cycleDays),
          yieldPerCycle: Number(form.yieldPerCycle),
          plantingCostTRY: Number(form.plantingCostTRY),
          outputUnit: form.outputUnit,
          baseSellPriceTRY: Number(form.baseSellPriceTRY),
          seasonalityKey: form.seasonalityKey || undefined,
          electricityCostTRY: Number(form.electricityCostTRY),
          droughtResilient: form.droughtResilient
        });
        dispatch({
          type: 'upsert',
          value: {
            id: saved.id,
            name: saved.name,
            cycleDays: saved.cycleDays,
            yieldPerCycle: Number(saved.yieldPerCycle),
            plantingCostTRY: Number(saved.plantingCostTRY),
            outputUnit: saved.outputUnit,
            baseSellPriceTRY: Number(saved.baseSellPriceTRY),
            seasonalityKey: saved.seasonalityKey ?? null,
            electricityCostTRY: Number(saved.electricityCostTRY),
            droughtResilient: saved.droughtResilient
          }
        });
        setMessage('Ürün tipi kaydedildi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Ürün tipi kaydedilemedi.');
      }
    });
  };

  const handleDelete = () => {
    if (!form.id) {
      setMessage('Silmek için bir kayıt seçin.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticCrops;
    dispatch({ type: 'delete', id: form.id });
    startTransition(async () => {
      try {
        await deleteCropTypeAction({ id: form.id });
        setMessage('Ürün tipi silindi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Ürün tipi silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Bitki Tipleri</h2>
        <p className="text-sm text-slate-600">Seralar ve hidroponik döngüler için ürün katalogları.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {optimisticCrops.map((crop) => (
          <button
            key={crop.id}
            type="button"
            onClick={() =>
              setForm({
                id: crop.id,
                name: crop.name,
                cycleDays: crop.cycleDays.toString(),
                yieldPerCycle: crop.yieldPerCycle.toString(),
                plantingCostTRY: crop.plantingCostTRY.toString(),
                outputUnit: crop.outputUnit,
                baseSellPriceTRY: crop.baseSellPriceTRY.toString(),
                seasonalityKey: crop.seasonalityKey ?? '',
                electricityCostTRY: crop.electricityCostTRY.toString(),
                droughtResilient: crop.droughtResilient
              })
            }
            className={`rounded-lg border p-4 text-left transition hover:border-slate-400 ${
              form.id === crop.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{crop.name}</p>
            <p className="text-xs text-slate-500">
              Döngü: {crop.cycleDays}g · Verim: {crop.yieldPerCycle} {crop.outputUnit}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="İsim" />
        <Input
          value={form.outputUnit}
          onChange={(event) => setForm((prev) => ({ ...prev, outputUnit: event.target.value }))}
          placeholder="Çıktı birimi"
        />
        <Input
          value={form.cycleDays}
          onChange={(event) => setForm((prev) => ({ ...prev, cycleDays: event.target.value }))}
          placeholder="Döngü (gün)"
        />
        <Input
          value={form.yieldPerCycle}
          onChange={(event) => setForm((prev) => ({ ...prev, yieldPerCycle: event.target.value }))}
          placeholder="Verim"
        />
        <Input
          value={form.plantingCostTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, plantingCostTRY: event.target.value }))}
          placeholder="Ekim maliyeti"
        />
        <Input
          value={form.baseSellPriceTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, baseSellPriceTRY: event.target.value }))}
          placeholder="Taban satış"
        />
        <Input
          value={form.electricityCostTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, electricityCostTRY: event.target.value }))}
          placeholder="Elektrik maliyeti"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.droughtResilient}
            onChange={(event) => setForm((prev) => ({ ...prev, droughtResilient: event.target.checked }))}
          />
          Kuraklığa dayanıklı
        </label>
        <Input
          value={form.seasonalityKey}
          onChange={(event) => setForm((prev) => ({ ...prev, seasonalityKey: event.target.value }))}
          placeholder="Sezonsal anahtar"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          Kaydet
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={resetForm}>
          Temizle
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDelete}>
          Sil
        </Button>
      </div>
    </Card>
  );
}

function FeedCatalogCard({ feeds }: { feeds: FeedView[] }) {
  const emptyForm = { id: '', sku: '', name: '', unit: '', unitCostTRY: '0' };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticFeeds, dispatch] = useOptimistic<FeedView[], FeedAction>(feeds, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'delete':
        return state.filter((item) => item.id !== action.id);
      case 'upsert':
        if (state.some((item) => item.id === action.value.id)) {
          return state.map((item) => (item.id === action.value.id ? action.value : item));
        }
        return [...state, action.value];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.sku || !form.name) {
      setMessage('SKU ve isim zorunludur.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticFeeds;
    const optimisticValue: FeedView = {
      id: form.id || `optimistic-${Date.now()}`,
      sku: form.sku,
      name: form.name,
      unit: form.unit,
      unitCostTRY: Number(form.unitCostTRY)
    };
    dispatch({ type: 'upsert', value: optimisticValue });
    startTransition(async () => {
      try {
        const saved = await upsertFeedTypeAction({
          id: form.id || undefined,
          sku: form.sku,
          name: form.name,
          unit: form.unit,
          unitCostTRY: Number(form.unitCostTRY)
        });
        dispatch({
          type: 'upsert',
          value: {
            id: saved.id,
            sku: saved.sku,
            name: saved.name,
            unit: saved.unit,
            unitCostTRY: Number(saved.unitCostTRY)
          }
        });
        setMessage('Yem tipi kaydedildi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Yem tipi kaydedilemedi.');
      }
    });
  };

  const handleDelete = () => {
    if (!form.id) {
      setMessage('Silmek için bir kayıt seçin.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticFeeds;
    dispatch({ type: 'delete', id: form.id });
    startTransition(async () => {
      try {
        await deleteFeedTypeAction({ id: form.id });
        setMessage('Yem tipi silindi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Yem tipi silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Yem Tipleri</h2>
        <p className="text-sm text-slate-600">Hayvan beslemesi için SKU tabanlı kayıtlar.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        {optimisticFeeds.map((feed) => (
          <button
            key={feed.id}
            type="button"
            onClick={() =>
              setForm({
                id: feed.id,
                sku: feed.sku,
                name: feed.name,
                unit: feed.unit,
                unitCostTRY: feed.unitCostTRY.toString()
              })
            }
            className={`rounded-lg border p-4 text-left transition hover:border-slate-400 ${
              form.id === feed.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{feed.name}</p>
            <p className="text-xs text-slate-500">SKU: {feed.sku} · {feed.unitCostTRY} TRY/{feed.unit}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} placeholder="SKU" />
        <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="İsim" />
        <Input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Birim" />
        <Input
          value={form.unitCostTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, unitCostTRY: event.target.value }))}
          placeholder="Birim maliyet"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          Kaydet
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={resetForm}>
          Temizle
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDelete}>
          Sil
        </Button>
      </div>
    </Card>
  );
}

function SupplyCatalogCard({ supplies, feedOptions }: { supplies: SupplyView[]; feedOptions: FeedOption[] }) {
  const emptyForm = { id: '', sku: '', name: '', unit: '', unitCostTRY: '0', feedTypeId: '' };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [optimisticSupplies, dispatch] = useOptimistic<SupplyView[], SupplyAction>(supplies, (state, action) => {
    switch (action.type) {
      case 'replace':
        return action.values;
      case 'delete':
        return state.filter((item) => item.id !== action.id);
      case 'upsert':
        if (state.some((item) => item.id === action.value.id)) {
          return state.map((item) => (item.id === action.value.id ? action.value : item));
        }
        return [...state, action.value];
      default:
        return state;
    }
  });
  const [isPending, startTransition] = useTransition();

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = () => {
    if (!form.sku || !form.name) {
      setMessage('SKU ve isim zorunludur.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticSupplies;
    const optimisticValue: SupplyView = {
      id: form.id || `optimistic-${Date.now()}`,
      sku: form.sku,
      name: form.name,
      unit: form.unit,
      unitCostTRY: Number(form.unitCostTRY),
      feedTypeId: form.feedTypeId || null
    };
    dispatch({ type: 'upsert', value: optimisticValue });
    startTransition(async () => {
      try {
        const saved = await upsertSupplyTypeAction({
          id: form.id || undefined,
          sku: form.sku,
          name: form.name,
          unit: form.unit,
          unitCostTRY: Number(form.unitCostTRY),
          feedTypeId: form.feedTypeId || undefined
        });
        dispatch({
          type: 'upsert',
          value: {
            id: saved.id,
            sku: saved.sku,
            name: saved.name,
            unit: saved.unit,
            unitCostTRY: Number(saved.unitCostTRY),
            feedTypeId: saved.feedTypeId
          }
        });
        setMessage('Tedarik kaydedildi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Tedarik kaydedilemedi.');
      }
    });
  };

  const handleDelete = () => {
    if (!form.id) {
      setMessage('Silmek için bir kayıt seçin.');
      return;
    }
    setMessage(null);
    const snapshot = optimisticSupplies;
    dispatch({ type: 'delete', id: form.id });
    startTransition(async () => {
      try {
        await deleteSupplyTypeAction({ id: form.id });
        setMessage('Tedarik kaydı silindi.');
        resetForm();
      } catch (error) {
        dispatch({ type: 'replace', values: snapshot });
        setMessage(error instanceof Error ? error.message : 'Tedarik kaydı silinemedi.');
      }
    });
  };

  return (
    <Card className="space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Tedarik Tipleri</h2>
        <p className="text-sm text-slate-600">Yem, tohum ve bakım girdileri için kayıtlar.</p>
      </header>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        {optimisticSupplies.map((supply) => (
          <button
            key={supply.id}
            type="button"
            onClick={() =>
              setForm({
                id: supply.id,
                sku: supply.sku,
                name: supply.name,
                unit: supply.unit,
                unitCostTRY: supply.unitCostTRY.toString(),
                feedTypeId: supply.feedTypeId ?? ''
              })
            }
            className={`rounded-lg border p-4 text-left transition hover:border-slate-400 ${
              form.id === supply.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">{supply.name}</p>
            <p className="text-xs text-slate-500">SKU: {supply.sku} · {supply.unitCostTRY} TRY/{supply.unit}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} placeholder="SKU" />
        <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="İsim" />
        <Input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Birim" />
        <Input
          value={form.unitCostTRY}
          onChange={(event) => setForm((prev) => ({ ...prev, unitCostTRY: event.target.value }))}
          placeholder="Birim maliyet"
        />
        <select
          value={form.feedTypeId}
          onChange={(event) => setForm((prev) => ({ ...prev, feedTypeId: event.target.value }))}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-700"
        >
          <option value="">Bağlı yem yok</option>
          {feedOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          Kaydet
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={resetForm}>
          Temizle
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={handleDelete}>
          Sil
        </Button>
      </div>
    </Card>
  );
}
