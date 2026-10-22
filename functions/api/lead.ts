/**
 * Cloudflare Pages Function: /api/lead
 *
 * Serverless edge engineering inquiry & 5-step RFQ intake endpoint for Sawtooth Industrial Solutions (siscontrols.com).
 * Validates US NANP phone numbers, filters automated spam bots,
 * dispatches instant push notifications to ntfy, and forwards to n8n (/webhook/inbound-lead).
 */

interface Env {
  N8N_WEBHOOK_BEARER_TOKEN?: string;
  PURELYMAIL_API_TOKEN?: string;
  LEAD_EMAIL_RECIPIENT?: string;
  LEAD_EMAIL_FROM?: string;
  [key: string]: any;
}

const SPAM_TEXT_PATTERNS = [
  /xin\s+chào/i,
  /muốn\s+biết\s+giá/i,
  /[\u0400-\u04FF\u4E00-\u9FFF\u0600-\u06FF]/,
  /https?:\/\/|www\./i,
  /\[url=/i,
  /\b(crypto|bitcoin|casino|viagra|backlinks|seo\s+service|guest\s+post|telegram\s+channel)\b/i,
];

function isValidNanpPhone(rawPhone: string): { valid: boolean; normalized: string } {
  let digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return { valid: false, normalized: digits };
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return { valid: false, normalized: digits };
  if (/^(\d)\1{9}$/.test(digits)) return { valid: false, normalized: digits };
  return { valid: true, normalized: digits };
}

function isBotSpamPayload(data: Record<string, any>, rawPhone: string): boolean {
  if (!isValidNanpPhone(rawPhone).valid) return true;
  const combinedText = [
    data.name,
    data.company,
    data.description,
    data.message,
    data?.client?.name,
    data?.client?.company,
    data?.project?.notes,
  ]
    .filter(Boolean)
    .join(' ');
  for (const pattern of SPAM_TEXT_PATTERNS) {
    if (pattern.test(combinedText)) return true;
  }
  return false;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestGet = async () =>
  new Response(
    JSON.stringify({
      service: 'SIS Controls Engineering RFQ Intake Edge API',
      status: 'operational',
      version: '2.1.0',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

export const onRequestPost = async ({ request, env }: { request: Request; env?: Env }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      data = (await request.json().catch(() => null)) || {};
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        data[key] = typeof value === 'string' ? value : value.name;
      }
    } else {
      data = (await request.json().catch(() => null)) || {};
    }

    if (data.botcheck || data.website_url_honeypot || data.honeypot) {
      return new Response(JSON.stringify({ success: true, message: 'Inquiry received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both standard contact form and 5-step RFQ wizard nested payload
    const isRfqWizard = Boolean(data.rfqId || data.engineeringSpec);
    const name = String(data.name || data?.client?.name || '').trim();
    const company = String(data.company || data?.client?.company || 'Industrial Client').trim();
    const email = String(data.email || data?.client?.email || '').trim();
    const phone = String(data.phone || data?.client?.phone || '').trim();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isBotSpamPayload(data, phone)) {
      return new Response(JSON.stringify({ success: true, message: 'Inquiry received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanPhone = isValidNanpPhone(phone).normalized || phone.replace(/\D/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = data.rfqId || `SIS-${randSuffix}`;
    const service = isRfqWizard
      ? `UL 508A RFQ (${data?.engineeringSpec?.enclosure || 'Custom'} / ${data?.engineeringSpec?.controller || 'PLC'})`
      : String(data.inquiry_type || 'Engineering Inquiry');
    const description = isRfqWizard
      ? `Budget: ${data?.estimate?.budgetRange || 'TBD'} | Lead Time: ${data?.estimate?.leadTime || 'TBD'} | Notes: ${data?.project?.notes || 'None'}`
      : String(data.description || data.message || 'No technical details provided');
    const timestampStr =
      new Date().toLocaleString('en-US', { timeZone: 'America/Boise' }) + ' MST';

    const summary = [
      `Ref: ${refNumber}`,
      `Contact: ${name} (${company})`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Category: ${service}`,
      `Scope: ${description}`,
      `Submitted: ${timestampStr}`,
    ].join('\n');

    const n8nBearer = env?.N8N_WEBHOOK_BEARER_TOKEN || 'pfa_mcp_2026_s3cur3_br1dg3_t0k3n';

    await Promise.allSettled([
      fetch('https://ntfy.isjco.com/pandaface-alerts', {
        method: 'POST',
        headers: {
          Title: `🚨 SIS INDUSTRIAL RFQ: ${company} (${name})`,
          Priority: 'urgent',
          Tags: 'factory,zap,telephone_receiver',
          Actions: `view, Call Engineer, tel:${cleanPhone}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: summary,
      }),
      fetch('https://ntfy.isjco.com/pandaface-ops', {
        method: 'POST',
        headers: {
          Title: `[SIS Lead] ${company} - ${service}`,
          Priority: 'high',
          Tags: 'clipboard,gear',
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: summary,
      }),
      fetch('https://n8n.isjco.com/webhook/inbound-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${n8nBearer}`,
          'X-Lead-Source': 'siscontrols-cf-edge',
        },
        body: JSON.stringify({
          ...data,
          clientPrefix: 'SIS',
          domain: 'siscontrols.com',
          name,
          company,
          email,
          phone,
          service,
          description,
          referenceNumber: refNumber,
          timestamp: new Date().toISOString(),
        }),
      }),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        referenceNumber: refNumber,
        message: 'Engineering inquiry transmitted successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to transmit engineering inquiry' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
