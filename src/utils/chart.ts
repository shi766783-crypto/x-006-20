export interface ChartPoint {
  label: string
  value: number
}

export interface ChartSeriesPoint {
  /** Timestamp used to position the point on the shared time axis. */
  t: number
  label: string
  value: number
}

export interface ChartSeries {
  name: string
  color: string
  points: ChartSeriesPoint[]
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

/**
 * Draw several members' metric series on one chart with a shared time axis.
 * Series without any point are ignored entirely, so members with no records
 * can never stretch the axes.
 */
export function drawMultiSeriesChart(
  canvas: HTMLCanvasElement,
  series: ChartSeries[],
  emptyText = '暂无记录',
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

  const padX = 40
  const padY = 16
  const plotW = w - padX * 2
  const plotH = h - padY * 2

  // Skip empty series before computing any range.
  const visible = series.filter((s) => s.points.length > 0)
  if (!visible.length) {
    ctx.fillStyle = '#9ca3af'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emptyText, w / 2, h / 2)
    return
  }

  const allPoints = visible.flatMap((s) => s.points)
  const tMin = Math.min(...allPoints.map((p) => p.t))
  const tMax = Math.max(...allPoints.map((p) => p.t))
  const vMin = Math.min(...allPoints.map((p) => p.value))
  const vMax = Math.max(...allPoints.map((p) => p.value))
  const tRange = tMax - tMin
  const vRange = vMax - vMin || 1

  const getX = (t: number) =>
    tRange === 0 ? padX + plotW / 2 : padX + ((t - tMin) / tRange) * plotW
  const getY = (v: number) => padY + plotH - ((v - vMin) / vRange) * plotH

  // Horizontal grid lines + value labels
  ctx.font = '10px sans-serif'
  for (let g = 0; g <= 3; g++) {
    const gy = padY + (g / 3) * plotH
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(padX, gy)
    ctx.lineTo(padX + plotW, gy)
    ctx.stroke()
    ctx.setLineDash([])
    const gv = vMax - (g / 3) * vRange
    ctx.fillStyle = '#9ca3af'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(Number(gv.toFixed(1))), padX - 6, gy)
  }

  // One polyline + dots per member
  for (const s of visible) {
    const sorted = [...s.points].sort((a, b) => a.t - b.t)
    ctx.strokeStyle = s.color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    sorted.forEach((p, i) => {
      const px = getX(p.t)
      const py = getY(p.value)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()

    ctx.fillStyle = s.color
    for (const p of sorted) {
      ctx.beginPath()
      ctx.arc(getX(p.t), getY(p.value), 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // First / last date labels on the shared time axis
  const firstPoint = allPoints.find((p) => p.t === tMin)
  const lastPoint = allPoints.find((p) => p.t === tMax)
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  if (firstPoint) ctx.fillText(firstPoint.label, getX(tMin), padY + plotH + 14)
  if (lastPoint && tRange > 0) ctx.fillText(lastPoint.label, getX(tMax), padY + plotH + 14)
}
