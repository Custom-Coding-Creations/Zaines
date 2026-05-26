import { NextRequest, NextResponse } from "next/server";
import { processDueScheduledCampaigns } from "@/lib/api/admin-crm";
import { getCorrelationId, errorResponse, logServerFailure } from "@/lib/security/api";
import { logSecurityEvent } from "@/lib/security/logging";

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  return bearer === configuredSecret || headerSecret === configuredSecret;
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  if (!isAuthorized(request)) {
    return errorResponse({
      status: 401,
      errorCode: "CRON_UNAUTHORIZED",
      message: "Cron authorization failed.",
      retryable: false,
      correlationId,
    });
  }

  try {
    const result = await processDueScheduledCampaigns();

    logSecurityEvent({
      route: "/api/cron/crm-campaigns",
      event: "CRM_CAMPAIGNS_CRON_RAN",
      correlationId,
      context: {
        processedCampaigns: result.processedCampaigns,
        processedRecipientRows: result.processedRecipientRows,
      },
    });

    return NextResponse.json({
      success: true,
      correlationId,
      data: result,
    });
  } catch (error) {
    logServerFailure("/api/cron/crm-campaigns", "CRM_CAMPAIGNS_CRON_FAILED", correlationId, error);
    return errorResponse({
      status: 500,
      errorCode: "CRM_CAMPAIGNS_CRON_FAILED",
      message: "CRM campaigns cron execution failed.",
      retryable: true,
      correlationId,
    });
  }
}
