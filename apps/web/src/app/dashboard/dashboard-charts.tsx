"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"

export type RevenuePoint = {
  month: string
  sales: number
  received: number
}

export type OrderStatusPoint = {
  key: string
  label: string
  value: number
  fill: string
}

type DashboardChartsProps = {
  revenue: RevenuePoint[]
  orderStatuses: OrderStatusPoint[]
  showReceived: boolean
}

const revenueConfig = {
  sales: { label: "Vendas", color: "var(--chart-1)" },
  received: { label: "Recebido", color: "var(--chart-2)" },
} satisfies ChartConfig

const statusConfig = {
  open: { label: "Aberto", color: "var(--chart-3)" },
  in_production: { label: "Em produção", color: "var(--chart-1)" },
  ready: { label: "Pronto", color: "var(--chart-4)" },
  shipped: { label: "Enviado", color: "var(--chart-5)" },
  delivered: { label: "Entregue", color: "var(--chart-2)" },
} satisfies ChartConfig

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

export function DashboardCharts({ revenue, orderStatuses, showReceived }: DashboardChartsProps) {
  const hasRevenue = revenue.some((point) => point.sales > 0 || point.received > 0)
  const orderTotal = orderStatuses.reduce((total, item) => total + item.value, 0)

  return (
    <section className="dashboard-insights" aria-labelledby="dashboard-insights-title">
      <div className="dashboard-section-heading dashboard-insights-heading">
        <div>
          <p className="dashboard-section-kicker">Desempenho</p>
          <h2 id="dashboard-insights-title">Visão dos últimos 6 meses</h2>
          <p>Compare o ritmo comercial e veja como os pedidos do mês estão distribuídos.</p>
        </div>
      </div>

      <div className="dashboard-chart-grid">
        <article className="dashboard-chart-card dashboard-revenue-card">
          <header className="dashboard-chart-header">
            <div>
              <h3>Vendas {showReceived ? "e recebimentos" : "por mês"}</h3>
              <p>Valores registrados em cada mês</p>
            </div>
            <div className="dashboard-chart-legend" aria-label="Legenda do gráfico">
              <span><i className="is-sales" />Vendas</span>
              {showReceived ? <span><i className="is-received" />Recebido</span> : null}
            </div>
          </header>

          {hasRevenue ? (
            <ChartContainer config={revenueConfig} className="dashboard-revenue-chart" aria-label="Gráfico de vendas e recebimentos dos últimos seis meses">
              <AreaChart accessibilityLayer data={revenue} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="sales-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="received-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-received)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-received)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tickMargin={8} tickFormatter={(value) => compactCurrency.format(Number(value))} tick={{ fill: "var(--text-muted)", fontSize: 10 }} width={70} />
                <ChartTooltip
                  cursor={{ stroke: "var(--line)", strokeDasharray: "4 4" }}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--line)", borderRadius: "10px", color: "var(--text-primary)" }}
                  labelStyle={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: "6px" }}
                  formatter={(value, name) => [currency.format(Number(value)), revenueConfig[name as keyof typeof revenueConfig]?.label ?? name]}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2.5} fill="url(#sales-gradient)" activeDot={{ r: 5, strokeWidth: 0 }} />
                {showReceived ? <Area type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2.5} fill="url(#received-gradient)" activeDot={{ r: 5, strokeWidth: 0 }} /> : null}
              </AreaChart>
            </ChartContainer>
          ) : <ChartEmptyState text="As vendas aparecerão aqui assim que os primeiros pedidos forem cadastrados." />}
        </article>

        <article className="dashboard-chart-card dashboard-status-card">
          <header className="dashboard-chart-header">
            <div>
              <h3>Pedidos por etapa</h3>
              <p>Distribuição no mês atual</p>
            </div>
            <strong className="dashboard-chart-total"><span>{orderTotal}</span> pedido{orderTotal === 1 ? "" : "s"}</strong>
          </header>

          {orderTotal > 0 ? (
            <ChartContainer config={statusConfig} className="dashboard-status-chart" aria-label="Gráfico de pedidos por etapa no mês atual">
              <PieChart accessibilityLayer>
                <ChartTooltip
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--line)", borderRadius: "10px", color: "var(--text-primary)" }}
                  formatter={(value) => [`${Number(value)} pedido${Number(value) === 1 ? "" : "s"}`, "Quantidade"]}
                />
                <Pie data={orderStatuses} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
                  {orderStatuses.map((item) => <Cell key={item.key} fill={item.fill} />)}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => <span className="dashboard-pie-label">{value}</span>}
                />
              </PieChart>
            </ChartContainer>
          ) : <ChartEmptyState text="A distribuição será exibida quando houver pedidos neste mês." />}
        </article>
      </div>
    </section>
  )
}

function ChartEmptyState({ text }: { text: string }) {
  return <div className="dashboard-chart-empty"><span aria-hidden="true" /><p>{text}</p></div>
}
