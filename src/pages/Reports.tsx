import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { format, parseISO, subDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface House {
  id: string
  name: string
  color: string
  balance: number
}

interface Operation {
  id: string
  date: string
  status: string
  entries: {
    stake: number
    odd: number
    bet_type: string
    house_id: string
  }[]
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function Reports() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (period === 'custom') return
    const end = new Date()
    let start: Date
    switch (period) {
      case 'week':
        start = startOfWeek(end, { weekStartsOn: 1 })
        break
      case 'month':
        start = startOfMonth(end)
        break
      case 'year':
        start = new Date(end.getFullYear(), 0, 1)
        break
      default:
        start = subDays(end, 30)
    }
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }, [period])

  const loadData = async () => {
    try {
      const [opsRes, housesRes] = await Promise.all([
        supabase
          .from('operations')
          .select(`
            id,
            date,
            status,
            entries:operation_entries(stake, odd, bet_type, house_id)
          `)
          .eq('status', 'completed')
          .order('date', { ascending: true }),
        supabase.from('houses').select('id, name, color, balance'),
      ])

      if (opsRes.data) setOperations(opsRes.data as unknown as Operation[])
      if (housesRes.data) setHouses(housesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateOperationProfit = (op: Operation) => {
    let invested = 0
    let returned = 0

    op.entries.forEach((entry) => {
      invested += entry.stake
      if (entry.bet_type === 'freebet') {
        returned += entry.stake * (entry.odd - 1)
      } else {
        returned += entry.stake * entry.odd
      }
    })

    return { invested, returned, profit: returned - invested }
  }

  const getFilteredOperations = () => {
    return operations.filter((op) => {
      const date = parseISO(op.date)
      if (startDate && date < new Date(startDate)) return false
      if (endDate && date > new Date(endDate)) return false
      return true
    })
  }

  const filtered = getFilteredOperations()

  // Calculate stats
  const totalInvested = filtered.reduce((sum, op) => sum + calculateOperationProfit(op).invested, 0)
  const totalReturned = filtered.reduce((sum, op) => sum + calculateOperationProfit(op).returned, 0)
  const totalProfit = filtered.reduce((sum, op) => sum + calculateOperationProfit(op).profit, 0)
  const avgROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const winRate = filtered.length > 0
    ? (filtered.filter((op) => calculateOperationProfit(op).profit > 0).length / filtered.length) * 100
    : 0

  // Chart data - Profit by day
  const profitByDay = (() => {
    if (!startDate || !endDate) return []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = eachDayOfInterval({ start, end })

    return days.map((day) => {
      const dayOps = filtered.filter((op) => parseISO(op.date).toDateString() === day.toDateString())
      const dayProfit = dayOps.reduce((sum, op) => sum + calculateOperationProfit(op).profit, 0)
      return {
        date: format(day, 'dd/MM'),
        profit: dayProfit,
      }
    })
  })()

  // Chart data - Profit by house
  const profitByHouse = houses.map((house) => {
    let houseProfit = 0
    filtered.forEach((op) => {
      op.entries.forEach((entry) => {
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

  // Chart data - Profit by market (simplified)
  const stakeByBetType = (() => {
    let real = 0
    let freebet = 0
    filtered.forEach((op) => {
      op.entries.forEach((entry) => {
        if (entry.bet_type === 'real') {
          real += entry.stake
        } else {
          freebet += entry.stake
        }
      })
    })
    return [
      { name: 'Dinheiro Real', value: real, color: '#3B82F6' },
      { name: 'Freebet', value: freebet, color: '#10B981' },
    ]
  })()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const exportReport = () => {
    const headers = ['Data', 'Investido', 'Retorno', 'Lucro', 'ROI', 'Entradas']
    const rows = filtered.map((op) => {
      const { invested, returned, profit } = calculateOperationProfit(op)
      const roi = invested > 0 ? ((profit / invested) * 100).toFixed(2) : '0'
      const entriesStr = op.entries.map((e) => {
        const house = houses.find((h) => h.id === e.house_id)
        return `${house?.name || 'N/A'}: ${e.stake}@${e.odd}`
      }).join('; ')

      return [
        format(parseISO(op.date), 'dd/MM/yyyy'),
        invested.toFixed(2),
        returned.toFixed(2),
        profit.toFixed(2),
        roi,
        entriesStr,
      ]
    })

    // Add summary row
    rows.push(['', '', '', '', '', ''])
    rows.push(['TOTAL', totalInvested.toFixed(2), totalReturned.toFixed(2), totalProfit.toFixed(2), avgROI.toFixed(2), ''])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_${period}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada das operações</p>
        </div>
        <Button onClick={exportReport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={period !== 'custom'}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={period !== 'custom'}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Retornado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalReturned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ROI Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgROI.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} />
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
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
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
            <CardTitle>Distribuição por Tipo de Aposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stakeByBetType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {stakeByBetType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
            <CardTitle>Top Operações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered
                .map((op) => ({ ...op, ...calculateOperationProfit(op) }))
                .sort((a, b) => b.profit - a.profit)
                .slice(0, 5)
                .map((op, i) => (
                  <div key={op.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={i < 3 ? 'success' : 'secondary'}>{i + 1}</Badge>
                      <div>
                        <p className="font-medium">{format(parseISO(op.date), 'dd/MM/yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{op.entries.length} entradas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${op.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(op.profit)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ROI: {((op.profit / op.invested) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Sem operações no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
