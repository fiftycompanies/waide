"use server";

import { createAdminClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProductFeature {
  key: string;
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  features: ProductFeature[];
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
  highlight_label: string | null;
  created_at: string;
  updated_at: string;
  // 조인
  subscription_count?: number;
}

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  price: number;
  features: ProductFeature[];
  is_public?: boolean;
  sort_order?: number;
  highlight_label?: string;
}

// ── 상품 CRUD ──────────────────────────────────────────────────────────────

export async function getProducts() {
  const db = createAdminClient();

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];

  // 각 상품별 구독 수 집계
  const products = data || [];
  for (const product of products) {
    const { count } = await db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id)
      .in("status", ["active", "trial"]);
    (product as Product).subscription_count = count || 0;
  }

  return products as Product[];
}

export async function getPublicProducts() {
  const db = createAdminClient();

  const { data } = await db
    .from("products")
    .select("id, name, slug, description, price, features, highlight_label, sort_order")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data || []) as Product[];
}

export async function createProduct(input: ProductInput) {
  const db = createAdminClient();

  const { data, error } = await db
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      price: input.price,
      features: input.features,
      is_public: input.is_public ?? true,
      sort_order: input.sort_order ?? 0,
      highlight_label: input.highlight_label || null,
    })
    .select("id")
    .single();

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/ops/products");
  return { success: true as const, id: data.id };
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.price !== undefined) updateData.price = input.price;
  if (input.features !== undefined) updateData.features = input.features;
  if (input.is_public !== undefined) updateData.is_public = input.is_public;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.highlight_label !== undefined) updateData.highlight_label = input.highlight_label || null;

  const { error } = await db
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/ops/products");
  return { success: true as const };
}

export async function deleteProduct(id: string) {
  const db = createAdminClient();

  // Soft delete
  const { error } = await db
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/ops/products");
  return { success: true as const };
}

// ── 구독 관리 ──────────────────────────────────────────────────────────────

export async function createSubscription(
  clientId: string,
  productId: string,
  mrr: number,
  expiresAt?: string,
) {
  const db = createAdminClient();

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      client_id: clientId,
      product_id: productId,
      mrr,
      status: "active",
      expires_at: expiresAt || null,
    })
    .select("id")
    .single();

  if (error) return { success: false as const, error: error.message };

  // clients 테이블에 subscription_id 연결
  await db
    .from("clients")
    .update({ subscription_id: data.id })
    .eq("id", clientId);

  revalidatePath("/ops/clients");
  return { success: true as const, id: data.id };
}

export async function updateSubscription(
  id: string,
  data: { status?: string; mrr?: number; expires_at?: string; notes?: string },
) {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.status) updateData.status = data.status;
  if (data.mrr !== undefined) updateData.mrr = data.mrr;
  if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { error } = await db
    .from("subscriptions")
    .update(updateData)
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/ops/clients");
  return { success: true as const };
}

export async function cancelSubscription(id: string, reason: string) {
  return updateSubscription(id, {
    status: "cancelled",
    notes: reason,
  });
}

export async function getClientSubscription(clientId: string) {
  const db = createAdminClient();

  const { data } = await db
    .from("subscriptions")
    .select("*, products(name, slug, features, price)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
