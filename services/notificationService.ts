import { createClient } from '@supabase/supabase-js';
import { AlumniProfile, TrackingResult } from '@/types';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Kirim notifikasi ke alumni saat hasil tracking ditemukan
 * dan membutuhkan konfirmasi alumni.
 *
 * Implementasi email via Resend API (https://resend.com)
 * Set RESEND_API_KEY di .env untuk mengaktifkan.
 */
export async function notifyAlumniForConfirmation(
  alumni: AlumniProfile,
  result: TrackingResult,
  appUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
): Promise<boolean> {
  const supabase = getAdminClient();

  const confirmUrl = `${appUrl}/confirm-tracking?result_id=${result.id}`;
  const subject = `[SILUMNI] Konfirmasi Data Karir Anda Ditemukan`;
  const messagePreview = `Halo ${alumni.full_name}, kami menemukan informasi karir Anda sebagai ${result.found_position ?? 'profesional'} di ${result.found_company ?? 'sebuah institusi'}.`;

  // Kirim email via Resend
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && alumni.email) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SILUMNI <noreply@silumni.ac.id>',
          to: [alumni.email],
          subject,
          html: buildEmailHTML(alumni, result, confirmUrl),
        }),
      });

      emailSent = res.ok;
    } catch {
      emailSent = false;
    }
  }

  // Simpan log notifikasi
  await supabase.from('notification_logs').insert({
    alumni_id:       alumni.id,
    result_id:       result.id,
    channel:         'email',
    status:          emailSent ? 'sent' : (resendKey ? 'failed' : 'sent'), // jika tidak ada key, anggap in-app
    subject,
    message_preview: messagePreview,
    sent_at:         new Date().toISOString(),
  });

  // Update flag notification_sent di result
  await supabase
    .from('tracking_results')
    .update({
      notification_sent:    true,
      notification_sent_at: new Date().toISOString(),
    })
    .eq('id', result.id);

  return emailSent;
}

/**
 * Notifikasi in-app — dibaca saat alumni login
 */
export async function createInAppNotification(
  alumniId: string,
  resultId: string,
  message: string
): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from('notification_logs').insert({
    alumni_id:       alumniId,
    result_id:       resultId,
    channel:         'in_app',
    status:          'sent',
    message_preview: message,
    sent_at:         new Date().toISOString(),
  });
}

/**
 * Kirim notifikasi ke semua alumni yang hasil trackingnya
 * 'identified' tapi belum dikonfirmasi dan belum dapat notifikasi.
 */
export async function sendPendingNotifications(): Promise<number> {
  const supabase = getAdminClient();

  const { data: results } = await supabase
    .from('tracking_results')
    .select('*, alumni_profiles(id, full_name, email)')
    .eq('tracking_status', 'identified')
    .eq('notification_sent', false)
    .eq('alumni_confirmation', 'pending')
    .eq('is_latest', true)
    .limit(50);

  if (!results || results.length === 0) return 0;

  let sent = 0;
  for (const result of results) {
    const alumni = result.alumni_profiles as AlumniProfile;
    if (!alumni) continue;

    await notifyAlumniForConfirmation(alumni, result as TrackingResult);
    sent++;
    await sleep(200); // rate limit
  }

  return sent;
}

// ── Email HTML template ────────────────────────────────────────────────────

function buildEmailHTML(
  alumni: AlumniProfile,
  result: TrackingResult,
  confirmUrl: string
): string {
  const confidence = Math.round((result.confidence_score ?? 0) * 100);
  const sources    = result.supporting_sources?.join(', ') ?? '-';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; max-width: 560px; margin: 0 auto; }
    .header { background: #1e3a8a; color: white; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
    .info-row { display: flex; margin: 8px 0; font-size: 14px; }
    .info-label { color: #6b7280; width: 140px; flex-shrink: 0; }
    .info-value { color: #111827; font-weight: 500; }
    .btn { display: block; text-align: center; background: #1d4ed8; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0 8px; }
    .btn-reject { background: white; color: #dc2626; border: 2px solid #dc2626; }
    .note { font-size: 12px; color: #9ca3af; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin:0">SILUMNI</h2>
      <p style="margin:4px 0 0; font-size:13px; opacity:0.8">Alumni Professional Milestone Aggregator</p>
    </div>

    <p>Halo <strong>${alumni.full_name}</strong>,</p>
    <p>Sistem kami menemukan informasi karir Anda dari sumber publik. Mohon konfirmasi apakah informasi berikut akurat:</p>

    <div style="background:#f9fafb; border-radius:8px; padding:16px; margin:16px 0;">
      <div class="info-row">
        <span class="info-label">Posisi</span>
        <span class="info-value">${result.found_position ?? '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Instansi</span>
        <span class="info-value">${result.found_company ?? '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lokasi</span>
        <span class="info-value">${result.found_location ?? '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sumber</span>
        <span class="info-value">${sources}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Confidence</span>
        <span class="info-value"><span class="badge">${confidence}%</span></span>
      </div>
    </div>

    <a href="${confirmUrl}&action=confirm" class="btn">✓ Ya, Informasi Ini Benar</a>
    <a href="${confirmUrl}&action=reject"  class="btn btn-reject">✗ Bukan Saya / Informasi Salah</a>

    <p class="note">
      Email ini dikirim oleh sistem SILUMNI milik universitas Anda.
      Jika Anda tidak ingin dilacak, Anda dapat opt-out melalui portal alumni.
    </p>
  </div>
</body>
</html>`;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
