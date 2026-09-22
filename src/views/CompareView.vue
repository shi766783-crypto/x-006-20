<script setup lang="ts">
import { computed, ref } from 'vue'
import CompareChart from '../components/health/CompareChart.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { MEMBER_COLORS, METRIC_META } from '../constants'
import { useFamilyStore } from '../stores/useFamilyStore'
import type { HealthMetric, MetricType } from '../types'
import type { ChartSeries } from '../utils/chart'
import { formatDateTime } from '../utils/date'
import { numericValue } from '../utils/format'

const store = useFamilyStore()

const metricType = ref<MetricType>('blood_pressure')
const rangeDays = ref(30)

const metricTypes = Object.keys(METRIC_META) as MetricType[]

const RANGE_OPTIONS = [
  { days: 7, label: '近7天' },
  { days: 30, label: '近30天' },
  { days: 90, label: '近90天' },
  { days: 0, label: '全部' },
]

const members = computed(() => store.state.members)

const cutoff = computed(() =>
  rangeDays.value > 0 ? Date.now() - rangeDays.value * 86400000 : -Infinity,
)

interface MemberSeries {
  name: string
  color: string
  metrics: HealthMetric[]
}

/**
 * Valid metrics of the selected type within the time range, per member
 * (sorted by time). Non-numeric values are dropped here so the legend,
 * the skipped list and the chart all agree on who has data.
 */
const memberSeries = computed<MemberSeries[]>(() =>
  members.value.map((m, i) => ({
    name: m.name,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
    metrics: m.metrics
      .filter((x) => x.type === metricType.value && x.timestamp >= cutoff.value)
      .filter((x) => !Number.isNaN(numericValue(x.value)))
      .sort((a, b) => a.timestamp - b.timestamp),
  })),
)

/** Only members that actually have data participate in the chart axes. */
const chartSeries = computed<ChartSeries[]>(() =>
  memberSeries.value
    .filter((s) => s.metrics.length > 0)
    .map((s) => ({
      name: s.name,
      color: s.color,
      points: s.metrics.map((x) => ({
        t: x.timestamp,
        label: formatDateTime(x.timestamp).slice(5),
        value: numericValue(x.value),
      })),
    })),
)

const withData = computed(() =>
  memberSeries.value.filter((s) => s.metrics.length > 0),
)

const skipped = computed(() =>
  memberSeries.value.filter((s) => s.metrics.length === 0),
)

const meta = computed(() => METRIC_META[metricType.value])

function latestOf(s: MemberSeries): HealthMetric {
  return s.metrics[s.metrics.length - 1]
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1 class="page-title">指标对比</h1>
      <div class="head-actions">
        <select v-model="metricType" class="input inline-input">
          <option v-for="t in metricTypes" :key="t" :value="t">{{ METRIC_META[t].label }}</option>
        </select>
        <select v-model.number="rangeDays" class="input inline-input">
          <option v-for="r in RANGE_OPTIONS" :key="r.days" :value="r.days">{{ r.label }}</option>
        </select>
      </div>
    </div>

    <EmptyState
      v-if="!members.length"
      icon="👨‍👩‍👧‍👦"
      text="还没有家庭成员，请先在「家庭成员」中添加"
    />

    <template v-else>
      <section class="card">
        <div class="section-head">
          <h3>{{ meta.label }}对比（{{ meta.unit }}）</h3>
          <span class="range-text">正常范围：{{ meta.normalRange }}</span>
        </div>

        <CompareChart
          :series="chartSeries"
          :empty-text="`该时间段内暂无「${meta.label}」记录`"
        />

        <div v-if="withData.length" class="legend">
          <div v-for="s in withData" :key="s.name" class="legend-item">
            <span class="legend-dot" :style="{ background: s.color }"></span>
            <span class="legend-name">{{ s.name }}</span>
            <span class="legend-latest">
              最近 {{ latestOf(s).value }} {{ latestOf(s).unit }}
            </span>
            <span class="legend-count">{{ s.metrics.length }} 次</span>
          </div>
        </div>

        <div v-if="skipped.length" class="skipped-note">
          ⏭️ 以下成员在该时间段内没有「{{ meta.label }}」记录，已在图中跳过：{{
            skipped.map((s) => s.name).join('、')
          }}
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.page-title {
  margin: 0;
}
.head-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.inline-input {
  width: auto;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.section-head h3 {
  margin: 0;
}
.range-text {
  font-size: 13px;
  color: var(--text-secondary);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-color);
  border-radius: 8px;
  font-size: 13px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-name {
  font-weight: 600;
}
.legend-latest {
  color: var(--text-primary);
}
.legend-count {
  color: var(--text-secondary);
}
.skipped-note {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fdf6e3;
  border: 1px solid #f5e0a8;
  border-radius: 8px;
  font-size: 13px;
  color: #8a6d1a;
}
</style>
