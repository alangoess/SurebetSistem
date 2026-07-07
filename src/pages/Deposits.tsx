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
import { Plus, Pencil, Trash2, ArrowDownToLine } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface House {
  id: string
  name: string
  color: string
  balance: number
}

interface Deposit {
  id: string
  house_id: string
  amount: number
  date: string
  notes: string | null
  house?: House
}

export function Deposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null)
  const [depositToDelete, setDepositToDelete] = useState<Deposit | null>(null)
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
      const [depositsRes, housesRes] = await Promise.all([
        supabase
          .from('deposits')
          .select('*')
          .order('date', { ascending: false }),
        supabase.from('houses').select('id, name, color, balance'),
      ])

      if (depositsRes.data) {
        const formatted = depositsRes.data.map((d) => ({
          ...d,
          house: housesRes.data?.find((h) => h.id === d.house_id),
        }))
        setDeposits(formatted)
      }
      if (housesRes.data) setHouses(housesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (deposit?: Deposit) => {
    if (deposit) {
      setEditingDeposit(deposit)
      setFormData({
        house_id: deposit.house_id,
        amount: deposit.amount.toString(),
        date: deposit.date,
        notes: deposit.notes || '',
      })
    } else {
      setEditingDeposit(null)
      setFormData({
        house_id: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const saveDeposit = async () => {
    try {
      const amount = parseFloat(formData.amount)
      if (!amount || amount <= 0) {
        alert('Valor deve ser maior que zero')
        return
      }

      // Get current house balance
      const house = houses.find((h) => h.id === formData.house_id)
      if (!house) return

      if (editingDeposit) {
        // Calculate difference
        const diff = amount - editingDeposit.amount
        const newBalance = house.balance + diff

        if (newBalance < 0) {
          alert('Saldo não pode ficar negativo')
          return
        }

        // Update deposit
        const { error: depError } = await supabase
          .from('deposits')
          .update({
            house_id: formData.house_id,
            amount,
            date: formData.date,
            notes: formData.notes || null,
          })
          .eq('id', editingDeposit.id)

        if (depError) throw depError

        // Update house balance
        const { error: houseError } = await supabase
          .from('houses')
          .update({ balance: newBalance })
          .eq('id', formData.house_id)

        if (houseError) throw houseError
      } else {
        // Create deposit
        const { error: depError } = await supabase.from('deposits').insert({
          house_id: formData.house_id,
          amount,
          date: formData.date,
          notes: formData.notes || null,
        })

        if (depError) throw depError

        // Update house balance
        const { error: houseError } = await supabase
          .from('houses')
          .update({ balance: house.balance + amount })
          .eq('id', formData.house_id)

        if (houseError) throw houseError
      }

      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving deposit:', error)
      alert('Erro ao salvar depósito')
    }
  }

  const confirmDelete = (deposit: Deposit) => {
    setDepositToDelete(deposit)
    setDeleteDialogOpen(true)
  }

  const deleteDeposit = async () => {
    if (!depositToDelete) return

    try {
      const house = houses.find((h) => h.id === depositToDelete.house_id)
      if (!house) return

      const newBalance = house.balance - depositToDelete.amount
      if (newBalance < 0) {
        alert('Não é possível excluir: saldo ficaria negativo')
        setDeleteDialogOpen(false)
        return
      }

      // Delete deposit
      const { error: depError } = await supabase
        .from('deposits')
        .delete()
        .eq('id', depositToDelete.id)

      if (depError) throw depError

      // Update house balance
      const { error: houseError } = await supabase
        .from('houses')
        .update({ balance: newBalance })
        .eq('id', depositToDelete.house_id)

      if (houseError) throw houseError

      setDeleteDialogOpen(false)
      setDepositToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting deposit:', error)
      alert('Erro ao excluir depósito')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0)

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
          <h1 className="text-3xl font-bold">Depósitos</h1>
          <p className="text-muted-foreground">Gerencie depósitos nas casas</p>
        </div>
        <Button onClick={() => openDialog()} disabled={houses.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Depósito
        </Button>
      </div>

      {houses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">
              Cadastre uma casa de apostas antes de realizar depósitos
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Depósitos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Depósitos este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(
                deposits
                  .filter((d) => {
                    const date = new Date(d.date)
                    const now = new Date()
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                  })
                  .reduce((sum, d) => sum + d.amount, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{deposits.length}</p>
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
            {deposits.map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell>
                  {format(new Date(deposit.date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: deposit.house?.color || '#CCC' }}
                    />
                    {deposit.house?.name || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatCurrency(deposit.amount)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {deposit.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(deposit)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(deposit)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {deposits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum depósito registrado
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
              {editingDeposit ? 'Editar Depósito' : 'Novo Depósito'}
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
              onClick={saveDeposit}
              disabled={!formData.house_id || !formData.amount || parseFloat(formData.amount) <= 0}
            >
              {editingDeposit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Depósito</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir este depósito de {formatCurrency(depositToDelete?.amount || 0)}?
            O saldo da casa será atualizado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteDeposit}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
