<script lang="ts">
  import { game } from '../state/game.svelte';
  import { TUTORIAL } from '../engine/tutorial';

  let { tab, go }: { tab: string; go: (tab: string) => void } = $props();

  const step = $derived(game.tutorialStep);
  const index = $derived(game.save.tutorial.step);
  const last = $derived(index === TUTORIAL.length - 1);
</script>

{#if step}
  <div class="panel tutorial" role="status" aria-live="polite">
    <div class="row head">
      <span class="label">Tutorial</span>
      <span class="dots" aria-label="Step {index + 1} of {TUTORIAL.length}">
        {#each TUTORIAL as _, i}<span class="dot" class:done={i < index} class:now={i === index}></span>{/each}
      </span>
      <span class="grow"></span>
      <button class="small ghost" onclick={() => game.skipTutorial()}>{last ? 'Done' : 'Skip tutorial'}</button>
    </div>
    <div class="title">{step.title}</div>
    <p class="muted">{step.text}</p>
    {#if step.tab && step.tab !== tab}
      <button class="small primary" onclick={() => go(step.tab!)}>Take me there →</button>
    {/if}
  </div>
{/if}

<style>
  .tutorial { border-color: var(--accent); display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem 0.75rem; margin-bottom: 0.6rem; }
  .head { gap: 0.6rem; }
  .label { color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.75rem; }
  .dots { display: inline-flex; gap: 3px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); }
  .dot.done { background: var(--accent); opacity: 0.55; }
  .dot.now { background: var(--accent); }
  .ghost { color: var(--muted); border-color: transparent; background: transparent; }
  .title { font-weight: 600; }
  p { margin: 0; font-size: 0.9rem; line-height: 1.4; }
  button.primary { align-self: flex-start; }
</style>
