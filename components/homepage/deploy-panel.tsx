'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  deployProject,
  redeployProject,
  rollbackDeployment,
  getDeploymentHistory,
  getProjectStatus,
  destroyProject,
} from '@/lib/actions/homepage/deploy-actions';

interface DeploymentHistoryItem {
  id: string;
  url: string;
  readyState: string;
  createdAt: number;
}

interface DeployPanelProps {
  projectId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  collecting: { label: '자료 수집', color: 'bg-yellow-100 text-yellow-700' },
  building: { label: '빌드 중', color: 'bg-blue-100 text-blue-700' },
  preview: { label: '프리뷰', color: 'bg-purple-100 text-purple-700' },
  live: { label: '라이브', color: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: '중단', color: 'bg-gray-100 text-gray-600' },
};

const readyStateLabels: Record<string, string> = {
  QUEUED: '대기 중',
  BUILDING: '빌드 중',
  READY: '완료',
  ERROR: '오류',
  CANCELED: '취소',
};

const readyStateColors: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-700',
  BUILDING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  ERROR: 'bg-red-100 text-red-700',
  CANCELED: 'bg-gray-100 text-gray-700',
};

export default function DeployPanel({ projectId }: DeployPanelProps) {
  const [status, setStatus] = useState<string>('collecting');
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [lastDeployedAt, setLastDeployedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<DeploymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statusResult, historyResult] = await Promise.all([
        getProjectStatus(projectId),
        getDeploymentHistory(projectId),
      ]);

      if (statusResult.success && statusResult.data) {
        setStatus(statusResult.data.status);
        setSubdomain(statusResult.data.subdomain);
        setDeploymentUrl(statusResult.data.vercelDeploymentUrl);
        setLastDeployedAt(statusResult.data.lastDeployedAt);
      }

      if (historyResult.success && historyResult.data) {
        setHistory(historyResult.data);
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

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await deployProject(projectId);
      if (result.success && result.data) {
        setSuccessMessage(`배포 시작됨: ${result.data.deploymentUrl}`);
        await loadData();
      } else {
        setError(result.error || '배포에 실패했습니다.');
      }
    } catch (err) {
      setError('배포 중 오류가 발생했습니다.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRedeploy = async () => {
    setIsDeploying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await redeployProject(projectId);
      if (result.success) {
        setSuccessMessage('재배포가 트리거되었습니다.');
        await loadData();
      } else {
        setError(result.error || '재배포에 실패했습니다.');
      }
    } catch (err) {
      setError('재배포 중 오류가 발생했습니다.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    if (!confirm('이 배포 버전으로 롤백하시겠습니까?')) return;

    setIsDeploying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await rollbackDeployment(projectId, deploymentId);
      if (result.success) {
        setSuccessMessage('롤백이 완료되었습니다.');
        await loadData();
      } else {
        setError(result.error || '롤백에 실패했습니다.');
      }
    } catch (err) {
      setError('롤백 중 오류가 발생했습니다.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDestroy = async () => {
    setIsDeploying(true);
    setError(null);

    try {
      const result = await destroyProject(projectId);
      if (result.success) {
        setSuccessMessage('프로젝트가 삭제되었습니다.');
        setShowDeleteConfirm(false);
        await loadData();
      } else {
        setError(result.error || '프로젝트 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('프로젝트 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeploying(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="mt-4 h-4 w-64 rounded bg-gray-100" />
          <div className="mt-6 h-10 w-24 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6">
      {/* 현재 상태 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">배포 상태</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              {lastDeployedAt && (
                <span className="text-sm text-gray-500">
                  마지막 배포: {new Date(lastDeployedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(status === 'live' || status === 'preview') && (
              <button
                onClick={handleRedeploy}
                disabled={isDeploying}
                className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                재배포
              </button>
            )}
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isDeploying ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  배포 중...
                </span>
              ) : (
                '배포'
              )}
            </button>
          </div>
        </div>

        {/* 프리뷰 URL */}
        {subdomain && (
          <div className="mt-4 rounded-md bg-gray-50 p-3">
            <p className="text-sm text-gray-500">프리뷰 URL</p>
            <a
              href={`https://${subdomain}.waide.kr`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              https://{subdomain}.waide.kr
            </a>
          </div>
        )}

        {deploymentUrl && deploymentUrl !== `https://${subdomain}.waide.kr` && (
          <div className="mt-2 rounded-md bg-gray-50 p-3">
            <p className="text-sm text-gray-500">Vercel 배포 URL</p>
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {deploymentUrl}
            </a>
          </div>
        )}

        {/* 빌드 중 프로그레스 */}
        {status === 'building' && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <span className="text-sm text-blue-700">빌드 진행 중...</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
            </div>
          </div>
        )}
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

      {/* 배포 이력 */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">배포 이력</h3>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            배포 이력이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    URL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {history.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          readyStateColors[item.readyState] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {readyStateLabels[item.readyState] || item.readyState}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {item.url}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      {index > 0 && item.readyState === 'READY' && (
                        <button
                          onClick={() => handleRollback(item.id)}
                          disabled={isDeploying}
                          className="text-orange-600 hover:text-orange-700 disabled:opacity-50"
                        >
                          롤백
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 프로젝트 삭제 */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-base font-semibold text-red-900">위험 영역</h3>
        <p className="mt-1 text-sm text-red-700">
          프로젝트를 삭제하면 Vercel 프로젝트와 배포가 모두 제거됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>

        {showDeleteConfirm ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-medium text-red-900">정말 삭제하시겠습니까?</span>
            <button
              onClick={handleDestroy}
              disabled={isDeploying}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              삭제 확인
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            프로젝트 삭제
          </button>
        )}
      </div>
    </div>
  );
}
