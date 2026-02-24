"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setSelectedClient } from "@/lib/actions/brand-actions";
import type { AiMarketBrand } from "@/lib/actions/brand-actions";
import { cn } from "@/lib/utils";

interface BrandSelectorProps {
  brands: AiMarketBrand[];
  selectedClientId: string | null;
}

export function BrandSelector({ brands, selectedClientId }: BrandSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedBrand = brands.find((b) => b.id === selectedClientId);

  // 부모/자식 분리
  const parentBrands = brands.filter((b) => b.parent_id === null);
  const childrenByParent = brands.reduce<Record<string, AiMarketBrand[]>>((acc, b) => {
    if (b.parent_id) {
      if (!acc[b.parent_id]) acc[b.parent_id] = [];
      acc[b.parent_id].push(b);
    }
    return acc;
  }, {});

  // 자식이 없는 브랜드 (독립 브랜드) — 기존 데이터 호환
  const standaloneParents = parentBrands.filter((b) => !childrenByParent[b.id]);
  const groupParents = parentBrands.filter((b) => !!childrenByParent[b.id]);

  function handleSelect(brandId: string | null) {
    setOpen(false);
    startTransition(async () => {
      await setSelectedClient(brandId);
      router.refresh();
    });
  }

  return (
    <div className="px-3 pb-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        활성 브랜드
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isPending}
            className="w-full h-8 justify-between px-2 text-xs font-normal bg-muted/40 border-border/60 hover:bg-muted/60"
          >
            <span className="truncate">
              {isPending
                ? "변경 중..."
                : selectedBrand?.name ?? "🌐 전체 브랜드"}
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-1.5" />
              <CommandInput
                placeholder="브랜드 검색..."
                className="h-9 text-xs border-0 focus:ring-0 px-0"
              />
            </div>
            <CommandList>
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                검색 결과 없음
              </CommandEmpty>

              {/* 전체 브랜드 옵션 */}
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect(null)}
                  className="text-xs gap-2"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      !selectedClientId ? "opacity-100 text-violet-600" : "opacity-0"
                    )}
                  />
                  🌐 전체 브랜드
                </CommandItem>
              </CommandGroup>

              {/* 계층형 브랜드 그룹 (플랫폼 → 자식 브랜드) */}
              {groupParents.map((parent) => (
                <CommandGroup key={parent.id} heading={parent.name}>
                  {/* 부모 선택 항목 */}
                  <CommandItem
                    value={parent.name}
                    onSelect={() => handleSelect(parent.id)}
                    className="text-xs gap-2"
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        selectedClientId === parent.id
                          ? "opacity-100 text-violet-600"
                          : "opacity-0"
                      )}
                    />
                    {parent.name}
                  </CommandItem>
                  {/* 자식 항목 들여쓰기 */}
                  {(childrenByParent[parent.id] ?? []).map((child) => (
                    <CommandItem
                      key={child.id}
                      value={`${parent.name} ${child.name}`}
                      onSelect={() => handleSelect(child.id)}
                      className="text-xs gap-2 pl-6 text-muted-foreground"
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          selectedClientId === child.id
                            ? "opacity-100 text-violet-600"
                            : "opacity-0"
                        )}
                      />
                      └ {child.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {/* 독립 브랜드 (계층 없음) */}
              {standaloneParents.length > 0 && (
                <CommandGroup heading="플랫폼/브랜드">
                  {standaloneParents.map((brand) => (
                    <CommandItem
                      key={brand.id}
                      value={brand.name}
                      onSelect={() => handleSelect(brand.id)}
                      className="text-xs gap-2"
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          selectedClientId === brand.id
                            ? "opacity-100 text-violet-600"
                            : "opacity-0"
                        )}
                      />
                      {brand.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
