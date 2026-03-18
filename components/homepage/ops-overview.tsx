'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getOpsOverviewDataAction } from '@/lib/actions/homepage/monitoring-actions';

interface ProjectSummary {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  visits: number;
  inquiries: number;
  conversionRate: number;
  lastDeployedAt: string | null;
}

type SortField = 'visits' | 'inquiries' | 'conversionRate';
type SortDirection = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  collecting: { label: '자료 수집', color: 'bg-yellow-100 text-yellow-700' },
  building: { label: '빌드 중', color: 'bg-blue-100 text-blue-700' },
  preview: { label: '프리뷰', color: 'bg-purple-100 text-purple-700' },
  live: { label: '라이브', color: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: '중단', color: 'bg-gray-100 text-gray-600' },
};

export default function OpsOverview() {
  const [totalLiveProjects, setTotalLiveProjects] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [avgConversionRate, setAvgConversionRate] = useState(0);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 정렬
  const [sortField, setSortField] = useState<SortField>('visits');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getOpsOverviewDataAction();
      if (result.success && result.data) {
        setTotalLiveProjects(result.data.totalLiveProjects);
        setTotalVisits(result.data.totalVisits);
        setTotalInquiries(result.data.totalInquiries);
        setAvgConversionRate(result.data.avgConversionRate);
        setProjects(result.data.projects);
      } else {
        setError(result.error || '운영 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    return (aVal - bVal) * direction;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="ml-1 inline h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
        </svg>
      );
    }
    return sortDirection === 'desc' ? (
      <svg className="ml-1 inline h-3 w-3 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 9l5 5 5-5" />
      </svg>
    ) : (
      <svg className="ml-1 inline h-3 w-3 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 15l5-5 5 5" />
      </svg>
    );
  };

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
        <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full rounded bg-gray-100" />
            ))}
          </div>
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">운영 총괄</h2>
        <p className="mt-1 text-sm text-gray-500">
          전체 라이브 프로젝트의 현황을 한눈에 확인합니다.
        </p>
      </div>

      {/* 총괄 KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-600">라이브 프로젝트</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{totalLiveProjects}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-600">총 방문수</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{totalVisits.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs text-yellow-600">총 상담수</p>
          <p className="mt-1 text-2xl font-bold text-yellow-700">{totalInquiries.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">평균 전환율</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{avgConversionRate}%</p>
        </div>
      </div>

      {/* 프로젝트별 테이블 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            프로젝트 현황 ({projects.length}개)
          </h3>
        </div>

        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            라이브 또는 프리뷰 상태의 프로젝트가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    프로젝트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    서브도메인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    상태
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('visits')}
                  >
                    방문수
                    <SortIcon field="visits" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('inquiries')}
                  >
                    상담수
                    <SortIcon field="inquiries" />
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('conversionRate')}
                  >
                    전환율
                    <SortIcon field="conversionRate" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    최근 배포
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedProjects.map((project) => {
                  const statusConfig = STATUS_CONFIG[project.status] || { label: project.status, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {project.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {project.subdomain ? (
                          <a
                            href={`https://${project.subdomain}.waide.kr`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {project.subdomain}.waide.kr
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {project.visits.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {project.inquiries.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <span
                          className={`font-medium ${
                            project.conversionRate >= 3
                              ? 'text-green-600'
                              : project.conversionRate >= 1
                              ? 'text-yellow-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {project.conversionRate}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                        {project.lastDeployedAt
                          ? new Date(project.lastDeployedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
