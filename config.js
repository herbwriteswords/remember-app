/* RemEmber push config. WORKER_URL is filled in after the Cloudflare Worker is deployed.
   APP_KEY is a light gate only — it ships to every browser, so treat it as public.
   VAPID_PUBLIC_KEY is public by design (the private key lives only in the Worker's secrets). */
window.REMEMBER_CONFIG = {
  WORKER_URL: 'https://remember-push.herb-remember.workers.dev',
  APP_KEY: 'jx3voESI6sq4rk4JXdQsO1-JixYV4Qn3',
  VAPID_PUBLIC_KEY: 'BC6ksBC-ClOdvYRwMjN83SP3tB30FRJmy-omurj9zTCO8y-bCb_KA2TuMNb2nVm7ou2OEq_Tc0kwePpvk9UVnM0',
};
