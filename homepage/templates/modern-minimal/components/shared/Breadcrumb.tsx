import Link from 'next/link';
import { BreadcrumbJsonLd } from './JsonLd';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * ChevronRight 아이콘 (구분자)
 */
function ChevronRight() {
  return (
    <svg
      className="mx-2 h-4 w-4 flex-shrink-0 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/**
 * Breadcrumb 네비게이션 컴포넌트
 *
 * - items: 경로 항목 배열 ({label, href?})
 * - 마지막 항목(현재 페이지)은 링크 없이 활성 텍스트로 표시
 * - JSON-LD BreadcrumbList 스키마 자동 생성
 *
 * @example
 * <Breadcrumb items={[
 *   { label: 'Home', href: '/' },
 *   { label: 'Portfolio', href: '/portfolio' },
 *   { label: '모던 거실 인테리어' },
 * ]} />
 */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  // JSON-LD 스키마용 데이터 구성
  // href가 없는 항목(현재 페이지)도 현재 URL로 생성
  const schemaItems = items.map((item, index) => ({
    name: item.label,
    url: item.href || (typeof window !== 'undefined' ? window.location.href : '#'),
  }));

  return (
    <>
      {/* JSON-LD BreadcrumbList 스키마 */}
      <BreadcrumbJsonLd items={schemaItems} />

      {/* 시각적 Breadcrumb */}
      <nav aria-label="breadcrumb" className="py-3">
        <ol className="flex items-center flex-wrap text-sm">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center">
                {/* 구분자 (첫 번째 항목 제외) */}
                {index > 0 && <ChevronRight />}

                {/* 링크 또는 현재 페이지 텍스트 */}
                {!isLast && item.href ? (
                  <Link
                    href={item.href}
                    className="text-gray-500 transition-colors hover:text-gray-900"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? 'font-medium text-gray-900'
                        : 'text-gray-500'
                    }
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
