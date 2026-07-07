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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, ArrowUpFromLine } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface House {
  id: string
  name: string
  color: string
  balance: number
}

interface Withdrawal {
  id: string
  house_id: string
  amount: number
  date: string
  notes: string | null
  house?: House
}

export function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null)
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null)
  const [formData, setFormData] = useState({
    house_id: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [withdrawalsRes, housesRes] = await Promise.all([
        supabase
          .from('withdrawals')
          .select('*')
          .order('date', { ascending: false }),
        supabase.from('houses').select('id, name, color, balance'),
      ])

      if (withdrawalsRes.data) {
        const formatted = withdrawalsRes.data.map((w) => ({
          ...w,
          house: housesRes.data?.find((h) => h.id === w.house_id),
        }))
        setWithdrawals(formatted)
      }
      if (housesRes.data) setHouses(housesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (withdrawal?: Withdrawal) => {
    if (withdrawal) {
      setEditingWithdrawal(withdrawal)
      setFormData({
        house_id: withdrawal.house_id,
        amount: withdrawal.amount.toString(),
        date: withdrawal.date,
        notes: withdrawal.notes || '',
      })
    } else {
      setEditingWithdrawal(null)
      setFormData({
        house_id: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const saveWithdrawal = async () => {
    try {
      const amount = parseFloat(formData.amount)
      if (!amount || amount <= 0) {
        alert('Valor deve ser maior que zero')
        return
      }

      // Get current house balance
      const house = houses.find((h) => h.id === formData.house_id)
      if (!house) return

      if (editingWithdrawal) {
        // Calculate new balance
        const diff = amount - editingWithdrawal.amount
        const previousBalance = house.balance + editingWithdrawal.amount
        const newBalance = previousBalance - diff

        if (newBalance < 0) {
          alert('Saldo não pode ficar negativo')
          return
        }

        // Update withdrawal
        const { error: withError } = await supabase
          .from('withdrawals')
          .update({
            house_id: formData.house_id,
            amount,
            date: formData.date,
            notes: formData.notes || null,
          })
          .eq('id', editingWithdrawal.id)

        if (withError) throw withError

        // Update house balance
        const { error: houseError } = await supabase
          .from('houses')
          .update({ balance: newBalance })
          .eq('id', formData.house_id)

        if (houseError) throw houseError
      } else {
        // Check if house has enough balance
        if (house.balance < amount) {
          alert('Saldo insuficiente na casa')
          return
        }

        // Create withdrawal
        const { error: withError } = await supabase.from('withdrawals').insert({
          house_id: formData.house_id,
          amount,
          date: formData.date,
          notes: formData.notes || null,
        })

        if (withError) throw withError

        // Update house balance
        const { error: houseError } = await supabase
          .from('houses')
          .update({ balance: house.balance - amount })
          .eq('id', formData.house_id)

        if (houseError) throw houseError
      }

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving withdrawal:', error)
      alert('Erro ao salvar saque')
    }
  }

  const confirmDelete = (withdrawal: Withdrawal) => {
    setWithdrawalToDelete(withdrawal)
    setDeleteDialogOpen(true)
  }

  const deleteWithdrawal = async () => {
    if (!withdrawalToDelete) return

    try {
      const house = houses.find((h) => h.id === withdrawalToDelete.house_id)
      if (!house) return

      // Update house balance (return the withdrawn amount)
      const newBalance = house.balance + withdrawalToDelete.amount

      // Delete withdrawal
      const { error: withError } = await supabase
        .from('withdrawals')
        .delete()
        .eq('id', withdrawalToDelete.id)

      if (withError) throw withError

      // Update house balance
      const { error: houseError } = await supabase
        .from('houses')
        .update({ balance: newBalance })
        .eq('id', withdrawalToDelete.house_id)

      if (houseError) throw houseError

      setDeleteDialogOpen(false)
      setWithdrawalToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting withdrawal:', error)
      alert('Erro ao excluir saque')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)

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
          <h1 className="text-3xl font-bold">Saques</h1>
          <p className="text-muted-foreground">Gerencie saques das casas</p>
        </div>
        <Button onClick={() => openDialog()} disabled={houses.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Saque
        </Button>
      </div>

      {houses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">
              Cadastre uma casa de apostas antes de realizar saques
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalWithdrawals)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saques este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(
                withdrawals
                  .filter((w) => {
                    const date = new Date(w.date)
                    const now = new Date()
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                  })
                  .reduce((sum, w) => sum + w.amount, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{withdrawals.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Casa</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id}>
                <TableCell>
                  {format(new Date(withdrawal.date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: withdrawal.house?.color || '#CCC' }}
                    />
                    {withdrawal.house?.name || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatCurrency(withdrawal.amount)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {withdrawal.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(withdrawal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(withdrawal)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {withdrawals.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum saque registrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWithdrawal ? 'Editar Saque' : 'Novo Saque'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Casa *</Label>
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
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: house.color }}
                        />
                        {house.name} ({formatCurrency(house.balance)})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
              {formData.house_id && (
                <p className="text-sm text-muted-foreground">
                  Saldo disponível: {formatCurrency(houses.find((h) => h.id === formData.house_id)?.balance || 0)}
                </p>
              )}
            </div>

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
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveWithdrawal}
              disabled={!formData.house_id || !formData.amount || parseFloat(formData.amount) <= 0}
            >
              {editingWithdrawal ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Saque</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir este saque de {formatCurrency(withdrawalToDelete?.amount || 0)}?
            O valor será devolvido ao saldo da casa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteWithdrawal}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
