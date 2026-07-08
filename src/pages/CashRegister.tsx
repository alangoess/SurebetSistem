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
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface BankTransaction {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  date: string
  description: string | null
}

export function CashRegister() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<BankTransaction | null>(null)
  const [formData, setFormData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (transaction?: BankTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        date: transaction.date,
        description: transaction.description || '',
      })
    } else {
      setEditingTransaction(null)
      setFormData({
        type: 'deposit',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      })
    }
    setDialogOpen(true)
  }

  const saveTransaction = async () => {
    try {
      const amount = parseFloat(formData.amount)
      if (!amount || amount <= 0) {
        toast.error('Valor deve ser maior que zero')
        return
      }

      const transactionData = {
        type: formData.type,
        amount,
        date: formData.date,
        description: formData.description || null,
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('bank_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bank_transactions')
          .insert(transactionData)

        if (error) throw error
      }

      setDialogOpen(false)
      loadData()
      toast.success('Transação salva com sucesso')
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error('Erro ao salvar transação')
    }
  }

  const confirmDelete = (transaction: BankTransaction) => {
    setTransactionToDelete(transaction)
    setDeleteDialogOpen(true)
  }

  const deleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', transactionToDelete.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
      loadData()
      toast.success('Transação excluída')
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast.error('Erro ao excluir transação')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Calculate balance
  const currentBalance = transactions.reduce((balance, t) => {
    if (t.type === 'deposit') {
      return balance + t.amount
    }
    return balance - t.amount
  }, 0)

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0)

  // Monthly totals
  const now = new Date()
  const monthlyDeposits = transactions
    .filter(t => {
      const date = parseISO(t.date)
      return t.type === 'deposit' &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const monthlyWithdrawals = transactions
    .filter(t => {
      const date = parseISO(t.date)
      return t.type === 'withdrawal' &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + t.amount, 0)

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
          <h1 className="text-3xl font-bold">Caixa</h1>
          <p className="text-muted-foreground">Gerencie entradas e saídas da conta bancária</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDeposits)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalWithdrawals)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">+{formatCurrency(monthlyDeposits)}</span>
                <span className="text-red-600">-{formatCurrency(monthlyWithdrawals)}</span>
              </div>
              <p className={`font-bold ${monthlyDeposits - monthlyWithdrawals >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyDeposits - monthlyWithdrawals)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              let runningBalance = 0
              return transactions.map((transaction) => {
                if (transaction.type === 'deposit') {
                  runningBalance += transaction.amount
                } else {
                  runningBalance -= transaction.amount
                }
                const rowBalance = runningBalance

                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'deposit' ? 'success' : 'destructive'}>
                        {transaction.type === 'deposit' ? (
                          <><ArrowDownToLine className="mr-1 h-3 w-3" /> Entrada</>
                        ) : (
                          <><ArrowUpFromLine className="mr-1 h-3 w-3" /> Saída</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${rowBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(rowBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(transaction)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            })()}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação registrada
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
              {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'deposit' | 'withdrawal') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4 text-green-600" />
                      Entrada (Depósito)
                    </div>
                  </SelectItem>
                  <SelectItem value="withdrawal">
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                      Saída (Saque/Retirada)
                    </div>
                  </SelectItem>
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
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Transferência bancária, PIX, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveTransaction}
              disabled={!formData.amount || parseFloat(formData.amount) <= 0}
            >
              {editingTransaction ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Transação</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir esta transação de{' '}
            <span className={transactionToDelete?.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
              {transactionToDelete?.type === 'deposit' ? '+' : '-'}
              {formatCurrency(transactionToDelete?.amount || 0)}
            </span>
            ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteTransaction}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
