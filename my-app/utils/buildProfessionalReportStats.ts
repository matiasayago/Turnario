import type { Appointment } from '../contexts/AppointmentContext';
import type { Review } from '../contexts/ReviewContext';

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';

function startOfPeriod(period: ReportPeriod): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 1);
  else if (period === 'quarter') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

/** Intervalo inmediatamente anterior al período actual [start, currentStart). */
function previousPeriodRange(period: ReportPeriod): { start: Date; end: Date } {
  const currentStart = startOfPeriod(period);
  const end = new Date(currentStart);
  const start = new Date(currentStart);
  if (period === 'week') start.setDate(start.getDate() - 7);
  else if (period === 'month') start.setMonth(start.getMonth() - 1);
  else if (period === 'quarter') start.setMonth(start.getMonth() - 3);
  else start.setFullYear(start.getFullYear() - 1);
  return { start, end };
}

export function aptDate(a: Appointment): Date {
  const parts = String(a.date || '').split('-').map((x) => parseInt(x, 10));
  const y = parts[0] || new Date().getFullYear();
  const m = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(y, m, day);
}

/** Montos en citas: se asumen pesos ARS enteros → centavos para formatCurrency (/100). */
export function revenueCents(a: Appointment): number {
  const t = Number(a.totalAmount);
  const d = Number(a.depositAmount);
  const raw = (Number.isFinite(t) && t > 0 ? t : 0) || (Number.isFinite(d) && d > 0 ? d : 0);
  return Math.round(raw * 100);
}

const MONTH_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

/**
 * Estadísticas para "Reportes y Estadísticas" del profesional.
 * Métricas calculadas desde citas y reseñas; el resto son valores neutros o texto explicativo.
 */
export function buildProfessionalReportStats(
  allAppointments: Appointment[],
  professionalId: string,
  period: ReportPeriod,
  reviewsAboutProfessional: Review[]
): Record<string, unknown> {
  const pid = String(professionalId || '').trim();
  const mine = allAppointments.filter((a) => String(a.professionalId) === pid);
  const start = startOfPeriod(period);
  const inPeriod = mine.filter((a) => aptDate(a) >= start);

  const { start: prevStart, end: prevEndExclusive } = previousPeriodRange(period);
  const prevPeriodApps = mine.filter((a) => {
    const d = aptDate(a);
    return d >= prevStart && d < prevEndExclusive;
  });

  const completedStatuses = new Set(['completed', 'finished']);
  const pendingStatuses = new Set(['pending', 'confirmed', 'pending_payment', 'pending_approval']);
  const cancelledStatuses = new Set(['cancelled']);

  const completed = inPeriod.filter((a) => completedStatuses.has(a.status));
  const pending = inPeriod.filter((a) => pendingStatuses.has(a.status));
  const cancelled = inPeriod.filter((a) => cancelledStatuses.has(a.status));
  const total = inPeriod.length;

  const totalRevenueCents = inPeriod.reduce((s, a) => s + revenueCents(a), 0);
  const prevRevenueCents = prevPeriodApps.reduce((s, a) => s + revenueCents(a), 0);
  const revenueGrowthRate =
    prevRevenueCents > 0
      ? Math.round(((totalRevenueCents - prevRevenueCents) / prevRevenueCents) * 1000) / 10
      : totalRevenueCents > 0
        ? 100
        : 0;

  const clientIdsInPeriod = [...new Set(inPeriod.map((a) => a.clientId).filter(Boolean))];
  const totalPatients = clientIdsInPeriod.length;

  const firstVisitByClient = new Map<string, Date>();
  for (const a of mine) {
    const cid = a.clientId;
    if (!cid) continue;
    const d = aptDate(a);
    const prev = firstVisitByClient.get(cid);
    if (!prev || d < prev) firstVisitByClient.set(cid, d);
  }
  let newInPeriod = 0;
  for (const cid of clientIdsInPeriod) {
    const first = firstVisitByClient.get(cid);
    if (first && first >= start) newInPeriod++;
  }
  const repeatPatients = Math.max(0, totalPatients - newInPeriod);

  const denom = Math.max(total, 1);
  const compCount = completed.length;
  const pendCount = pending.length;
  const cancCount = cancelled.length;
  const byStatus = [
    {
      status: 'completed',
      count: compCount,
      percentage: Math.round((compCount / denom) * 100),
      color: '#10B981',
    },
    {
      status: 'cancelled',
      count: cancCount,
      percentage: Math.round((cancCount / denom) * 100),
      color: '#EF4444',
    },
    {
      status: 'pending',
      count: pendCount,
      percentage: Math.round((pendCount / denom) * 100),
      color: '#F59E0B',
    },
  ];

  const hourCounts = new Map<number, number>();
  for (const a of inPeriod) {
    const t = String(a.time || '12:00');
    const h = parseInt(t.split(':')[0], 10);
    if (!Number.isNaN(h)) hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
  }
  const peakHours = [...hourCounts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 8)
    .map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    }));
  if (peakHours.length === 0) {
    peakHours.push({ hour: '—', count: 0, percentage: 0 });
  }

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const wdCounts = new Map<number, number>();
  for (const a of inPeriod) {
    const dow = aptDate(a).getDay();
    wdCounts.set(dow, (wdCounts.get(dow) || 0) + 1);
  }
  const weekdayDistribution = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const c = wdCounts.get(dow) || 0;
    return {
      day: dayNames[dow],
      count: c,
      percentage: total ? Math.round((c / total) * 100) : 0,
    };
  });

  let bestDay = '—';
  let worstDay = '—';
  const daysWithCitas = weekdayDistribution.filter((r) => r.count > 0);
  if (daysWithCitas.length > 0) {
    bestDay = daysWithCitas.reduce((a, b) => (a.count >= b.count ? a : b)).day;
    worstDay = daysWithCitas.reduce((a, b) => (a.count <= b.count ? a : b)).day;
  }

  const byServiceMap = new Map<string, { count: number; revenueCents: number }>();
  for (const a of inPeriod) {
    const k = (a.service || 'Servicio').trim() || 'Servicio';
    const cur = byServiceMap.get(k) || { count: 0, revenueCents: 0 };
    cur.count += 1;
    cur.revenueCents += revenueCents(a);
    byServiceMap.set(k, cur);
  }
  const byService = [...byServiceMap.entries()]
    .map(([service, v]) => ({
      service,
      count: v.count,
      revenue: v.revenueCents,
      growth: 0,
      avgDuration: 0,
    }))
    .sort((a, b) => b.count - a.count);
  if (byService.length === 0) {
    byService.push({ service: 'Sin citas en el período', count: 0, revenue: 0, growth: 0, avgDuration: 0 });
  }

  const ratings = reviewsAboutProfessional.map((r) => r.rating).filter((n) => n >= 1 && n <= 5);
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    const k = Math.round(r) as 1 | 2 | 3 | 4 | 5;
    if (k >= 1 && k <= 5) dist[k]++;
  }
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: dist[stars],
    percentage: ratings.length ? Math.round((dist[stars] / ratings.length) * 100) : 0,
    trend: '0%',
  }));

  const sessionCompletionRate = Math.round((compCount / denom) * 1000) / 10;
  const noShowRate = Math.round((cancCount / denom) * 1000) / 10;
  const patientRetentionRate =
    totalPatients > 0 ? Math.min(100, Math.round((repeatPatients / totalPatients) * 1000) / 10) : 0;

  const msPerDay = 86400000;
  const daysInPeriod = Math.max(1, (Date.now() - start.getTime()) / msPerDay);
  const sessionsPerDay = Math.round((total / daysInPeriod) * 10) / 10;

  const estHours = Math.max((compCount + pendCount) * 0.75, 0.75);
  const revenuePerHourCents = Math.round(totalRevenueCents / estHours);

  const cancellationReasons =
    cancCount > 0
      ? [{ reason: 'Cancelaciones registradas en la app', count: cancCount, percentage: 100 }]
      : [{ reason: 'Sin cancelaciones en el período', count: 0, percentage: 0 }];

  const monthlyBuckets = Array(12).fill(0);
  for (const a of mine) {
    const d = aptDate(a);
    const m = d.getMonth();
    monthlyBuckets[m] += revenueCents(a);
  }
  const monthPairs = monthlyBuckets.map((x, i) => ({ x, i })).filter((o) => o.x > 0);
  const bestMonth =
    monthPairs.length > 0
      ? MONTH_NAMES[monthPairs.reduce((a, b) => (a.x >= b.x ? a : b)).i] || '—'
      : '—';
  const worstMonth =
    monthPairs.length > 0
      ? MONTH_NAMES[monthPairs.reduce((a, b) => (a.x <= b.x ? a : b)).i] || '—'
      : '—';

  const revenueByService = byService.map((s) => ({
    service: s.service,
    amount: s.revenue,
    percentage: totalRevenueCents > 0 ? Math.round((s.revenue / totalRevenueCents) * 100) : 0,
    growth: 0,
  }));
  const topSvc = byService[0]?.service || '—';
  const leastSvc = byService.length > 1 ? byService[byService.length - 1].service : topSvc;

  const patientRetentionApprox = {
    oneMonth: patientRetentionRate,
    threeMonths: patientRetentionRate,
    sixMonths: Math.max(0, patientRetentionRate - 5),
    oneYear: Math.max(0, patientRetentionRate - 10),
    churnRate: totalPatients ? Math.min(100, Math.round((cancCount / Math.max(total, 1)) * 100)) : 0,
    lifetimeValue: totalPatients > 0 ? Math.round(totalRevenueCents / totalPatients) : 0,
    averageLifespan: 0,
    reactivationRate: 0,
  };

  return {
    overview: {
      totalAppointments: total,
      completedAppointments: compCount,
      cancelledAppointments: cancCount,
      pendingAppointments: pendCount,
      totalRevenue: totalRevenueCents,
      averageRating: avgRating,
      totalPatients,
      newPatientsThisMonth: newInPeriod,
      repeatPatients,
      averageSessionDuration: 0,
      totalSessions: compCount,
      averageRevenuePerSession: compCount > 0 ? Math.round(totalRevenueCents / compCount) : 0,
      patientRetentionRate,
      averageWaitTime: 0,
      sessionCompletionRate,
      revenueGrowthRate,
      patientSatisfactionScore: avgRating,
      professionalEfficiency: sessionCompletionRate,
      marketShare: 0,
      referralRate: 0,
    },
    appointments: {
      weekly: [],
      monthly: monthlyBuckets,
      byStatus,
      byService,
      peakHours,
      weekdayDistribution,
      byWeekday: weekdayDistribution,
      cancellationReasons,
      trends: {
        monthlyGrowth: revenueGrowthRate,
        bestDay,
        worstDay,
        seasonalVariation: 0,
      },
    },
    revenue: {
      total: totalRevenueCents,
      monthly: monthlyBuckets,
      byPaymentMethod: [
        {
          method: 'Importes en citas (app)',
          amount: totalRevenueCents,
          percentage: 100,
          growth: revenueGrowthRate,
        },
      ],
      byService: revenueByService,
      mostProfitableService: topSvc,
      leastProfitableService: leastSvc,
      averageGrowthRate: revenueGrowthRate,
      stabilityScore: Math.min(10, total > 5 ? 7 : total > 0 ? 5 : 0),
      trends: {
        growth: revenueGrowthRate,
        averageMonthly: Math.round(totalRevenueCents / Math.max(daysInPeriod / 30, 1 / 30)),
        bestMonth,
        worstMonth,
        profitMargin: 0,
        averageTransactionValue: compCount > 0 ? Math.round(totalRevenueCents / compCount) : 0,
        recurringRevenue: 0,
        seasonalVariation: 0,
        revenuePerPatient: totalPatients > 0 ? Math.round(totalRevenueCents / totalPatients) : 0,
        costPerAcquisition: 0,
        projectedMonthly: Math.round(totalRevenueCents / Math.max(daysInPeriod / 30, 1 / 30)),
      },
      hourlyRevenue: [],
    },
    patients: {
      total: totalPatients,
      newThisMonth: newInPeriod,
      repeat: repeatPatients,
      byAge: [
        {
          range: 'Datos no cargados',
          count: totalPatients,
          percentage: totalPatients ? 100 : 0,
          growth: 0,
          avgRevenue: totalPatients > 0 ? Math.round(totalRevenueCents / totalPatients) : 0,
        },
      ],
      byGender: [],
      retention: patientRetentionApprox,
      byLocation: [{ location: '—', count: 0, percentage: 0, avgDistance: 0 }],
      bySource: [],
      vipCount: 0,
      vipPercentage: 0,
      regularCount: totalPatients,
      regularPercentage: totalPatients ? 100 : 0,
      occasionalCount: 0,
      occasionalPercentage: 0,
      acquisition: {
        monthlyGrowth: 0,
        mainSource: 'App Turnario',
        conversionRate: 0,
        costPerPatient: 0,
      },
    },
    performance: {
      averageRating: avgRating,
      totalReviews: ratings.length,
      ratingDistribution,
      responseTime: {
        average: 0,
        within24h: 0,
        within48h: 0,
        averageResponseQuality: avgRating,
        responseTimeByChannel: { chat: 0, email: 0, phone: 0 },
      },
      patientSatisfaction: {
        overall: avgRating,
        communication: avgRating,
        punctuality: avgRating,
        professionalism: avgRating,
        treatment: avgRating,
        environment: avgRating,
        accessibility: avgRating,
        followUp: avgRating,
        valueForMoney: avgRating,
      },
      efficiency: {
        averageSessionDuration: 0,
        sessionsPerDay,
        patientLoad: total ? Math.min(100, Math.round((total / Math.max(daysInPeriod, 1)) * 10)) : 0,
        utilizationRate: sessionCompletionRate,
        noShowRate,
        rescheduleRate: 0,
      },
      quality: {
        treatmentSuccessRate: sessionCompletionRate,
        patientImprovement: avgRating,
        followUpCompliance: 0,
        documentationAccuracy: 0,
        continuingEducation: 0,
      },
      sessionTime: {
        average: 0,
        preparation: 0,
        cleanup: 0,
        efficiency: sessionCompletionRate,
      },
      productivity: {
        patientsPerDay: Math.round((totalPatients / daysInPeriod) * 10) / 10,
        sessionsPerWeek: Math.round((total / Math.max(daysInPeriod / 7, 1)) * 10) / 10,
        revenuePerHour: revenuePerHourCents,
        occupancyRate: sessionCompletionRate,
      },
    },
    comparison: {
      industryBenchmarks: {
        avgRating: 4.5,
        avgResponseTime: 24,
        avgRetention: 50,
        avgRevenuePerPatient: 0,
      },
      peerComparison: {
        ratingPercentile: 50,
        revenuePercentile: 50,
        patientSatisfactionPercentile: 50,
        efficiencyPercentile: 50,
      },
      trends: {
        monthlyGrowth: Array(12).fill(0),
        patientAcquisition: Array(12).fill(0),
        marketTrends: Array(12).fill(0),
      },
      competitiveAdvantage: 'Benchmark no disponible (solo datos de tu cuenta).',
      improvementAreas: '—',
      marketOpportunities: '—',
      competitiveThreats: '—',
      qualityBenchmarks: {
        serviceQuality: 0,
        patientSatisfaction: 0,
        operationalEfficiency: 0,
        innovation: 0,
      },
    },
  };
}
