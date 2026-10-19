import "server-only";

type VerificationRecord = { name: string; type: "TXT"; value: string };
type CloudflareHostname = {
  id: string;
  hostname: string;
  status?: string;
  ownership_verification?: { name?: string; type?: string; value?: string };
  ssl?: { status?: string; validation_errors?: Array<{ message?: string }> };
  verification_errors?: string[];
};

type CloudflareResponse<T> = {
  success: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
};

function configuration() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const cnameTarget = process.env.CLOUDFLARE_SAAS_CNAME_TARGET;
  if (!token || !zoneId || !cnameTarget) {
    throw new Error("Configure CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID e CLOUDFLARE_SAAS_CNAME_TARGET.");
  }
  return { token, zoneId, cnameTarget };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { token, zoneId } = configuration();
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => ({ success: false, errors: [{ message: "Resposta inválida da Cloudflare." }] })) as CloudflareResponse<T>;
  if (!response.ok || !payload.success || !payload.result) {
    throw new Error(payload.errors?.map((error) => error.message).filter(Boolean).join("; ") || "A Cloudflare não concluiu a operação.");
  }
  return payload.result;
}

function verification(result: CloudflareHostname): VerificationRecord | null {
  const record = result.ownership_verification;
  return record?.name && record.value ? { name: record.name, type: "TXT", value: record.value } : null;
}

export function cloudflareDomainConfig() {
  const { cnameTarget } = configuration();
  return { cnameTarget };
}

export async function createCustomHostname(hostname: string, tenantId: string) {
  const result = await request<CloudflareHostname>("/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      custom_metadata: { tenant_id: tenantId },
      ssl: { method: "txt", type: "dv", bundle_method: "ubiquitous", certificate_authority: "google" },
    }),
  });
  return { id: result.id, status: result.status ?? "pending", sslStatus: result.ssl?.status ?? "pending", verification: verification(result) };
}

export async function getCustomHostname(id: string) {
  const result = await request<CloudflareHostname>(`/custom_hostnames/${encodeURIComponent(id)}`);
  const active = result.status === "active" && result.ssl?.status === "active";
  const error = [...(result.verification_errors ?? []), ...(result.ssl?.validation_errors ?? []).map((entry) => entry.message).filter(Boolean)]
    .filter(Boolean).join("; ") || null;
  return { active, status: result.status ?? "pending", sslStatus: result.ssl?.status ?? "pending", verification: verification(result), error };
}

export async function deleteCustomHostname(id: string) {
  await request<{ id: string }>(`/custom_hostnames/${encodeURIComponent(id)}`, { method: "DELETE" });
}
