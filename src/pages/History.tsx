import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Download, Filter, X, Gift } from 'lucide-react'
import { format, startOfDay, endOfDay, parse, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface House {
  id: string
  name: string
  color: string
}

interface OperationEntry {
  id: string
  house_id: string
  market: string | null
  selection: string | null
  bet_type: string
  odd: number
  stake: number
  house?: House
}

interface Operation {
  id: string
  date: string
  status: string
  notes: string | null
  returns_freebet_on_loss: boolean
  potential_freebet_amount: number
  freebet_status: 'pendente' | 'recebida' | 'usada' | null
  entries: OperationEntry[]
}

interface FilterState {
  dateFrom: string
  dateTo: string
  houseId: string
  status: string
  minProfit: string
  maxProfit: string
}

export function History() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    houseId: '',
    status: '',
    minProfit: '',
    maxProfit: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [operations, filters])

  const loadData = async () => {
    try {
      const [opsRes, housesRes] = await Promise.all([
        supabase
          .from('operations')
          .select(`
            id,
            date,
            status,
            notes,
            returns_freebet_on_loss,
            potential_freebet_amount,
            freebet_status,
            entries:operation_entries(
              id,
              house_id,
              market,
              selection,
              bet_type,
              odd,
              stake
            )
          `)
          .order('date', { ascending: false }),
        supabase.from('houses').select('id, name, color'),
      ])

      if (opsRes.data) {
        const formattedOps = opsRes.data.map((op) => ({
          ...op,
          entries: op.entries?.map((e: any) => ({
            ...e,
            house: housesRes.data?.find((h) => h.id === e.house_id),
          })) || [],
        }))
        setOperations(formattedOps)
        setFilteredOperations(formattedOps)
      }
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

  const applyFilters = () => {
    let filtered = [...operations]

    if (filters.dateFrom) {
      filtered = filtered.filter((op) => parseISO(op.date) >= new Date(filters.dateFrom))
    }

    if (filters.dateTo) {
      filtered = filtered.filter((op) => parseISO(op.date) <= new Date(filters.dateTo))
    }

    if (filters.houseId) {
      filtered = filtered.filter((op) =>
        op.entries.some((e) => e.house_id === filters.houseId)
      )
    }

    if (filters.status) {
      filtered = filtered.filter((op) => op.status === filters.status)
    }

    if (filters.minProfit) {
      const min = parseFloat(filters.minProfit)
      filtered = filtered.filter((op) => calculateOperationProfit(op).profit >= min)
    }

    if (filters.maxProfit) {
      const max = parseFloat(filters.maxProfit)
      filtered = filtered.filter((op) => calculateOperationProfit(op).profit <= max)
    }

    setFilteredOperations(filtered)
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      houseId: '',
      status: '',
      minProfit: '',
      maxProfit: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const exportToCSV = () => {
    const headers = ['Data', 'Status', 'Investido', 'Retorno', 'Lucro', 'ROI', 'Entradas']
    const rows = filteredOperations.map((op) => {
      const { invested, returned, profit } = calculateOperationProfit(op)
      const roi = invested > 0 ? ((profit / invested) * 100).toFixed(2) : '0'
      const entriesStr = op.entries.map((e) => `${e.house?.name || 'N/A'}: ${e.stake}@${e.odd}`).join('; ')

      return [
        format(parseISO(op.date), 'dd/MM/yyyy'),
        op.status,
        invested.toFixed(2),
        returned.toFixed(2),
        profit.toFixed(2),
        roi,
        entriesStr,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    downloadFile(csvContent, 'historico_operacoes.csv', 'text/csv')
  }

  const exportToExcel = () => {
    // Simple Excel export (TSV format that Excel can read)
    const headers = ['Data', 'Status', 'Investido', 'Retorno', 'Lucro', 'ROI', 'Entradas']
    const rows = filteredOperations.map((op) => {
      const { invested, returned, profit } = calculateOperationProfit(op)
      const roi = invested > 0 ? ((profit / invested) * 100).toFixed(2) : '0'
      const entriesStr = op.entries.map((e) => `${e.house?.name}: ${e.stake}@${e.odd}`).join('; ')

      return [
        format(parseISO(op.date), 'dd/MM/yyyy'),
        op.status,
        formatCurrency(invested),
        formatCurrency(returned),
        formatCurrency(profit),
        `${roi}%`,
        entriesStr,
      ]
    })

    const content = [
      headers.join('\t'),
      ...rows.map((row) => row.join('\t')),
    ].join('\n')

    downloadFile(content, 'historico_operacoes.xls', 'application/vnd.ms-excel')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const availableFreebetsCount = operations
    .filter(op => op.freebet_status === 'recebida')
    .reduce((sum, op) => sum + (op.potential_freebet_amount || 0), 0)

  const totalInvested = filteredOperations.reduce((sum, op) => sum + calculateOperationProfit(op).invested, 0)
  const totalReturned = filteredOperations.reduce((sum, op) => sum + calculateOperationProfit(op).returned, 0)
  const totalProfit = filteredOperations.reduce((sum, op) => sum + calculateOperationProfit(op).profit, 0)
  const avgROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

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
          <h1 className="text-3xl font-bold">Histórico</h1>
          <p className="text-muted-foreground">Consulte o histórico de operações</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(filters).filter((v) => v !== '').length}
              </Badge>
            )}
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Casa</Label>
                <Select
                  value={filters.houseId}
                  onValueChange={(value) => setFilters({ ...filters, houseId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {houses.map((house) => (
                      <SelectItem key={house.id} value={house.id}>
                        {house.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lucro Mín.</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={filters.minProfit}
                  onChange={(e) => setFilters({ ...filters, minProfit: e.target.value })}
                  placeholder="R$ 0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Lucro Máx.</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={filters.maxProfit}
                  onChange={(e) => setFilters({ ...filters, maxProfit: e.target.value })}
                  placeholder="R$ 0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
        {availableFreebetsCount > 0 && (
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-amber-500" />
                Freebets Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(availableFreebetsCount)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Operations Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead className="text-right">Investido</TableHead>
              <TableHead className="text-right">Retorno</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperations.map((op) => {
              const { invested, returned, profit } = calculateOperationProfit(op)
              const roi = invested > 0 ? (profit / invested) * 100 : 0

              return (
                <TableRow key={op.id}>
                  <TableCell>
                    {format(parseISO(op.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {op.entries.map((entry, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: entry.house?.color }}
                        >
                          {entry.house?.name}: {entry.stake.toFixed(0)}@{entry.odd.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(invested)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(returned)}</TableCell>
                  <TableCell className={`text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div>{formatCurrency(profit)}</div>
                    {op.freebet_status === 'recebida' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 text-xs mt-1">
                        <Gift className="mr-1 h-3 w-3" />
                        Freebet de {formatCurrency(op.potential_freebet_amount)} Ativa
                      </Badge>
                    )}
                    {op.freebet_status === 'usada' && (
                      <Badge variant="secondary" className="text-xs mt-1 opacity-60 line-through">
                        <Gift className="mr-1 h-3 w-3" />
                        Freebet Usada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        op.status === 'completed'
                          ? 'success'
                          : op.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {op.status === 'completed'
                        ? 'Concluída'
                        : op.status === 'cancelled'
                        ? 'Cancelada'
                        : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredOperations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {hasActiveFilters
                    ? 'Nenhuma operação encontrada com os filtros aplicados'
                    : 'Nenhuma operação cadastrada'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Exibindo {filteredOperations.length} de {operations.length} operações
      </div>
    </div>
  )
}
