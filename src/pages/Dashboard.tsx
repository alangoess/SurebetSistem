import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PiggyBank,
  Activity,
  Building2,
  Wallet,
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
import { format, subDays, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  desired_return: number | null
  entries: {
    stake: number
    odd: number
    bet_type: string
    house_id: string
  }[]
}

interface Stats {
  todayProfit: number
  weekProfit: number
  monthProfit: number
  totalStaked: number
  totalReturned: number
  bankroll: number
  housesTotal: number
  operationsCount: number
  roi: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [houses, setHouses] = useState<House[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [stats, setStats] = useState<Stats>({
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    totalStaked: 0,
    totalReturned: 0,
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
      const [housesRes, operationsRes] = await Promise.all([
        supabase.from('houses').select('*'),
        supabase
          .from('operations')
          .select(`
            id,
            date,
            status,
            desired_return,
            entries:operation_entries(stake, odd, bet_type, house_id)
          `)
          .eq('status', 'completed')
          .order('date', { ascending: false }),
      ])

      if (housesRes.data) setHouses(housesRes.data)
      if (operationsRes.data) {
        setOperations(operationsRes.data as unknown as Operation[])
        calculateStats(operationsRes.data as unknown as Operation[], housesRes.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (ops: Operation[], housesList: House[]) => {
    const today = new Date()
    const todayStart = new Date(today.setHours(0, 0, 0, 0))
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)

    let todayProfit = 0
    let weekProfit = 0
    let monthProfit = 0
    let totalStaked = 0
    let totalReturned = 0
    let todayOps = 0
    let weekOps = 0
    let monthOps = 0

    ops.forEach((op) => {
      const opDate = new Date(op.date)
      const { invested, returned } = calculateOperationProfit(op)
      const profit = returned - invested

      totalStaked += invested
      totalReturned += returned

      if (opDate >= todayStart) {
        todayProfit += profit
        todayOps++
      }
      if (opDate >= weekStart) {
        weekProfit += profit
        weekOps++
      }
      if (opDate >= monthStart) {
        monthProfit += profit
        monthOps++
      }
    })

    const roi = totalStaked > 0 ? ((totalReturned - totalStaked) / totalStaked) * 100 : 0
    const totalBalance = housesList.reduce((sum, h) => sum + (h.balance || 0), 0)

    setStats({
      todayProfit,
      weekProfit,
      monthProfit,
      totalStaked,
      totalReturned,
      bankroll: totalBalance,
      housesTotal: housesList.length,
      operationsCount: ops.length,
      roi,
    })
  }

  const calculateOperationProfit = (op: Operation) => {
    let invested = 0
    let returned = 0

    op.entries?.forEach((entry) => {
      invested += entry.stake
      if (entry.bet_type === 'freebet') {
        returned += entry.stake * (entry.odd - 1)
      } else {
        returned += entry.stake * entry.odd
      }
    })

    return { invested, returned }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Chart data
  const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i))
  const profitByDay = last30Days.map((date) => {
    const dayOps = operations.filter((op) => {
      const opDate = new Date(op.date)
      return opDate.toDateString() === date.toDateString()
    })

    let dayProfit = 0
    dayOps.forEach((op) => {
      const { invested, returned } = calculateOperationProfit(op)
      dayProfit += returned - invested
    })

    return {
      date: format(date, 'dd/MM'),
      profit: dayProfit,
    }
  })

  const profitByHouse = houses.map((house) => {
    let houseProfit = 0
    operations.forEach((op) => {
      op.entries?.forEach((entry) => {
        if (entry.house_id === house.id) {
          if (entry.bet_type === 'freebet') {
            houseProfit += entry.stake * (entry.odd - 1)
          } else {
            houseProfit += entry.stake * entry.odd - entry.stake
          }
        }
      })
    })
    return {
      name: house.name,
      value: houseProfit,
      color: house.color,
    }
  }).filter((h) => h.value !== 0)

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
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Apostado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalStaked)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retornado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalReturned)}</div>
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
            <CardTitle className="text-sm font-medium">Operações</CardTitle>
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
                    <div className="font-bold">{formatCurrency(house.balance)}</div>
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
