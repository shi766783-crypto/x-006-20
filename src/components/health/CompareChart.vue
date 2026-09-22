<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { drawMultiSeriesChart, type ChartSeries } from '../../utils/chart'

const props = defineProps<{ series: ChartSeries[]; emptyText?: string }>()

const canvas = ref<HTMLCanvasElement>()

function draw() {
  if (canvas.value) drawMultiSeriesChart(canvas.value, props.series, props.emptyText)
}

onMounted(draw)
watch(() => props.series, draw)
</script>

<template>
  <div class="compare-chart">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.compare-chart {
  width: 100%;
  height: 280px;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
