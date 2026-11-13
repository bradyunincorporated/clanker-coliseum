<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

  /**
   * The game's button: a painted plank sign with the label lettered on it. It tips when you
   * point at it and drops when pressed. One red sign per screen is the way forward.
   */
  type Props = (HTMLButtonAttributes & HTMLAnchorAttributes) & {
    tone?: "red" | "cream" | "teal";
    size?: "sm" | "md" | "lg";
    href?: string;
    disabled?: boolean;
    children: Snippet;
  };
  let { tone = "red", size = "md", href, disabled = false, class: className = "", children, ...rest }: Props = $props();
</script>

{#if href && !disabled}
  <a {href} class="sign {tone} {size} {className}" {...rest}><span>{@render children()}</span></a>
{:else}
  <button type="button" class="sign {tone} {size} {className}" {disabled} {...rest}><span>{@render children()}</span></button>
{/if}

<style>
  .sign {
    --h: 64px;
    position: relative;
    display: inline-grid;
    place-items: center;
    height: var(--h);
    min-width: calc(var(--h) * 3.1);
    padding: 0 calc(var(--h) * 0.62);
    border: 0;
    background: center / 100% 100% no-repeat;
    font-family: var(--font-display);
    font-size: calc(var(--h) * 0.42);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    filter: drop-shadow(0 5px 4px rgb(10 14 34 / 0.55));
    transition:
      rotate 0.25s cubic-bezier(0.3, 1.6, 0.5, 1),
      translate 0.12s ease-out,
      filter 0.12s ease-out;
  }
  .sign span {
    translate: 0 -2%;
  }
  .sm { --h: 48px; }
  .lg { --h: 92px; }
  .red {
    background-image: url("/ui/sign-red.webp");
    color: var(--paper);
    text-shadow: 0 2px 0 rgb(110 20 24 / 0.9);
  }
  .cream {
    background-image: url("/ui/sign-cream.webp");
    color: var(--ink);
  }
  .teal {
    background-image: url("/ui/sign-teal.webp");
    color: var(--paper);
    text-shadow: 0 2px 0 rgb(16 74 82 / 0.9);
  }
  .sign:hover,
  .sign:focus-visible {
    rotate: -1.6deg;
    translate: 0 -2px;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55)) brightness(1.06);
  }
  .sign:active {
    rotate: 0deg;
    translate: 0 3px;
    filter: drop-shadow(0 2px 2px rgb(10 14 34 / 0.6));
  }
  .sign:disabled {
    cursor: default;
    filter: grayscale(0.7) brightness(0.8) drop-shadow(0 3px 3px rgb(10 14 34 / 0.5));
    rotate: 0deg;
    translate: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .sign { transition: none; }
  }
</style>
