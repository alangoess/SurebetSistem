import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Building2,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, parseISO, subDays, startOfWeek, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ExtraProfit {
  id: string
  date: string
  amount: number
}

interface House {
  id: string
  name: string
  color: string
  balance: number
  status: string
}

interface Operation {
  id: string
  date: string
  status: string
  actual_profit: number | null
  entries: {
    stake: number
    odd: number
    bet_type: string
    bet_side: string
    house_id: string
  }[]
}

interface Stats {
  todayProfit: number
  weekProfit: number
  monthProfit: number
  totalStaked: number
  totalProfit: number
  bankroll: number
  housesTotal: number
  operationsCount: number
  roi: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// BACK/LAY calculation helpers
function getEntryInvestment(entry: { stake: number; odd: number; bet_side: string }): number {
  if (entry.bet_side === 'LAY') {
    return entry.stake * (entry.odd - 1) // Liability
  }
  return entry.stake
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [houses, setHouses] = useState<House[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [extraProfits, setExtraProfits] = useState<ExtraProfit[]>([])
  const [stats, setStats] = useState<Stats>({
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    totalStaked: 0,
    totalProfit: 0,
    bankroll: 0,
    housesTotal: 0,
    operationsCount: 0,
    roi: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [housesRes, operationsRes, extraRes] = await Promise.all([
        supabase.from('houses').select('*'),
        supabase
          .from('operations')
          .select(`
            id,
            date,
            status,
            actual_profit,
            entries:operation_entries(stake, odd, bet_type, bet_side, house_id)
          `)
          .eq('status', 'completed')
          .order('date', { ascending: false }),
        supabase.from('extra_profits').select('id, date, amount'),
      ])

      if (housesRes.data) setHouses(housesRes.data)
      if (extraRes.data) setExtraProfits(extraRes.data)
      if (operationsRes.data) {
        setOperations(operationsRes.data as unknown as Operation[])
        calculateStats(operationsRes.data as unknown as Operation[], housesRes.data || [], extraRes.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (ops: Operation[], housesList: House[], extras: ExtraProfit[]) => {
    const today = new Date()
    const todayStart = new Date(today.setHours(0, 0, 0, 0))
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)

    let todayProfit = 0
    let weekProfit = 0
    let monthProfit = 0
    let totalStaked = 0
    let totalProfit = 0

    ops.forEach((op) => {
      const opDate = parseISO(op.date)

      // Calculate total investment for this operation
      const invested = op.entries.reduce((sum, e) => sum + getEntryInvestment(e), 0)

      // Use actual_profit if available (settled operations)
      const profit = op.actual_profit !== null ? op.actual_profit : 0

      totalStaked += invested
      totalProfit += profit

      if (opDate >= todayStart) {
        todayProfit += profit
      }
      if (opDate >= weekStart) {
        weekProfit += profit
      }
      if (opDate >= monthStart) {
        monthProfit += profit
      }
    })

    // Add extra profits (bonuses, casino, etc.)
    extras.forEach((ep) => {
      const epDate = parseISO(ep.date)
      totalProfit += ep.amount
      if (epDate >= todayStart) todayProfit += ep.amount
      if (epDate >= weekStart) weekProfit += ep.amount
      if (epDate >= monthStart) monthProfit += ep.amount
    })

    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0
    const totalBalance = housesList.reduce((sum, h) => sum + (h.balance || 0), 0)

    setStats({
      todayProfit,
      weekProfit,
      monthProfit,
      totalStaked,
      totalProfit,
      bankroll: totalBalance,
      housesTotal: housesList.length,
      operationsCount: ops.length,
      roi,
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Chart data - last 30 days
  const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i))
  const profitByDay = last30Days.map((date) => {
    const dayOps = operations.filter((op) => {
      const opDate = parseISO(op.date)
      return opDate.toDateString() === date.toDateString()
    })

    const dayProfit = dayOps.reduce((sum, op) => sum + (op.actual_profit || 0), 0)

    return {
      date: format(date, 'dd/MM'),
      profit: dayProfit,
    }
  })

  // Profit by house
  const profitByHouse = houses.map((house) => {
    let houseProfit = 0

    operations.forEach((op) => {
      // Find entries for this house
      const houseEntries = op.entries.filter(e => e.house_id === house.id)
      if (houseEntries.length > 0 && op.actual_profit !== null) {
        // This house was part of this winning operation
        // The profit impact is proportional to their share of the operation
        houseProfit += op.actual_profit
      }
    })

    return {
      name: house.name,
      value: houseProfit,
      color: house.color,
    }
  }).filter((h) => h.value !== 0)

  // Balance distribution
  const balanceDistribution = houses.map((house) => ({
    name: house.name,
    value: house.balance || 0,
    color: house.color,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das operações</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro do Dia</CardTitle>
            {stats.todayProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats.todayProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(stats.todayProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro da Semana</CardTitle>
            {stats.weekProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats.weekProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(stats.weekProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro do Mês</CardTitle>
            {stats.monthProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats.monthProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(stats.monthProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats.roi >= 0 ? 'text-green-600' : 'text-red-600')}>
              {stats.roi.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalStaked)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(stats.totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo nas Casas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.bankroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operações Concluídas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.operationsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Lucro (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lucro por Casa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitByHouse}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="value">
                    {profitByHouse.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Saldo por Casa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={balanceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {balanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Casas de Apostas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {houses.map((house) => (
                <div key={house.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: house.color }}
                    />
                    <span className="font-medium">{house.name}</span>
                  </div>
                  <div className="text-right">
                    <div className={cn('font-bold', house.balance >= 0 ? '' : 'text-red-600')}>
                      {formatCurrency(house.balance)}
                    </div>
                    <Badge variant={house.status === 'active' ? 'success' : 'secondary'}>
                      {house.status === 'active' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              ))}
              {houses.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma casa cadastrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(' ')
}
