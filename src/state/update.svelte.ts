/** New-version detection for the service worker. Shown by UpdateBanner; applied on the user's click. */
class UpdateState {
  available = $state(false);
  private waiting: ServiceWorker | null = null;
  private reloading = false;

  /** Wire a registration: watch for a waiting worker now and on future updates; poll while the tab lives. */
  attach(reg: ServiceWorkerRegistration) {
    const check = () => {
      if (reg.waiting && navigator.serviceWorker.controller) { this.waiting = reg.waiting; this.available = true; }
    };
    // A worker may already be installing when we attach (updatefound fired before we listened), so track that too.
    const track = (w: ServiceWorker | null) => w?.addEventListener('statechange', () => { if (w.state === 'installed') check(); });
    check();
    track(reg.installing);
    reg.addEventListener('updatefound', () => track(reg.installing));
    // Idle tabs stay open for hours: look for deploys periodically and whenever the tab comes back.
    const poll = () => reg.update().catch(() => {});
    setInterval(poll, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
    // Once the waiting worker takes over (after our SKIP_WAITING), reload to pick up the new assets.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.reloading) return;
      this.reloading = true;
      location.reload();
    });
  }

  apply() {
    if (!this.waiting) { location.reload(); return; }
    this.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  dismiss() { this.available = false; }
}

export const update = new UpdateState();
