"use client";

import { Phone, MessageCircle, FileText, BookOpen } from "lucide-react";
import { brand, footerNotices, estimateStatus } from "@/data/wallpaper-master";

const ctaItems = [
  { icon: FileText, label: "견적문의", href: "#estimate" },
  { icon: MessageCircle, label: "카카오톡", href: brand.kakaoLink },
  { icon: Phone, label: "전화상담", href: `tel:${brand.phone}` },
  { icon: BookOpen, label: "블로그", href: brand.blogLink },
];

export default function Footer() {
  return (
    <footer>
      {/* Part 1 - Blue CTA bar */}
      <div className="bg-wallpaper-blue">
        <div className="mx-auto flex max-w-[1260px] flex-wrap items-center justify-center gap-4 px-6 py-5 md:gap-6">
          {ctaItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 rounded-[30px] border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Part 2 - Light gray info section */}
      <div className="bg-wallpaper-light">
        <div className="mx-auto grid max-w-[1260px] gap-8 px-6 py-10 md:grid-cols-2 md:gap-12">
          {/* 견적 신청 현황 */}
          <div>
            <h3 className="mb-4 text-base font-bold text-wallpaper-heading">
              견적 신청 현황
            </h3>
            <div className="overflow-hidden rounded-lg border border-wallpaper-border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-wallpaper-border bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-wallpaper-text">
                      지역/평수
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-wallpaper-text">
                      시공종류
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-wallpaper-text">
                      상태
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-semibold text-wallpaper-text sm:table-cell">
                      날짜
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {estimateStatus.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-xs text-wallpaper-text">
                        {item.area}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-wallpaper-text">
                        {item.type}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "시공완료"
                              ? "bg-green-100 text-green-700"
                              : item.status === "시공중"
                                ? "bg-blue-100 text-wallpaper-blue"
                                : item.status === "견적완료"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 text-xs text-wallpaper-text sm:table-cell">
                        {item.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 공지사항 */}
          <div>
            <h3 className="mb-4 text-base font-bold text-wallpaper-heading">
              공지사항
            </h3>
            <div className="rounded-lg border border-wallpaper-border bg-white">
              <ul>
                {footerNotices.map((notice, i) => (
                  <li
                    key={notice.id}
                    className={`flex items-center justify-between px-4 py-3.5 ${
                      i < footerNotices.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <span className="text-sm text-wallpaper-text line-clamp-1">
                      {notice.title}
                    </span>
                    <span className="ml-4 flex-shrink-0 text-xs text-gray-400">
                      {notice.date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Part 3 - White footer bottom */}
      <div className="border-t border-wallpaper-border bg-white">
        <div className="mx-auto max-w-[1260px] px-6 py-10">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-10">
            {/* Logo */}
            <div className="text-center md:text-left">
              <h3 className="mb-2 text-xl font-bold text-wallpaper-blue">
                벽지마스터
              </h3>
              <a
                href={`tel:${brand.phone}`}
                className="block text-[32px] font-bold leading-tight text-wallpaper-blue md:text-[35px]"
              >
                {brand.phone}
              </a>
            </div>

            {/* Company info */}
            <div className="flex-1 text-center md:text-left">
              <div className="space-y-1 text-xs leading-relaxed text-wallpaper-text">
                <p>
                  대표: {brand.ceo} | 사업자등록번호: {brand.businessNumber}
                </p>
                <p>주소: {brand.address}</p>
                <p>
                  이메일:{" "}
                  <a
                    href={`mailto:${brand.email}`}
                    className="transition-colors hover:text-wallpaper-blue"
                  >
                    {brand.email}
                  </a>{" "}
                  | 운영시간: {brand.operatingHours}
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} {brand.name}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
