'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateKeywordsForProject,
  regenerateKeywordsForProject,
  previewKeywords,
} from '@/lib/homepage/keywords/keyword-actions';

interface KeywordEntry {
  keyword: string;
  source: string;
  priority: string;
  is_primary: boolean;
  blog_type?: string;
}

interface KeywordManagerProps {
  projectId: string;
  serviceRegions: string[];
  serviceTypes: string[];
}

type FilterSource = 'all' | 'homepage_seo' | 'blog_target' | 'manual';
type FilterBlogType = 'all' | '정보성' | '후기성' | 'AEO';

export default function KeywordManager({
  projectId,
  serviceRegions,
  serviceTypes,
}: KeywordManagerProps) {
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // 필터
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all');
  const [blogTypeFilter, setBlogTypeFilter] = useState<FilterBlogType>('all');

  // 통계
  const totalCount = keywords.length;
  const homepageSeoCount = keywords.filter((k) => k.source === 'homepage_seo').length;
  const blogTargetCount = keywords.filter((k) => k.source === 'blog_target').length;
  const infoCount = keywords.filter((k) => k.blog_type === '정보성' || k.blog_type === 'AEO').length;
  const reviewCount = keywords.filter((k) => k.blog_type === '후기성').length;

  // 필터링된 키워드
  const filteredKeywords = keywords.filter((k) => {
    if (sourceFilter !== 'all' && k.source !== sourceFilter) return false;
    if (blogTypeFilter !== 'all' && k.blog_type !== blogTypeFilter) return false;
    return true;
  });

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGenerateResult(null);

    try {
      const result = await generateKeywordsForProject(projectId);
      if (result.success && result.data) {
        setGenerateResult(
          `${result.data.totalInserted}개 키워드 생성 완료 (중복 ${result.data.duplicatesSkipped}개 스킵)`
        );
        await handlePreview();
      } else {
        setError(result.error || '키워드 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('키워드 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleRegenerate = useCallback(async () => {
    if (!confirm('기존 자동 생성 키워드를 삭제하고 재생성합니다. 계속하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setGenerateResult(null);

    try {
      const result = await regenerateKeywordsForProject(projectId);
      if (result.success && result.data) {
        setGenerateResult(
          `키워드 재생성 완료: ${result.data.totalInserted}개 생성`
        );
        await handlePreview();
      } else {
        setError(result.error || '키워드 재생성에 실패했습니다.');
      }
    } catch (err) {
      setError('키워드 재생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await previewKeywords(serviceRegions, serviceTypes, projectId);
      if (result.success && result.data) {
        setKeywords(result.data.keywords);
        setIsPreviewMode(true);
      } else {
        setError(result.error || '프리뷰 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('프리뷰 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [serviceRegions, serviceTypes, projectId]);

  // 초기 로드
  useEffect(() => {
    if (serviceRegions.length > 0 && serviceTypes.length > 0) {
      handlePreview();
    }
  }, []);

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  const sourceLabels: Record<string, string> = {
    homepage_seo: '홈페이지 SEO',
    blog_target: '블로그 타겟',
    manual: '수동',
    niche_expansion: '니치 확장',
    csv_import: 'CSV 가져오기',
  };

  const blogTypeColors: Record<string, string> = {
    '정보성': 'bg-blue-100 text-blue-700',
    '후기성': 'bg-green-100 text-green-700',
    'AEO': 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">키워드 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isPreviewMode ? '프리뷰 모드 - DB에 저장되지 않은 상태입니다.' : '프로젝트의 SEO 키워드를 관리합니다.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            프리뷰
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            키워드 재생성
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '처리 중...' : '키워드 자동 생성'}
          </button>
        </div>
      </div>

      {/* 결과 메시지 */}
      {generateResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {generateResult}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">총 키워드</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-600">홈페이지 SEO</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{homepageSeoCount}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-green-600">블로그 타겟</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{blogTargetCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">정보성</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{infoCount}</p>
          <p className="text-xs text-gray-400">{totalCount > 0 ? `${Math.round((infoCount / totalCount) * 100)}%` : '0%'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">후기성</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{reviewCount}</p>
          <p className="text-xs text-gray-400">{totalCount > 0 ? `${Math.round((reviewCount / totalCount) * 100)}%` : '0%'}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">소스:</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as FilterSource)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="homepage_seo">홈페이지 SEO</option>
            <option value="blog_target">블로그 타겟</option>
            <option value="manual">수동</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">블로그 타입:</label>
          <select
            value={blogTypeFilter}
            onChange={(e) => setBlogTypeFilter(e.target.value as FilterBlogType)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="정보성">정보성</option>
            <option value="후기성">후기성</option>
            <option value="AEO">AEO</option>
          </select>
        </div>
        <span className="text-sm text-gray-500 self-center">
          {filteredKeywords.length}개 표시 중
        </span>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <span className="ml-3 text-sm text-gray-500">키워드 처리 중...</span>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && keywords.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">키워드가 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            &quot;키워드 자동 생성&quot; 또는 &quot;프리뷰&quot; 버튼을 클릭하여 키워드를 확인하세요.
          </p>
        </div>
      )}

      {/* 키워드 테이블 */}
      {!isLoading && filteredKeywords.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  키워드
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  소스
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  우선순위
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  블로그 타입
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredKeywords.map((keyword, index) => (
                <tr key={`${keyword.keyword}-${index}`} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {keyword.keyword}
                      {keyword.is_primary && (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          대표
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {sourceLabels[keyword.source] || keyword.source}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        priorityColors[keyword.priority] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {keyword.priority}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {keyword.blog_type ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          blogTypeColors[keyword.blog_type] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {keyword.blog_type}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {isPreviewMode ? (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        프리뷰
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        활성
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
