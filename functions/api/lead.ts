/**
 * Cloudflare Pages Function: /api/lead
 *
 * Serverless edge RFQ, panel-builder, contact & feedback intake endpoint for SIS Controls (siscontrols.com).
 * Supports standard contact forms, 5-step RFQ wizard, interactive panel builder, and /review feedback.
 */

interface Env {
  WEBHOOK_AUTH_TOKEN?: string;
  N8N_WEBHOOK_TOKEN?: string;
  N8N_WEBHOOK_BEARER_TOKEN?: string;
  N8N_WEBHOOK_URL?: string;
  SIS_ALERT_EMAILS?: string;
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
  if (/^\d{3}55501\d{2}$/.test(digits)) return { valid: false, normalized: digits };
  return { valid: true, normalized: digits };
}

function isBotSpamPayload(data: Record<string, any>, rawPhone: string, isOptionalPhone: boolean): boolean {
  if (rawPhone) {
    if (!isValidNanpPhone(rawPhone).valid) return true;
  } else if (!isOptionalPhone) {
    return true;
  }

  const combinedText = [
    data.name,
    data.company,
    data.description,
    data.message,
    data.notes,
    data.comments,
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
      version: '2.2.0',
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

export const onRequestPost = async ({ request, env }: { request: Request; env?: Env }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    const acceptHeader = request.headers.get('accept') || '';
    const url = new URL(request.url);

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

    if (data.botcheck || data.website_url_honeypot || data.honeypot || data.company_website) {
      if (acceptHeader.includes('text/html') && !contentType.includes('application/json')) {
        return Response.redirect(`${url.origin}/thank-you/`, 303);
      }
      return new Response(JSON.stringify({ success: true, message: 'Inquiry received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isRfqWizard = Boolean(data.rfqId || data.engineeringSpec);
    const isPanelBuilder = Boolean(data.panelSpec || data.form_tag === 'panel-builder' || data.formTag === 'panel-builder');
    const isFeedback =
      url.searchParams.get('type') === 'feedback' ||
      Boolean(data.rating) ||
      String(data.form_tag || data.formTag || '').includes('feedback');

    const name = String(data.name || data?.client?.name || '').trim();
    const company = String(data.company || data?.client?.company || 'Industrial Client').trim();
    const email = String(data.email || data?.client?.email || '').trim();
    const phone = String(data.phone || data?.client?.phone || '').trim();

    if (!isFeedback && !phone && !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email or phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isOptionalPhone = isFeedback || Boolean(email);
    if (isBotSpamPayload(data, phone, isOptionalPhone)) {
      return new Response(JSON.stringify({ success: true, message: 'Inquiry received' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = data.rfqId || `SIS-${randSuffix}`;

    let service = String(data.service || data.inquiry_type || 'Engineering Inquiry');
    let message = String(data.message || data.notes || data.description || data.comments || '').trim();

    if (isRfqWizard) {
      service = `UL 508A RFQ (${data?.engineeringSpec?.enclosure || 'Custom'} / ${data?.engineeringSpec?.controller || 'PLC'})`;
      message = `Budget: ${data?.estimate?.budgetRange || 'TBD'} | Lead Time: ${data?.estimate?.leadTime || 'TBD'} | Notes: ${data?.project?.notes || message || 'None'}`;
    } else if (isPanelBuilder) {
      service = `Panel Builder Spec (${data?.panelSpec?.enclosure || data.enclosure || 'Custom'})`;
      message = message || JSON.stringify(data.panelSpec || {});
    } else if (isFeedback) {
      service = `Client Feedback (${data.rating || 'Direct'}★)`;
    }

    const defaultRecipients = ['rfq@siscontrols.com', 'brandon@pandafacedigital.com'];
    const rawRecipients = env?.SIS_ALERT_EMAILS || '';
    const recipientEmails = rawRecipients
      ? Array.from(new Set([...rawRecipients.split(',').map((s: string) => s.trim()).filter(Boolean), ...defaultRecipients]))
      : defaultRecipients;

    const webhookToken =
      env?.WEBHOOK_AUTH_TOKEN || env?.N8N_WEBHOOK_TOKEN || env?.N8N_WEBHOOK_BEARER_TOKEN || '';
    const n8nHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Lead-Source': 'siscontrols-cf-edge',
    };
    if (webhookToken) {
      n8nHeaders['Authorization'] = `Bearer ${webhookToken}`;
    }

    await fetch(env?.N8N_WEBHOOK_URL || 'https://n8n.isjco.com/webhook/inbound-lead', {
      method: 'POST',
      headers: n8nHeaders,
      body: JSON.stringify({
        ...data,
        project: 'SIS',
        clientPrefix: 'SIS',
        domain: 'siscontrols.com',
        siteName: 'SIS Controls',
        leadType: isFeedback ? 'review_feedback' : 'web_quote_form',
        event_type: isFeedback ? 'review_feedback' : 'form_fill',
        name: name || 'Engineering Contact',
        company,
        email,
        phone,
        service,
        description: message,
        message,
        notes: message,
        recipientEmails,
        referenceNumber: refNumber,
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => console.warn('[SIS n8n webhook error]:', err));

    if (acceptHeader.includes('text/html') && !contentType.includes('application/json')) {
      return Response.redirect(`${url.origin}/thank-you/?ref=${encodeURIComponent(refNumber)}`, 303);
    }

    return new Response(
      JSON.stringify({
        success: true,
        referenceNumber: refNumber,
        message: 'Engineering inquiry transmitted successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to transmit engineering inquiry' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
