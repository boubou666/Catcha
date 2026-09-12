<script lang="ts">
  import { passiveById } from '../data/passives';

  let { ids, size = 'small' }: { ids: string[]; size?: 'small' | 'normal' } = $props();
</script>

{#if ids.length > 0}
  <span class="chips" class:normal={size === 'normal'}>
    {#each ids as id (id)}
      {@const p = passiveById(id)}
      <span class="chip t{p.tier}" title={p.desc}>{p.name}</span>
    {/each}
  </span>
{/if}

<style>
  .chips { display: inline-flex; flex-wrap: wrap; gap: 0.2rem; vertical-align: middle; }
  .chip {
    font-size: 0.7rem; line-height: 1.3; padding: 0 0.4rem; border-radius: 999px;
    border: 1px solid var(--border); color: var(--muted); background: var(--panel);
    white-space: nowrap;
  }
  .normal .chip { font-size: 0.8rem; padding: 0.1rem 0.5rem; }
  .t1 { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 50%, transparent); }
  .t2 { color: var(--accent-2); border-color: color-mix(in srgb, var(--accent-2) 60%, transparent); }
  .t3 { color: var(--accent); border-color: var(--accent); font-weight: 600; }
  .t-1 { color: var(--muted); border-style: dashed; }
  .t-2 { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 50%, transparent); border-style: dashed; }
</style>
