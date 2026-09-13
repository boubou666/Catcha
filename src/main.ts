import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { update } from './state/update.svelte';
import { game } from './state/game.svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;

// Service worker: installable + offline. Production only so it never fights Vite's dev server.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).then((reg) => {
      update.attach(reg);
      // a deploy applies itself once the tab is hidden or the player has been idle a while, never mid-boss
      update.autoApply(() => game.inBossFight || !!game.run);
    }).catch(() => { /* optional */ });
  });
}
