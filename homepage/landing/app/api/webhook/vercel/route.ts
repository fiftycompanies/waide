import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

/**
 * Vercel Webhook 서명 검증
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  if (signature.length !== expectedSignature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Supabase REST API를 직접 호출하는 헬퍼
 */
async function supabaseQuery(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase 환경변수 미설정');
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API 오류: ${res.status} ${text}`);
  }

  if (options.method === 'PATCH') return null;

  return res.json();
}

/**
 * Vercel Deployment Webhook Handler
 *
 * 이벤트 유형:
 * - deployment.succeeded: 배포 성공 -> 프로젝트 상태를 'live'로 변경
 * - deployment.error: 배포 실패 -> 프로젝트 상태를 'build_failed'로 변경
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET 환경변수가 설정되지 않았습니다');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('x-vercel-signature');
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Webhook 서명 검증 실패');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type as string;
    const deploymentUrl = event.payload?.deployment?.url as string | undefined;
    const vercelProjectId = event.payload?.deployment?.projectId as string | undefined;

    if (!vercelProjectId) {
      return NextResponse.json({ message: 'No project ID in payload' }, { status: 200 });
    }

    // Vercel 프로젝트 ID로 홈페이지 프로젝트 조회
    const projects = await supabaseQuery(
      `homepage_projects?vercel_project_id=eq.${vercelProjectId}&select=id,status&limit=1`
    );

    if (!projects || projects.length === 0) {
      console.warn(`매핑되지 않는 Vercel 프로젝트: ${vercelProjectId}`);
      return NextResponse.json({ message: 'Project not found, skipping' }, { status: 200 });
    }

    const project = projects[0];

    if (eventType === 'deployment.succeeded' || eventType === 'deployment.ready') {
      await supabaseQuery(
        `homepage_projects?id=eq.${project.id}`,
        {
          method: 'PATCH',
          body: {
            status: 'live',
            vercel_deployment_url: deploymentUrl ? `https://${deploymentUrl}` : undefined,
            last_deployed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }
      );

      console.log(`프로젝트 ${project.id} 상태 -> live`);
    } else if (eventType === 'deployment.error') {
      await supabaseQuery(
        `homepage_projects?id=eq.${project.id}`,
        {
          method: 'PATCH',
          body: {
            status: 'build_failed',
            updated_at: new Date().toISOString(),
          },
        }
      );

      console.log(`프로젝트 ${project.id} 상태 -> build_failed`);
    } else {
      console.log(`무시된 Vercel 이벤트: ${eventType}`);
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Webhook 처리 오류:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
