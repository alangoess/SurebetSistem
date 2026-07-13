import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, TrendingUp, Dices, Gift, Spade } from 'lucide-react'
import { format, parseISO, startOfMonth, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface House {
  id: string
  name: string
  color: string
}

interface ExtraProfit {
  id: string
  date: string
  amount: number
  source: 'roleta' | 'deposite_ganhe' | 'cassino' | 'outro'
  house_id: string | null
  notes: string | null
  created_at: string
}

const SOURCE_LABELS: Record<string, string> = {
  roleta: 'Roleta de Prêmios',
  deposite_ganhe: 'Deposite e Ganhe',
  cassino: 'Cassino',
  outro: 'Outro',
}

const SOURCE_COLORS: Record<string, string> = {
  roleta: 'bg-purple-100 text-purple-800 border-purple-200',
  deposite_ganhe: 'bg-blue-100 text-blue-800 border-blue-200',
  cassino: 'bg-amber-100 text-amber-800 border-amber-200',
  outro: 'bg-gray-100 text-gray-700 border-gray-200',
}

function SourceIcon({ source }: { source: string }) {
  if (source === 'roleta') return <Dices className="h-3 w-3" />
  if (source === 'deposite_ganhe') return <Gift className="h-3 w-3" />
  if (source === 'cassino') return <Spade className="h-3 w-3" />
  return <TrendingUp className="h-3 w-3" />
}

export function ExtraProfits() {
  const [records, setRecords] = useState<ExtraProfit[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ExtraProfit | null>(null)
  const [recordToDelete, setRecordToDelete] = useState<ExtraProfit | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    source: 'roleta' as ExtraProfit['source'],
    house_id: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [epRes, housesRes] = await Promise.all([
        supabase
          .from('extra_profits')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('houses').select('id, name, color'),
      ])

      if (epRes.error) throw epRes.error
      if (epRes.data) setRecords(epRes.data)
      if (housesRes.data) setHouses(housesRes.data)
    } catch (error) {
      console.error('Error loading extra profits:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (record?: ExtraProfit) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        date: record.date,
        amount: record.amount.toString(),
        source: record.source,
        house_id: record.house_id || '',
        notes: record.notes || '',
      })
    } else {
      setEditingRecord(null)
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        source: 'roleta',
        house_id: '',
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const saveRecord = async () => {
    const amount = parseFloat(formData.amount)
    if (!formData.date || isNaN(amount) || amount <= 0 || !formData.house_id) return

    try {
      const payload = {
        date: formData.date,
        amount,
        source: formData.source,
        house_id: formData.house_id,
        notes: formData.notes || null,
      }

      if (editingRecord) {
        const { error } = await supabase
          .from('extra_profits')
          .update(payload)
          .eq('id', editingRecord.id)
        if (error) throw error

        // Adjust house balance: revert old amount, add new amount
        if (editingRecord.house_id) {
          const { data: oldHouse } = await supabase
            .from('houses')
            .select('balance')
            .eq('id', editingRecord.house_id)
            .maybeSingle()
          if (oldHouse) {
            await supabase
              .from('houses')
              .update({ balance: (oldHouse.balance || 0) - editingRecord.amount })
              .eq('id', editingRecord.house_id)
          }
        }
        const { data: newHouse } = await supabase
          .from('houses')
          .select('balance')
          .eq('id', formData.house_id)
          .maybeSingle()
        if (newHouse) {
          await supabase
            .from('houses')
            .update({ balance: (newHouse.balance || 0) + amount })
            .eq('id', formData.house_id)
        }

        toast.success('Lucro atualizado')
      } else {
        const { error } = await supabase
          .from('extra_profits')
          .insert(payload)
        if (error) throw error

        // Add amount to house balance
        const { data: house } = await supabase
          .from('houses')
          .select('balance')
          .eq('id', formData.house_id)
          .maybeSingle()
        if (house) {
          await supabase
            .from('houses')
            .update({ balance: (house.balance || 0) + amount })
            .eq('id', formData.house_id)
        }

        toast.success('Lucro registrado')
      }

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving extra profit:', error)
      toast.error('Erro ao salvar lucro')
    }
  }

  const confirmDelete = (record: ExtraProfit) => {
    setRecordToDelete(record)
    setDeleteDialogOpen(true)
  }

  const deleteRecord = async () => {
    if (!recordToDelete) return
    try {
      const { error } = await supabase
        .from('extra_profits')
        .delete()
        .eq('id', recordToDelete.id)
      if (error) throw error
      setDeleteDialogOpen(false)
      setRecordToDelete(null)
      loadData()
      toast.success('Registro excluído')
    } catch (error) {
      console.error('Error deleting extra profit:', error)
      toast.error('Erro ao excluir')
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStart = startOfMonth(today)

  const totalToday = records
    .filter(r => r.date === todayStr)
    .reduce((sum, r) => sum + r.amount, 0)

  const totalMonth = records
    .filter(r => parseISO(r.date) >= monthStart)
    .reduce((sum, r) => sum + r.amount, 0)

  const totalAll = records.reduce((sum, r) => sum + r.amount, 0)

  const bySource = Object.keys(SOURCE_LABELS).map(source => ({
    source,
    total: records.filter(r => r.source === source).reduce((sum, r) => sum + r.amount, 0),
  })).filter(s => s.total > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lucros Extras</h1>
          <p className="text-muted-foreground">Roleta, Deposite e Ganhe, Cassino e outros bônus</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Lucro
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalToday)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAll)}</p>
          </CardContent>
        </Card>
      </div>

      {bySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {bySource.map(({ source, total }) => (
                <div key={source} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${SOURCE_COLORS[source]}`}>
                  <SourceIcon source={source} />
                  {SOURCE_LABELS[source]}: {formatCurrency(total)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Casa</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const house = houses.find(h => h.id === record.house_id)
              return (
              <TableRow key={record.id}>
                <TableCell>
                  {format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${SOURCE_COLORS[record.source]}`}>
                    <SourceIcon source={record.source} />
                    {SOURCE_LABELS[record.source]}
                  </span>
                </TableCell>
                <TableCell>
                  {house ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: house.color }} />
                      {house.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {record.notes || '-'}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  +{formatCurrency(record.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(record)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(record)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              )
            })}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum lucro extra registrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar Lucro' : 'Registrar Lucro Extra'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ep-date">Data *</Label>
                <Input
                  id="ep-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-amount">Lucro (R$) *</Label>
                <Input
                  id="ep-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fonte *</Label>
              <Select
                value={formData.source}
                onValueChange={(value: ExtraProfit['source']) => setFormData({ ...formData, source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roleta">Roleta de Prêmios</SelectItem>
                  <SelectItem value="deposite_ganhe">Deposite e Ganhe</SelectItem>
                  <SelectItem value="cassino">Cassino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Casa de Aposta *</Label>
              <Select
                value={formData.house_id}
                onValueChange={(value) => setFormData({ ...formData, house_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a casa" />
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
              <Label htmlFor="ep-notes">Observações</Label>
              <Textarea
                id="ep-notes"
                placeholder="Ex: Roleta da Betano - ganhou R$ 50 em bônus..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={saveRecord}
              disabled={!formData.date || !formData.amount || parseFloat(formData.amount) <= 0 || !formData.house_id}
            >
              {editingRecord ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Registro</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir este lucro? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteRecord}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
