<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import {
  drawMultiLineChart,
  type ComparisonChartSeries,
} from '../../utils/chart'

const props = defineProps<{
  series: ComparisonChartSeries[]
  xDomain: [number, number]
}>()

const canvas = ref<HTMLCanvasElement>()

function draw() {
  if (canvas.value) drawMultiLineChart(canvas.value, props.series, props.xDomain)
}

onMounted(draw)
watch(() => [props.series, props.xDomain], draw, { deep: true })
</script>

<template>
  <div class="comparison-chart">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.comparison-chart {
  width: 100%;
  height: 320px;
}
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
@media (max-width: 600px) {
  .comparison-chart {
    height: 260px;
  }
}
</style>
