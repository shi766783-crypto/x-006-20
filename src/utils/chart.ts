export interface ChartPoint {
  label: string
  value: number
}

export interface ComparisonChartPoint extends ChartPoint {
  timestamp: number
}

export interface ComparisonChartSeries {
  name: string
  color: string
  points: ComparisonChartPoint[]
}

/** Draw a minimal line chart on a canvas using only the 2D API. */
export function drawLineChart(
  canvas: HTMLCanvasElement,
  points: ChartPoint[],
  color: string,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = rect.width || 320
  const h = rect.height || 180
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const padX = 28
  const padY = 16
  const plotW = w - padX * 2
  const plotH = h - padY * 2

  if (!points.length) {
    ctx.fillStyle = '#9ca3af'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('暂无记录', w / 2, h / 2)
    return
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const getX = (i: number) =>
    points.length === 1 ? padX + plotW / 2 : padX + (i / (points.length - 1)) * plotW
  const getY = (v: number) => padY + plotH - ((v - min) / range) * plotH

  // Horizontal grid lines
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  for (let g = 0; g <= 3; g++) {
    const gy = padY + (g / 3) * plotH
    ctx.beginPath()
    ctx.moveTo(padX, gy)
    ctx.lineTo(padX + plotW, gy)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Line
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((p, i) => {
    const px = getX(i)
    const py = getY(p.value)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()

  // Dots
  points.forEach((p, i) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(getX(i), getY(p.value), 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // First / last labels
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(points[0].label, getX(0), padY + plotH + 14)
  if (points.length > 1) {
    ctx.fillText(points[points.length - 1].label, getX(points.length - 1), padY + plotH + 14)
  }
}

function formatAxisDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatAxisValue(value: number): string {
  return Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(1)
}

/** Draw several members' records on one time axis. Empty series must be omitted by the caller. */
export function drawMultiLineChart(
  canvas: HTMLCanvasElement,
  series: ComparisonChartSeries[],
  xDomain: [number, number],
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = rect.width || 640
  const h = rect.height || 300
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const padLeft = 46
  const padRight = 22
  const padTop = 18
  const padBottom = 34
  const plotW = w - padLeft - padRight
  const plotH = h - padTop - padBottom

  if (!series.length) {
    ctx.fillStyle = '#9ca3af'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('所选时间范围内暂无可对比的记录', w / 2, h / 2)
    return
  }

  const allPoints = series.flatMap((item) => item.points)
  const values = allPoints.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const rawRange = rawMax - rawMin
  const [yMin, yMax] = rawRange === 0
    ? [rawMin - 1, rawMax + 1]
    : [rawMin - rawRange * 0.12, rawMax + rawRange * 0.12]
  const yRange = yMax - yMin
  const [xMin, xMax] = xDomain
  const xRange = xMax - xMin || 1

  const getX = (ts: number) => padLeft + ((ts - xMin) / xRange) * plotW
  const getY = (value: number) => padTop + plotH - ((value - yMin) / yRange) * plotH

  // Grid and Y-axis labels. Only members with data contribute to yMin/yMax.
  ctx.strokeStyle = '#e5e7eb'
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  for (let g = 0; g <= 4; g++) {
    const y = padTop + (g / 4) * plotH
    const value = yMax - (g / 4) * yRange
    ctx.beginPath()
    ctx.moveTo(padLeft, y)
    ctx.lineTo(padLeft + plotW, y)
    ctx.stroke()
    ctx.fillText(formatAxisValue(value), padLeft - 8, y)
  }
  ctx.setLineDash([])

  // X-axis date labels.
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const tickCount = 5
  for (let i = 0; i < tickCount; i++) {
    const ts = xMin + (i / (tickCount - 1)) * xRange
    ctx.fillText(formatAxisDate(ts), getX(ts), padTop + plotH + 9)
  }

  // Member lines and points.
  for (const item of series) {
    ctx.strokeStyle = item.color
    ctx.fillStyle = item.color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    item.points.forEach((point, i) => {
      const x = getX(point.timestamp)
      const y = getY(point.value)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    for (const point of item.points) {
      ctx.beginPath()
      ctx.arc(getX(point.timestamp), getY(point.value), 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
