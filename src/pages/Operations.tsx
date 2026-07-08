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
import { Plus, Pencil, Trash2, Eye, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface House {
  id: string
  name: string
  color: string
}

interface OperationEntry {
  id?: string
  house_id: string
  market: string
  selection: string
  bet_type: 'real' | 'freebet'
  bet_side: 'BACK' | 'LAY'
  odd: number
  stake: number
  house?: House
  is_winner?: boolean
}

interface Operation {
  id: string
  date: string
  desired_return: number | null
  notes: string | null
  status: string
  winning_entry_id: string | null
  entries: OperationEntry[]
  actual_profit?: number | null
}

const initialEntry: OperationEntry = {
  house_id: '',
  market: '',
  selection: '',
  bet_type: 'real',
  bet_side: 'BACK',
  odd: 1.0,
  stake: 0,
}

// Função para formatar data como texto puro, ignorando completamente problemas de fuso horário (Timezone)
function formatarDataPura(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  
  // Se vier do banco com fuso horário (ex: T00:00:00Z), criamos o objeto e pegamos o dia local correto
  const dataObjeto = new Date(dateStr);
  
  // Se a data for inválida, tenta o fallback manual
  if (isNaN(dataObjeto.getTime())) {
    const dataLimpa = dateStr.substring(0, 10)
    const partes = dataLimpa.split('-')
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dateStr
  }

  // Pega o dia, mês e ano local do navegador, sem deslocamento de fuso
  const dia = String(dataObjeto.getDate()).padStart(2, '0');
  const mes = String(dataObjeto.getMonth() + 1).padStart(2, '0'); // Meses começam em 0
  const ano = dataObjeto.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

// Utility functions for BACK/LAY calculations
function getBackInvestment(stake: number): number {
  return stake
}

function getBackReturn(stake: number, odd: number): number {
  return stake * odd
}

// For LAY: stake is what you want to WIN, not the liability
function getLayLiability(stake: number, odd: number): number {
  return stake * (odd - 1)
}

// Calculate investment for a single entry
function getEntryInvestment(entry: OperationEntry): number {
  if (entry.bet_side === 'LAY') {
    return getLayLiability(entry.stake, entry.odd)
  }
  return getBackInvestment(entry.stake)
}

// Calculate return for a single entry if it wins
function getEntryReturn(entry: OperationEntry): number {
  if (entry.bet_type === 'freebet') {
    // Freebet: you only keep the profit (odd - 1) * stake
    if (entry.bet_side === 'LAY') {
      return entry.stake // You wanted to win this amount
    }
    return entry.stake * (entry.odd - 1)
  }

  if (entry.bet_side === 'LAY') {
    return entry.stake + getLayLiability(entry.stake, entry.odd)
  }
  return getBackReturn(entry.stake, entry.odd)
}

// Calculate total investment of operation
function getTotalInvestment(entries: OperationEntry[]): number {
  return entries.reduce((sum, entry) => sum + getEntryInvestment(entry), 0)
}

// Calculate actual profit based on winning entry
function calculateActualProfit(entries: OperationEntry[], winningEntryId: string | null): number | null {
  if (!winningEntryId) return null

  const totalInvestment = getTotalInvestment(entries)
  const winningEntry = entries.find(e => e.id === winningEntryId)

  if (!winningEntry) return null

  const winningReturn = getEntryReturn(winningEntry)
  return winningReturn - totalInvestment
}

export function Operations() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [operationToDelete, setOperationToDelete] = useState<Operation | null>(null)
  const [operationToView, setOperationToView] = useState<Operation | null>(null)
  const [operationToSettle, setOperationToSettle] = useState<Operation | null>(null)
  const [selectedWinningEntry, setSelectedWinningEntry] = useState<string>('')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    desired_return: '',
    notes: '',
    status: 'pending',
  })
  const [entries, setEntries] = useState<OperationEntry[]>([{ ...initialEntry }])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [opsRes, housesRes] = await Promise.all([
        supabase
          .from('operations')
          .select(`
            id,
            date,
            desired_return,
            notes,
            status,
            winning_entry_id,
            entries:operation_entries(
              id,
              house_id,
              market,
              selection,
              bet_type,
              bet_side,
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
          actual_profit: calculateActualProfit(
            op.entries?.map((e: any) => ({ ...e, id: e.id })) || [],
            op.winning_entry_id
          )
        }))
        setOperations(formattedOps)
      }
      if (housesRes.data) setHouses(housesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (operation?: Operation) => {
    if (operation) {
      setEditingOperation(operation)
      setFormData({
        // Garante que o input tipo date receba APENAS "YYYY-MM-DD", ignorando horas e fusos
        date: operation.date ? operation.date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'),
        desired_return: operation.desired_return?.toString() || '',
        notes: operation.notes || '',
        status: operation.status,
      })
      setEntries(
        operation.entries.map((e) => ({
          ...e,
          house: houses.find((h) => h.id === e.house_id),
        }))
      )
    } else {
      setEditingOperation(null)
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        desired_return: '',
        notes: '',
        status: 'pending',
      })
      setEntries([{ ...initialEntry }])
    }
    setDialogOpen(true)
  }

  const addEntry = () => {
    setEntries([...entries, { ...initialEntry }])
  }

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index))
    }
  }

  const updateEntry = (index: number, field: keyof OperationEntry, value: any) => {
    const newEntries = [...entries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setEntries(newEntries)
  }

  const calculateOperationTotals = () => {
    const totalInvested = getTotalInvestment(entries)

    const scenarioProfits = entries.map(entry => {
      const totalInv = getTotalInvestment(entries)
      return getEntryReturn(entry) - totalInv
    })

    const avgProfit = scenarioProfits.reduce((a, b) => a + b, 0) / scenarioProfits.length
    const roi = totalInvested > 0 ? (avgProfit / totalInvested) * 100 : 0
    const totalReturned = entries.reduce((sum, entry) => sum + getEntryReturn(entry), 0)

    return {
      totalInvested,
      totalReturned,
      profit: avgProfit,
      roi
    }
  }

  const saveOperation = async () => {
    try {
      const operationData = {
        date: formData.date,
        desired_return: formData.desired_return ? parseFloat(formData.desired_return) : null,
        notes: formData.notes || null,
        status: formData.status,
      }

      if (editingOperation) {
        const { error: opError } = await supabase
          .from('operations')
          .update(operationData)
          .eq('id', editingOperation.id)

        if (opError) throw opError

        const { error: deleteError = null } = await supabase
          .from('operation_entries')
          .delete()
          .eq('operation_id', editingOperation.id)

        if (deleteError) throw deleteError

        const entriesData = entries.map((e) => ({
          operation_id: editingOperation.id,
          house_id: e.house_id,
          market: e.market || null,
          selection: e.selection || null,
          bet_type: e.bet_type,
          bet_side: e.bet_side,
          odd: e.odd,
          stake: e.stake,
        }))

        const { data: insertedEntries, error: entriesError } = await supabase
          .from('operation_entries')
          .insert(entriesData)
          .select()

        if (entriesError) throw entriesError

        if (editingOperation.winning_entry_id) {
          const matchingEntry = insertedEntries?.find((_, idx) =>
            editingOperation.entries[idx]?.id === editingOperation.winning_entry_id
          )
          if (matchingEntry) {
            await supabase
              .from('operations')
              .update({ winning_entry_id: matchingEntry.id })
              .eq('id', editingOperation.id)
          }
        }
      } else {
        const { data: newOp, error: opError } = await supabase
          .from('operations')
          .insert(operationData)
          .select()
          .single()

        if (opError) throw opError

        const entriesData = entries.map((e) => ({
          operation_id: newOp.id,
          house_id: e.house_id,
          market: e.market || null,
          selection: e.selection || null,
          bet_type: e.bet_type,
          bet_side: e.bet_side,
          odd: e.odd,
          stake: e.stake,
        }))

        const { error: entriesError } = await supabase
          .from('operation_entries')
          .insert(entriesData)

        if (entriesError) throw entriesError
      }

      setDialogOpen(false)
      loadData()
      toast.success('Operação salva com sucesso')
    } catch (error) {
      console.error('Error saving operation:', error)
      toast.error('Erro ao salvar operação')
    }
  }

  const confirmDelete = (operation: Operation) => {
    setOperationToDelete(operation)
    setDeleteDialogOpen(true)
  }

  const deleteOperation = async () => {
    if (!operationToDelete) return

    try {
      const { error } = await supabase
        .from('operations')
        .delete()
        .eq('id', operationToDelete.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setOperationToDelete(null)
      loadData()
      toast.success('Operação excluída')
    } catch (error) {
      console.error('Error deleting operation:', error)
      toast.error('Erro ao excluir operação')
    }
  }

  const viewOperation = (operation: Operation) => {
    setOperationToView({
      ...operation,
      entries: operation.entries.map((e) => ({
        ...e,
        house: houses.find((h) => h.id === e.house_id),
      })),
    })
    setViewDialogOpen(true)
  }

  const openSettleDialog = (operation: Operation) => {
    setOperationToSettle({
      ...operation,
      entries: operation.entries.map((e) => ({
        ...e,
        house: houses.find((h) => h.id === e.house_id),
      })),
    })
    setSelectedWinningEntry(operation.winning_entry_id || '')
    setSettleDialogOpen(true)
  }

  const settleOperation = async () => {
    if (!operationToSettle || !selectedWinningEntry) return

    try {
      const { error } = await supabase
        .from('operations')
        .update({
          status: 'completed',
          winning_entry_id: selectedWinningEntry
        })
        .eq('id', operationToSettle.id)

      if (error) throw error

      setSettleDialogOpen(false)
      setOperationToSettle(null)
      loadData()
      toast.success('Operação finalizada com sucesso')
    } catch (error) {
      console.error('Error settling operation:', error)
      toast.error('Erro ao finalizar operação')
    }
  }

  const updateOperationStatus = async (operationId: string, newStatus: string) => {
    const operation = operations.find(op => op.id === operationId)

    if (newStatus === 'completed' && operation?.status === 'pending') {
      openSettleDialog(operation)
      return
    }

    try {
      const { error } = await supabase
        .from('operations')
        .update({ status: newStatus })
        .eq('id', operationId)

      if (error) throw error
      loadData()
      toast.success('Status atualizado')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totals = calculateOperationTotals()

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
          <h1 className="text-3xl font-bold">Operações</h1>
          <p className="text-muted-foreground">Gerencie suas operações de apostas</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Operação
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Investido</TableHead>
              <TableHead>Lucro/Loss</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((op) => {
              const invested = getTotalInvestment(op.entries)
              const profit = op.actual_profit ?? calculateOperationTotals().profit
              const winningEntry = op.entries.find(e => e.id === op.winning_entry_id)

              return (
                <TableRow key={op.id}>
                  <TableCell>
                    {formatarDataPura(op.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {op.entries.map((e, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={e.id === op.winning_entry_id ? 'border-green-500 text-green-600' : ''}
                        >
                          {e.house?.name || 'Casa'}
                          <span className="ml-1 text-xs">
                            ({e.bet_side})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(invested)}</TableCell>
                  <TableCell>
                    {op.status === 'completed' && op.winning_entry_id ? (
                      <div>
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                          {formatCurrency(profit)}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          Green: {winningEntry?.house?.name} ({winningEntry?.bet_side})
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        ~{formatCurrency(profit)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={op.status}
                      onValueChange={(value) => updateOperationStatus(op.id, value)}
                    >
                      <SelectTrigger className="w-32">
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
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {op.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSettleDialog(op)}
                          title="Finalizar operação"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewOperation(op)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(op)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(op)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {operations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma operação cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? 'Editar Operação' : 'Nova Operação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Operation Header */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desired_return">Retorno Desejado (%)</Label>
                <Input
                  id="desired_return"
                  type="number"
                  step="0.01"
                  value={formData.desired_return}
                  onChange={(e) => setFormData({ ...formData, desired_return: e.target.value })}
                  placeholder="Ex: 5.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>

            {/* Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Entradas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Entrada
                </Button>
              </div>

              {entries.map((entry, index) => {
                const investment = getEntryInvestment(entry)
                const potentialReturn = getEntryReturn(entry)

                return (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid gap-4 md:grid-cols-7">
                        <div className="space-y-2">
                          <Label>Casa *</Label>
                          <Select
                            value={entry.house_id}
                            onValueChange={(value) => updateEntry(index, 'house_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
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
                          <Label>Lado *</Label>
                          <Select
                            value={entry.bet_side}
                            onValueChange={(value: 'BACK' | 'LAY') =>
                              updateEntry(index, 'bet_side', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BACK">BACK (A favor)</SelectItem>
                              <SelectItem value="LAY">LAY (Contra)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={entry.bet_type}
                            onValueChange={(value: 'real' | 'freebet') =>
                              updateEntry(index, 'bet_type', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="real">Dinheiro Real</SelectItem>
                              <SelectItem value="freebet">Freebet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Odd *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            value={entry.odd}
                            onChange={(e) =>
                              updateEntry(index, 'odd', parseFloat(e.target.value) || 1)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {entry.bet_side === 'LAY' ? 'Stake (ganho desejado)' : 'Stake *'}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.stake}
                              onChange={(e) =>
                                updateEntry(index, 'stake', parseFloat(e.target.value) || 0)
                              }
                              className="flex-1"
                            />
                            {entries.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeEntry(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Investimento</Label>
                          <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                            {formatCurrency(investment)}
                            {entry.bet_side === 'LAY' && (
                              <span className="ml-1 text-xs text-muted-foreground">(resp.)</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Retorno se vencer</Label>
                          <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                            {formatCurrency(potentialReturn)}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 mt-4">
                        <div className="space-y-2">
                          <Label>Mercado</Label>
                          <Input
                            value={entry.market}
                            onChange={(e) => updateEntry(index, 'market', e.target.value)}
                            placeholder="Ex: 1X2"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Seleção</Label>
                          <Input
                            value={entry.selection}
                            onChange={(e) => updateEntry(index, 'selection', e.target.value)}
                            placeholder="Ex: Time A"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo da Operação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Investimento Total</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.totalInvested)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Médio (todos cenários)</p>
                    <p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totals.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ROI Médio</p>
                    <p className={`text-lg font-bold ${totals.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.roi.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveOperation}
              disabled={!formData.date || entries.some((e) => !e.house_id || e.odd <= 1 || e.stake <= 0)}
            >
              {editingOperation ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Operação</DialogTitle>
          </DialogHeader>

          {operationToView && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Data: </span>
                  <span className="font-medium">
                    {formatarDataPura(operationToView.date)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <Badge
                    variant={
                      operationToView.status === 'completed'
                        ? 'success'
                        : operationToView.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {operationToView.status === 'completed'
                      ? 'Concluída'
                      : operationToView.status === 'cancelled'
                        ? 'Cancelada'
                        : 'Pendente'}
                  </Badge>
                </div>
                {operationToView.desired_return && (
                  <div>
                    <span className="text-muted-foreground">Retorno Desejado: </span>
                    <span className="font-medium">{operationToView.desired_return}%</span>
                  </div>
                )}
              </div>

              {operationToView.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Observações: </span>
                  {operationToView.notes}
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Casa</TableHead>
                    <TableHead>Lado</TableHead>
                    <TableHead>Mercado</TableHead>
                    <TableHead>Seleção</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Odd</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Retorno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationToView.entries.map((entry, index) => (
                    <TableRow
                      key={index}
                      className={entry.id === operationToView.winning_entry_id ? 'bg-green-50' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.house?.color || '#CCC' }}
                          />
                          {entry.house?.name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.bet_side === 'BACK' ? 'default' : 'secondary'}>
                          {entry.bet_side}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.market || '-'}</TableCell>
                      <TableCell>{entry.selection || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={entry.bet_type === 'real' ? 'default' : 'secondary'}>
                          {entry.bet_type === 'real' ? 'Dinheiro Real' : 'Freebet'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{entry.odd.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.stake)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(getEntryInvestment(entry))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(getEntryReturn(entry))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="grid gap-4 md:grid-cols-2 text-sm border-t pt-4">
                <div>
                  <span className="text-muted-foreground">Investimento Total: </span>
                  <span className="font-bold">{formatCurrency(getTotalInvestment(operationToView.entries))}</span>
                </div>
                {operationToView.actual_profit !== null && operationToView.actual_profit !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Lucro Real: </span>
                    <span className={`font-bold ${operationToView.actual_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(operationToView.actual_profit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settle Dialog - Select Winning Entry */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Operação</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground">
            Selecione qual entrada foi a vencedora para calcular o lucro real:
          </p>

          {operationToSettle && (
            <div className="space-y-4">
              <div className="space-y-2">
                {operationToSettle.entries.map((entry) => {
                  const profit = getEntryReturn(entry) - getTotalInvestment(operationToSettle.entries)
                  return (
                    <div
                      key={entry.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedWinningEntry === entry.id
                          ? 'border-green-500 bg-green-50'
                          : 'hover:bg-muted'
                        }`}
                      onClick={() => setSelectedWinningEntry(entry.id || '')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: entry.house?.color || '#CCC' }}
                          />
                          <div>
                            <div className="font-medium">{entry.house?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.bet_side} @ {entry.odd.toFixed(2)}
                              {entry.market && ` - ${entry.market}`}
                              {entry.selection && ` - ${entry.selection}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatCurrency(profit)}
                          </div>
                          <div className="text-xs text-muted-foreground">lucro</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedWinningEntry && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Investido:</span>
                      <span className="font-bold">
                        {formatCurrency(getTotalInvestment(operationToSettle.entries))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lucro Final:</span>
                      <span className={`font-bold ${(getEntryReturn(operationToSettle.entries.find(e => e.id === selectedWinningEntry)!) -
                          getTotalInvestment(operationToSettle.entries)) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(
                          getEntryReturn(operationToSettle.entries.find(e => e.id === selectedWinningEntry)!) -
                          getTotalInvestment(operationToSettle.entries)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={settleOperation}
              disabled={!selectedWinningEntry}
            >
              Confirmar e Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Operação</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteOperation}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}