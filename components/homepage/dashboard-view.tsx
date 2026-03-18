'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardDataAction } from '@/lib/actions/homepage/monitoring-actions';

interface DashboardKpis {
  monthlyVisits: number;
  monthlyInquiries: number;
  conversionRate: number;
  blogPosts: number;
  visitsGrowth: number;
  inquiriesGrowth: number;
}

interface DashboardCharts {
  dailyVisits: Array<{ date: string; visits: number }>;
  inquiryStatus: Record<string, number>;
  topPages: Array<{ path: string; views: number }>;
  referrers: Array<{ source: string; count: number }>;
}

interface DashboardViewProps {
  projectId: string;
}

type AnalyticsPeriod = 'day' | 'week' | 'month';

const periodLabels: Record<AnalyticsPeriod, string> = {
  day: '오늘',
  week: '이번 주',
  month: '이번 달',
};

const inquiryStatusLabels: Record<string, string> = {
  new: '신규',
  contacted: '연락 완료',
  consulting: '상담 중',
  contracted: '계약 완료',
  lost: '이탈',
};

const inquiryStatusColors: Record<string, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  consulting: 'bg-purple-500',
  contracted: 'bg-green-500',
  lost: 'bg-gray-400',
};

export default function DashboardView({ projectId }: DashboardViewProps) {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDashboardDataAction(projectId);
      if (result.success && result.data) {
        setKpis(result.data.kpis);
        setCharts(result.data.charts);
      } else {
        setError(result.error || '대시보드 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="mt-2 h-8 w-20 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 text-sm font-medium text-red-700 hover:text-red-800"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!kpis || !charts) return null;

  // 일별 방문 차트 최대값
  const maxDailyVisits = Math.max(...charts.dailyVisits.map((d) => d.visits), 1);

  // 유입경로 최대값
  const maxReferrerCount = Math.max(...charts.referrers.map((r) => r.count), 1);

  // 상담 총 건수
  const totalInquiries = Object.values(charts.inquiryStatus).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">대시보드</h2>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(['day', 'week', 'month'] as AnalyticsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-600">월 방문수</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{kpis.monthlyVisits.toLocaleString()}</p>
          <p className={`text-xs ${kpis.visitsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpis.visitsGrowth >= 0 ? '+' : ''}{kpis.visitsGrowth}%
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-600">월 상담수</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{kpis.monthlyInquiries}</p>
          <p className={`text-xs ${kpis.inquiriesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpis.inquiriesGrowth >= 0 ? '+' : ''}{kpis.inquiriesGrowth}%
          </p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs text-yellow-600">전환율</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">{kpis.conversionRate}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">블로그 수</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpis.blogPosts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 일별 방문 추이 차트 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">일별 방문 추이</h3>
          <div className="mt-4 flex items-end gap-[2px]" style={{ height: '200px' }}>
            {charts.dailyVisits.slice(-30).map((day) => {
              const height = maxDailyVisits > 0
                ? Math.max((day.visits / maxDailyVisits) * 100, 2)
                : 2;
              return (
                <div
                  key={day.date}
                  className="group relative flex-1 cursor-pointer"
                  style={{ height: '100%' }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-blue-500 transition-colors group-hover:bg-blue-600"
                    style={{ height: `${height}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                    {day.date.slice(5)}: {day.visits}회
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>{charts.dailyVisits.length > 0 ? charts.dailyVisits[Math.max(0, charts.dailyVisits.length - 30)].date.slice(5) : ''}</span>
            <span>{charts.dailyVisits.length > 0 ? charts.dailyVisits[charts.dailyVisits.length - 1].date.slice(5) : ''}</span>
          </div>
        </div>

        {/* 유입 경로 분포 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">유입 경로</h3>
          <div className="mt-4 space-y-3">
            {charts.referrers.slice(0, 6).map((ref) => {
              const percentage = maxReferrerCount > 0
                ? Math.round((ref.count / maxReferrerCount) * 100)
                : 0;
              return (
                <div key={ref.source}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{ref.source}</span>
                    <span className="font-medium text-gray-900">{ref.count}회</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {charts.referrers.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">데이터 없음</p>
            )}
          </div>
        </div>

        {/* 인기 페이지 TOP 10 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">인기 페이지 TOP 10</h3>
          <div className="mt-4 space-y-2">
            {charts.topPages.slice(0, 10).map((page, index) => (
              <div
                key={page.path}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{page.path}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {page.views.toLocaleString()}
                </span>
              </div>
            ))}
            {charts.topPages.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">데이터 없음</p>
            )}
          </div>
        </div>

        {/* 상담 상태별 분포 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">상담 상태</h3>
          <p className="mt-1 text-sm text-gray-500">총 {totalInquiries}건</p>
          <div className="mt-4 space-y-3">
            {Object.entries(charts.inquiryStatus).map(([status, count]) => {
              const percentage = totalInquiries > 0
                ? Math.round((count / totalInquiries) * 100)
                : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          inquiryStatusColors[status] || 'bg-gray-400'
                        }`}
                      />
                      <span className="text-gray-700">
                        {inquiryStatusLabels[status] || status}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {count}건 ({percentage}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        inquiryStatusColors[status] || 'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(charts.inquiryStatus).length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">데이터 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
