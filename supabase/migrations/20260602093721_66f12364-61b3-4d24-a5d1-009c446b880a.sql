create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('generate-channel-posts-daily') where exists (select 1 from cron.job where jobname = 'generate-channel-posts-daily');

select cron.schedule(
  'generate-channel-posts-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://zbgwqticmneytinkijjd.supabase.co/functions/v1/generate-channel-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZ3dxdGljbW5leXRpbmtpampkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODE2NTksImV4cCI6MjA3MjQ1NzY1OX0._zNFsQmF7zUl4_JXIK3Wg-3C8W_OSXQThj6flspfKpg'
    ),
    body := '{}'::jsonb
  );
  $$
);