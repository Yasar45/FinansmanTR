import { Card } from '@/components/ui/card';
import { InfoPopover } from '@/components/ui/info-popover';
import { formatCurrency } from '@/lib/formatters';
import { LocalizedLink } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';

interface MetricDefinition {
  key: string;
  value: string;
  help: string;
  learnHref: string;
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = await getTranslations('dashboard');
  const common = await getTranslations('common');

  const metrics: MetricDefinition[] = [
    {
      key: 'metrics.walletBalance',
      value: formatCurrency('12500.50', locale),
      help: t('metrics.walletBalanceHelp', {
        defaultMessage: 'TRY bakiyeniz, açık işlemler ve rezerve tutarlar düşülerek hesaplanır.'
      }),
      learnHref: '/wallet'
    },
    {
      key: 'metrics.pendingHarvests',
      value: t('metrics.pendingHarvestsValue', { defaultMessage: '3 parti' }),
      help: t('metrics.pendingHarvestsHelp', {
        defaultMessage: 'Hasat takvimleri sera ve hidroponik varlıklarınızdan derlenir.'
      }),
      learnHref: '/farming'
    },
    {
      key: 'metrics.marketVolume',
      value: formatCurrency('3460.00', locale),
      help: t('metrics.marketVolumeHelp', {
        defaultMessage: 'Son 24 saat içinde pazarda yaptığınız işlem toplamını gösterir.'
      }),
      learnHref: '/marketplace'
    }
  ];

  const quickActions = [
    {
      key: 'actions.buyFeed',
      description: t('actions.buyFeedDescription', {
        defaultMessage: 'Hayvanlarınızın üretken kalması için yeterli yem stoğunu sağlayın.'
      }),
      href: '/inventory'
    },
    {
      key: 'actions.addAnimal',
      description: t('actions.addAnimalDescription', {
        defaultMessage: 'Yeni hayvan satın alırken yem ve barınma maliyetlerini göz önünde bulundurun.'
      }),
      href: '/animals'
    },
    {
      key: 'actions.plantSeeds',
      description: t('actions.plantSeedsDescription', {
        defaultMessage: 'Seralarınız için tohum planlarken mevsimselliği kontrol edin.'
      }),
      href: '/farming'
    },
    {
      key: 'actions.exchangeSell',
      description: t('actions.exchangeSellDescription', {
        defaultMessage: 'Likidite garantili sistem fiyatlarıyla anında satış yapın.'
      }),
      href: '/exchange'
    },
    {
      key: 'actions.marketplaceList',
      description: t('actions.marketplaceListDescription', {
        defaultMessage: 'P2P pazarda esnek fiyatlarla ilan verin ve teklifleri yönetin.'
      }),
      href: '/marketplace'
    },
    {
      key: 'actions.walletHistory',
      description: t('actions.walletHistoryDescription', {
        defaultMessage: 'TRY hareketlerinizi uyum amaçlı detaylı olarak görüntüleyin.'
      }),
      href: '/wallet'
    }
  ] as const;

  const onboardingChecklist = [
    {
      key: 'checklist.buyAnimal',
      description: t('checklist.buyAnimalDescription', {
        defaultMessage: 'İlk hayvanınızı satın alın ve yem gereksinimlerini planlayın.'
      }),
      href: '/animals',
      completed: false
    },
    {
      key: 'checklist.buyFeed',
      description: t('checklist.buyFeedDescription', {
        defaultMessage: 'Hayvanlarınıza uygun yem satın alın ve stoklayın.'
      }),
      href: '/inventory',
      completed: false
    },
    {
      key: 'checklist.harvest',
      description: t('checklist.harvestDescription', {
        defaultMessage: 'İlk ürününüzü hasat edin ve envantere taşıyın.'
      }),
      href: '/farming',
      completed: false
    },
    {
      key: 'checklist.sellExchange',
      description: t('checklist.sellExchangeDescription', {
        defaultMessage: 'Üretiminizi sistem borsasında satın.'
      }),
      href: '/exchange',
      completed: false
    },
    {
      key: 'checklist.listMarketplace',
      description: t('checklist.listMarketplaceDescription', {
        defaultMessage: 'P2P pazarda ilk ilanınızı oluşturun.'
      }),
      href: '/marketplace',
      completed: false
    }
  ] as const;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.key} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-500">{t(metric.key)}</h3>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
              </div>
              <InfoPopover
                title={t('metricHelpTitle', { defaultMessage: 'Bu metrik hakkında' })}
                description={metric.help}
                learnHref={metric.learnHref}
                learnLabel={common('learnMore', { defaultMessage: 'Detayları öğren' })}
              />
            </div>
          </Card>
        ))}
      </section>

      <Card className="space-y-6 p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('quickActionsTitle', { defaultMessage: 'Hızlı Aksiyonlar' })}</h2>
            <p className="text-sm text-slate-600">
              {t('quickActionsDescription', {
                defaultMessage: 'Hayvan besleme, tohum ekme veya ürün satışı için hızlı bağlantıları kullanın.'
              })}
            </p>
          </div>
          <InfoPopover
            title={t('quickActionsHelpTitle', { defaultMessage: 'Nasıl kullanılır?' })}
            description={t('quickActionsHelpDescription', {
              defaultMessage: 'Her aksiyon sizi ilgili yönetim ekranına götürür ve işlem sürecini adım adım yönlendirir.'
            })}
            learnHref="/help"
            learnLabel={common('learnMore', { defaultMessage: 'Detayları öğren' })}
          />
        </header>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {quickActions.map((action) => (
            <li key={action.key} className="rounded-xl border border-dashed border-emerald-200 p-4">
              <h3 className="text-sm font-medium text-slate-700">{t(action.key)}</h3>
              <p className="mt-2 text-xs text-slate-500">{action.description}</p>
              <LocalizedLink
                href={action.href}
                className="mt-3 inline-flex items-center text-xs font-medium text-emerald-600 underline-offset-2 hover:underline"
              >
                {common('goAction', { defaultMessage: 'Hemen git' })}
              </LocalizedLink>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-5 p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('onboardingTitle', { defaultMessage: 'Başlangıç Kontrol Listesi' })}</h2>
            <p className="text-sm text-slate-600">
              {t('onboardingDescription', {
                defaultMessage: 'Tamamladıkça üretim motoru ve pazar özellikleri otomatik olarak açılır.'
              })}
            </p>
          </div>
          <InfoPopover
            title={t('onboardingHelpTitle', { defaultMessage: 'Neden önemli?' })}
            description={t('onboardingHelpDescription', {
              defaultMessage:
                'Kontrol listesini tamamlamak, ekonomi kurallarının ve üretim motorunun tüm özelliklerinin kilidini açar.'
            })}
            learnHref="/help"
            learnLabel={common('learnMore', { defaultMessage: 'Detayları öğren' })}
          />
        </header>
        <ol className="space-y-3" role="list">
          {onboardingChecklist.map((item, index) => (
            <li key={item.key} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span
                aria-hidden="true"
                className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 text-sm font-semibold text-emerald-700"
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{t(item.key)}</p>
                <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                <LocalizedLink
                  href={item.href}
                  className="mt-2 inline-flex items-center text-xs font-medium text-emerald-600 underline-offset-2 hover:underline"
                >
                  {item.completed
                    ? common('completed', { defaultMessage: 'Tamamlandı' })
                    : common('startTask', { defaultMessage: 'Adımı başlat' })}
                </LocalizedLink>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
