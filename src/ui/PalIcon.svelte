<script module lang="ts">
  // Shared across all instances: files that 404'd, so we don't retry on every re-render.
  const missing = new Set<string>();
</script>

<script lang="ts">
  // Shows public/pals/<id>_icon.png (or <id>.png for `render`) when present;
  // falls back to an element-coloured disc with the Pal's initials otherwise.
  // Art is fetched by scripts/fetch-pal-art.mjs and is not committed.
  import { palById } from '../data/pals';
  import { ELEMENT_COLORS } from '../data/elements';

  let { palId, size = 48, lucky = false, unknown = false, render = false }: {
    palId: number; size?: number; lucky?: boolean; unknown?: boolean; render?: boolean;
  } = $props();

  const def = $derived(palById(palId));
  const iconSrc = $derived(`${import.meta.env.BASE_URL}pals/${palId}_icon.png`);
  const renderSrc = $derived(`${import.meta.env.BASE_URL}pals/${palId}.png`);
  // A missing full render falls back to the icon before giving up on art entirely.
  let renderMissing = $state(false);
  $effect(() => { renderMissing = missing.has(renderSrc); });
  const src = $derived(render && !renderMissing ? renderSrc : iconSrc);
  const colors = $derived(def.elements.map((e) => ELEMENT_COLORS[e]));
  const background = $derived(
    colors.length > 1
      ? `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
      : colors[0],
  );
  const initials = $derived(unknown ? '?' : def.name.slice(0, 2).toUpperCase());

  let failed = $state(false);
  $effect(() => { failed = missing.has(iconSrc); });

  function onError() {
    missing.add(src);
    if (src === renderSrc) renderMissing = true;
    else failed = true;
  }
</script>

<div
  class="icon"
  class:lucky
  class:unknown
  class:art={!unknown && !failed}
  class:render
  style:width="{size}px"
  style:height="{size}px"
  style:font-size="{size * 0.36}px"
  style:background={unknown || !failed ? undefined : background}
  title={unknown ? '???' : def.name}
>
  {#if !failed}
    <img {src} alt={unknown ? '???' : def.name} draggable="false"
      onerror={onError} />
  {:else}
    {initials}
  {/if}
</div>

<style>
  .icon {
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--text);
    flex-shrink: 0;
    overflow: hidden;
    box-shadow: inset 0 -3px 0 rgba(31, 42, 68, 0.18);
    background: var(--panel-2);
  }
  .icon.art { background: var(--panel-2); box-shadow: none; }
  .icon.render { border-radius: 12px; background: transparent; }
  img { width: 100%; height: 100%; object-fit: contain; }
  /* Unknown Paldeck entries show the art as a dark silhouette */
  .unknown img { filter: brightness(0) invert(1) opacity(0.3); }
  .unknown { color: var(--muted); }
  .lucky { box-shadow: 0 0 0 3px var(--accent), 0 0 12px var(--accent); }
</style>
