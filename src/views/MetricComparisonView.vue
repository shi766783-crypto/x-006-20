<script setup lang="ts">
import { computed, ref } from 'vue'
import MemberComparisonChart from '../components/health/MemberComparisonChart.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { METRIC_META } from '../constants'
import { useFamilyStore } from '../stores/useFamilyStore'
import type { HealthMetric, MetricType } from '../types'
import type { ComparisonChartSeries } from '../utils/chart'
import { formatDateTime } from '../utils/date'
import { numericValue } from '../utils/format'

const store = useFamilyStore()

const metricTypes = Object.keys(METRIC_META) as MetricType[]
const periodOptions = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 },
]

const selectedType = ref<MetricType>('blood_pressure')
const selectedDays = ref(30)

const memberColors = ['#3498db', '#e74c3c', '#f39c12', '#16a085', '#9b59b6', '#2c3e50', '#e67e22', '#1abc9c']

interface MemberComparison extends ComparisonChartSeries {
  memberId: string
  latest: HealthMetric
  average: number
  recordCount: number
}

interface SkippedMember {
  name: string
  reason: string
}

const timeRange = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (selectedDays.value - 1)).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
  return { start, end }
})

const metricRecords = computed(() => {
  const { start, end } = timeRange.value
  const included: MemberComparison[] = []
  const skipped: SkippedMember[] = []

  store.state.members.forEach((member, index) => {
    const records = member.metrics
      .filter((metric) => metric.type === selectedType.value)
      .sort((a, b) => a.timestamp - b.timestamp)
    const recentRecords = records.filter(
      (metric) => metric.timestamp >= start && metric.timestamp <= end,
    )
    const points = recentRecords
      .map((metric) => ({
        timestamp: metric.timestamp,
        label: formatDateTime(metric.timestamp).slice(5),
        value: numericValue(metric.value),
      }))
      .filter((point) => !Number.isNaN(point.value))

    if (!points.length) {
      skipped.push({
        name: member.name,
        reason: records.length ? `近${selectedDays.value}天无记录` : '无该指标记录',
      })
      return
    }

    const total = points.reduce((sum, point) => sum + point.value, 0)
    included.push({
      memberId: member.id,
      name: member.name,
      color: memberColors[index % memberColors.length],
      points,
      latest: recentRecords[recentRecords.length - 1],
      average: total / points.length,
      recordCount: points.length,
    })
  })

  return { included, skipped }
})

const xDomain = computed<[number, number]>(() => [timeRange.value.start, timeRange.value.end])
const meta = computed(() => METRIC_META[selectedType.value])
const valueLabel = computed(() =>
  selectedType.value === 'blood_pressure' ? `${meta.value.label}（收缩压）` : meta.value.label,
)

function formatNumber(value: number): string {
  return value.toFixed(value >= 100 ? 0 : 1)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">多成员指标对比</h1>

    <section class="card controls-card">
      <div class="control-group">
        <label class="control-label">指标</label>
        <select v-model="selectedType" class="input control-input">
          <option v-for="type in metricTypes" :key="type" :value="type">
            {{ METRIC_META[type].label }}
          </option>
        </select>
      </div>
      <div class="control-group">
        <label class="control-label">时间范围</label>
        <div class="period-switch">
          <button
            v-for="option in periodOptions"
            :key="option.value"
            type="button"
            class="period-btn"
            :class="{ active: selectedDays === option.value }"
            @click="selectedDays = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="range-tip">
        单位：{{ meta.unit }}
        <span v-if="selectedType === 'blood_pressure'">；血压图取收缩压（高压）绘制</span>
      </div>
    </section>

    <EmptyState
      v-if="!store.state.members.length"
      icon="👨‍👩‍👧‍👦"
      text="还没有家庭成员，请先在家庭成员页面建档"
    />

    <template v-else>
      <section class="card chart-card">
        <div class="chart-title-row">
          <div>
            <h3>{{ valueLabel }}对比</h3>
            <p>同一时间轴展示各成员{{ periodOptions.find((item) => item.value === selectedDays)?.label }}记录</p>
          </div>
          <span class="record-count">已纳入 {{ metricRecords.included.length }} 人</span>
        </div>

        <MemberComparisonChart :series="metricRecords.included" :x-domain="xDomain" />

        <div v-if="metricRecords.included.length" class="legend">
          <div v-for="item in metricRecords.included" :key="item.memberId" class="legend-item">
            <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
            <span>{{ item.name }}</span>
            <span class="legend-count">{{ item.recordCount }}条</span>
          </div>
        </div>

        <div v-if="metricRecords.skipped.length" class="skip-notice">
          <strong>已明确跳过 {{ metricRecords.skipped.length }} 人：</strong>
          <span v-for="member in metricRecords.skipped" :key="member.name" class="skip-chip">
            {{ member.name }}（{{ member.reason }}）
          </span>
          <span class="skip-note">空数据不绘制曲线，也不参与纵轴范围计算。</span>
        </div>
      </section>

      <section v-if="metricRecords.included.length" class="card">
        <h3>成员摘要</h3>
        <div class="table-wrap">
          <table class="table comparison-table">
            <thead>
              <tr>
                <th>成员</th>
                <th>记录数</th>
                <th>最近记录时间</th>
                <th>最近数值</th>
                <th>区间平均{{ selectedType === 'blood_pressure' ? '（收缩压）' : '' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in metricRecords.included" :key="item.memberId">
                <td>
                  <span class="member-name">
                    <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
                    {{ item.name }}
                  </span>
                </td>
                <td>{{ item.recordCount }}</td>
                <td>{{ formatDateTime(item.latest.timestamp) }}</td>
                <td>{{ item.latest.value }} {{ item.latest.unit }}</td>
                <td>{{ formatNumber(item.average) }} {{ meta.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.controls-card {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}
.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.control-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}
.control-input {
  width: 150px;
}
.period-switch {
  display: flex;
  gap: 6px;
}
.period-btn {
  border: 1px solid var(--border-color);
  background: #fff;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 500;
}
.period-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
  font-weight: 600;
}
.range-tip {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 13px;
}
.chart-card {
  overflow: hidden;
}
.chart-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.chart-title-row h3 {
  margin-bottom: 2px;
}
.chart-title-row p {
  color: var(--text-secondary);
  font-size: 13px;
}
.record-count {
  flex-shrink: 0;
  color: var(--accent-color);
  background: var(--accent-bg);
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 13px;
  font-weight: 600;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.legend-count {
  color: var(--text-secondary);
  font-size: 12px;
}
.skip-notice {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef5e7;
  border: 1px solid #f9e79f;
  border-radius: 8px;
  color: #7d6608;
  font-size: 13px;
  line-height: 1.9;
}
.skip-chip {
  display: inline-block;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 0 8px;
  margin-right: 4px;
}
.skip-note {
  display: block;
  color: var(--text-secondary);
}
.table-wrap {
  overflow-x: auto;
}
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 620px;
}
.comparison-table th,
.comparison-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}
.comparison-table th {
  color: var(--text-secondary);
  font-weight: 600;
}
.member-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
}
@media (max-width: 600px) {
  .range-tip {
    margin-left: 0;
    width: 100%;
  }
  .control-input,
  .period-switch {
    width: 100%;
  }
  .period-btn {
    flex: 1;
  }
}
</style>
