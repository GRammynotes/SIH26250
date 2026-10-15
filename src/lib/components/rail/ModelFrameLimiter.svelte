<script lang="ts">
  import { onMount } from 'svelte';
  import { useScheduler } from '@threlte/core';

  const { invalidate } = useScheduler();
  onMount(() => {
    const timer = window.setInterval(invalidate, 1000 / 30);
    invalidate();
    return () => window.clearInterval(timer);
  });
</script>
