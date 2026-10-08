CREATE EXTENSION IF NOT EXISTS pg_cron;

UPDATE public.events
SET status = CASE
  WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
    > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'coming'::public.event_status
  WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
    = (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'ongoing'::public.event_status
  ELSE 'archived'::public.event_status
END
WHERE status IS DISTINCT FROM CASE
  WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
    > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'coming'::public.event_status
  WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
    = (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'ongoing'::public.event_status
  ELSE 'archived'::public.event_status
END;

DELETE FROM public.events
WHERE status = 'archived'
  AND starts_at < now() - interval '30 days';

DO $setup$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'delete-events-older-than-30-days',
      'sync-event-status-and-cleanup-daily'
    )
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'sync-event-status-and-cleanup-daily',
    '30 18 * * *',
    $command$
      UPDATE public.events
      SET status = CASE
        WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
          > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'coming'::public.event_status
        WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
          = (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'ongoing'::public.event_status
        ELSE 'archived'::public.event_status
      END
      WHERE status IS DISTINCT FROM CASE
        WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
          > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'coming'::public.event_status
        WHEN (starts_at AT TIME ZONE 'Asia/Kolkata')::date
          = (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'ongoing'::public.event_status
        ELSE 'archived'::public.event_status
      END;

      DELETE FROM public.events
      WHERE status = 'archived'
        AND starts_at < now() - interval '30 days';
    $command$
  );
END
$setup$;
