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
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

interface House {
  id: string
  name: string
  logo_url: string | null
  color: string
  balance: number
  status: string
  notes: string | null
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
]

export function Houses() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingHouse, setEditingHouse] = useState<House | null>(null)
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    color: PRESET_COLORS[0],
    balance: 0,
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    loadHouses()
  }, [])

  const loadHouses = async () => {
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setHouses(data || [])
    } catch (error) {
      console.error('Error loading houses:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (house?: House) => {
    if (house) {
      setEditingHouse(house)
      setFormData({
        name: house.name,
        logo_url: house.logo_url || '',
        color: house.color,
        balance: house.balance,
        status: house.status,
        notes: house.notes || '',
      })
    } else {
      setEditingHouse(null)
      setFormData({
        name: '',
        logo_url: '',
        color: PRESET_COLORS[0],
        balance: 0,
        status: 'active',
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const saveHouse = async () => {
    try {
      if (editingHouse) {
        const { error } = await supabase
          .from('houses')
          .update({
            name: formData.name,
            logo_url: formData.logo_url || null,
            color: formData.color,
            balance: formData.balance,
            status: formData.status,
            notes: formData.notes || null,
          })
          .eq('id', editingHouse.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('houses').insert({
          name: formData.name,
          logo_url: formData.logo_url || null,
          color: formData.color,
          balance: formData.balance,
          status: formData.status,
          notes: formData.notes || null,
        })

        if (error) throw error
      }

      setDialogOpen(false)
      loadHouses()
    } catch (error) {
      console.error('Error saving house:', error)
      alert('Erro ao salvar casa')
    }
  }

  const confirmDelete = (house: House) => {
    setHouseToDelete(house)
    setDeleteDialogOpen(true)
  }

  const deleteHouse = async () => {
    if (!houseToDelete) return

    try {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', houseToDelete.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setHouseToDelete(null)
      loadHouses()
    } catch (error) {
      console.error('Error deleting house:', error)
      alert('Erro ao excluir casa')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
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
          <h1 className="text-3xl font-bold">Casas de Apostas</h1>
          <p className="text-muted-foreground">Gerencie suas casas de apostas</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Casa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <Card key={house.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: house.color }}
                >
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg">{house.name}</CardTitle>
              </div>
              <Badge variant={house.status === 'active' ? 'success' : 'secondary'}>
                {house.status === 'active' ? 'Ativa' : 'Inativa'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Saldo</span>
                  <span className="font-bold text-lg">{formatCurrency(house.balance)}</span>
                </div>
                {house.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{house.notes}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(house)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirmDelete(house)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {houses.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma casa cadastrada</p>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Casa
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHouse ? 'Editar Casa' : 'Nova Casa'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Bet365"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">URL do Logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-lg border-2 ${
                      formData.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
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
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={saveHouse} disabled={!formData.name}>
              {editingHouse ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Casa</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir a casa "{houseToDelete?.name}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteHouse}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
