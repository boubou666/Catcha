<script lang="ts">
  // Placeholder sprite: a disc coloured by element(s) with the Pal's initials.
  // Swap this component for real art later without touching anything else.
  import { palById } from '../data/pals';
  import { ELEMENT_COLORS } from '../data/elements';

  let { palId, size = 48, lucky = false, unknown = false }: {
    palId: number; size?: number; lucky?: boolean; unknown?: boolean;
  } = $props();

  const def = $derived(palById(palId));
  const colors = $derived(def.elements.map((e) => ELEMENT_COLORS[e]));
  const background = $derived(
    colors.length > 1
      ? `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
      : colors[0],
  );
  const initials = $derived(unknown ? '?' : def.name.slice(0, 2).toUpperCase());
</script>

<div
  class="icon"
  class:lucky
  class:unknown
  style:width="{size}px"
  style:height="{size}px"
  style:font-size="{size * 0.36}px"
  style:background={unknown ? 'var(--panel-2)' : background}
  title={unknown ? '???' : def.name}
>
  {initials}
</div>

<style>
  .icon {
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #111;
    flex-shrink: 0;
    box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.25);
  }
  .unknown { color: var(--muted); }
  .lucky { box-shadow: 0 0 0 3px var(--accent), 0 0 12px var(--accent); }
</style>
