'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateMonthlySchedule,
  executeScheduledPosts,
  getPublishedPosts,
  generateInitialBlogs,
  getPublicationStats,
  unpublishPost,
} from '@/lib/actions/homepage/publishing-actions';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  contentType: string;
  mainKeyword: string;
  publishedAt: string;
  qualityScore: number;
}

interface PublicationStatsData {
  totalPublished: number;
  thisMonth: number;
  byType: Record<string, number>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

interface BlogManagerProps {
  projectId: string;
}

const contentTypeLabels: Record<string, string> = {
  hp_blog_info: '정보성',
  hp_blog_review: '후기성',
};

const contentTypeColors: Record<string, string> = {
  hp_blog_info: 'bg-blue-100 text-blue-700',
  hp_blog_review: 'bg-green-100 text-green-700',
};

export default function BlogManager({ projectId }: BlogManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [stats, setStats] = useState<PublicationStatsData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const limit = 20;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [postsResult, statsResult] = await Promise.all([
        getPublishedPosts(projectId, page, limit),
        getPublicationStats(projectId),
      ]);

      if (postsResult.success && postsResult.data) {
        setPosts(postsResult.data.posts);
        setTotalPosts(postsResult.data.total);
      } else {
        setError(postsResult.error || '포스트 목록을 불러올 수 없습니다.');
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data as PublicationStatsData);
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateInitial = async () => {
    if (!confirm('초기 블로그 8개(정보성 4 + 후기성 4)를 생성합니다. 계속하시겠습니까?')) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateInitialBlogs(projectId);
      if (result.success && result.data) {
        setSuccessMessage(`초기 블로그 ${result.data.count}개가 생성되었습니다.`);
        await loadData();
      } else {
        setError(result.error || '초기 블로그 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('초기 블로그 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSchedule = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateMonthlySchedule(projectId);
      if (result.success && result.data) {
        const total = result.data.infoPosts.length + result.data.reviewPosts.length;
        setSuccessMessage(
          `월간 스케줄 생성 완료: 정보성 ${result.data.infoPosts.length}개, 후기성 ${result.data.reviewPosts.length}개 (총 ${total}개)`
        );
      } else {
        setError(result.error || '월간 스케줄 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('스케줄 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteSchedule = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await executeScheduledPosts(projectId);
      if (result.success) {
        setSuccessMessage('스케줄된 포스트가 실행되었습니다.');
        await loadData();
      } else {
        setError(result.error || '스케줄 실행에 실패했습니다.');
      }
    } catch (err) {
      setError('스케줄 실행 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnpublish = async (contentId: string) => {
    if (!confirm('이 포스트의 발행을 취소하시겠습니까?')) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await unpublishPost(contentId);
      if (result.success) {
        setSuccessMessage('발행이 취소되었습니다.');
        await loadData();
      } else {
        setError(result.error || '발행 취소에 실패했습니다.');
      }
    } catch (err) {
      setError('발행 취소 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalPosts / limit);
  const infoCount = stats?.byType?.hp_blog_info || 0;
  const reviewCount = stats?.byType?.hp_blog_review || 0;
  const infoRatio = stats && stats.totalPublished > 0
    ? Math.round((infoCount / stats.totalPublished) * 100)
    : 0;
  const reviewRatio = stats && stats.totalPublished > 0
    ? Math.round((reviewCount / stats.totalPublished) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">블로그 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            홈페이지 블로그 콘텐츠를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateInitial}
            disabled={isProcessing}
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            초기 블로그 생성
          </button>
          <button
            onClick={handleGenerateSchedule}
            disabled={isProcessing}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            월간 스케줄 생성
          </button>
          <button
            onClick={handleExecuteSchedule}
            disabled={isProcessing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? '처리 중...' : '스케줄 실행'}
          </button>
        </div>
      </div>

      {/* 알림 메시지 */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 발행 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">총 발행</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalPublished}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-600">이번 달</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{stats.thisMonth}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-4">
            <p className="text-xs text-gray-500">정보성</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{infoCount}</p>
            <p className="text-xs text-gray-400">{infoRatio}%</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-white p-4">
            <p className="text-xs text-gray-500">후기성</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{reviewCount}</p>
            <p className="text-xs text-gray-400">{reviewRatio}%</p>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <span className="ml-3 text-sm text-gray-500">데이터 로드 중...</span>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && posts.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">발행된 블로그가 없습니다</h3>
          <p className="mt-2 text-sm text-gray-500">
            &quot;초기 블로그 생성&quot; 버튼을 클릭하여 8개의 초기 블로그를 생성하세요.
          </p>
        </div>
      )}

      {/* 발행된 포스트 목록 */}
      {!isLoading && posts.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  제목
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  타입
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  키워드
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  발행일
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  품질
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="max-w-xs truncate" title={post.title}>
                      {post.title}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        contentTypeColors[post.contentType] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {contentTypeLabels[post.contentType] || post.contentType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {post.mainKeyword}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${
                            post.qualityScore >= 80
                              ? 'bg-green-500'
                              : post.qualityScore >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${post.qualityScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{post.qualityScore}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleUnpublish(post.id)}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      발행 취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">
                총 {totalPosts}개 중 {(page - 1) * limit + 1}-{Math.min(page * limit, totalPosts)}개 표시
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-md px-3 py-1 text-sm ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
