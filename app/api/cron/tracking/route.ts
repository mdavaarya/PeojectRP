import { NextRequest, NextResponse } from 'next/server';
import { runTrackingJob } from '@/services/trackingOrchestrator';
import { sendPendingNotifications } from '@/services/notificationService';

/**
 * Vercel Cron Job endpoint — dipanggil otomatis sesuai jadwal.
 * Daftarkan di vercel.json:
 *
 * {
 *   "crons": [
 *     { "path": "/api/cron/tracking", "schedule": "0 2 * * 1" }
 *   ]
 * }
 *
 * Jadwal di atas = setiap Senin jam 02:00 UTC.
 * CRON_SECRET harus sama dengan yang di-set di Vercel env.
 */
export async function GET(req: NextRequest) {
  // Verifikasi secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[CRON] Starting scheduled tracking job...');
    const jobId = await runTrackingJob('scheduler');
    console.log(`[CRON] Tracking job completed: ${jobId}`);

    // Kirim notifikasi ke alumni yang hasilnya sudah identified
    const notifSent = await sendPendingNotifications();
    console.log(`[CRON] Notifications sent: ${notifSent}`);

    return NextResponse.json({
      success: true,
      job_id: jobId,
      notifications_sent: notifSent,
    });
  } catch (err: any) {
    console.error('[CRON] Tracking job failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
