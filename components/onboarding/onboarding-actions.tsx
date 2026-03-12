"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BrandAnalysisModal } from "./brand-analysis-modal";

interface OnboardingActionsProps {
  clients: Array<{ id: string; name: string }>;
}

export function OnboardingActions({ clients }: OnboardingActionsProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        새 브랜드 분석
      </button>

      <BrandAnalysisModal
        open={showModal}
        onClose={() => setShowModal(false)}
        clients={clients}
      />
    </>
  );
}
