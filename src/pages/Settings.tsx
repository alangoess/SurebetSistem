import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings as SettingsIcon, User, DollarSign, Save } from 'lucide-react'

interface Settings {
  id: string
  bankroll: number
  currency: string
}

export function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    bankroll: '',
    currency: 'BRL',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettings(data)
        setFormData({
          bankroll: data.bankroll.toString(),
          currency: data.currency,
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const bankroll = parseFloat(formData.bankroll) || 0

      if (settings) {
        const { error } = await supabase
          .from('settings')
          .update({
            bankroll,
            currency: formData.currency,
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('settings').insert({
          bankroll,
          currency: formData.currency,
        })

        if (error) throw error
      }

      loadSettings()
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: formData.currency,
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
          <CardDescription>Detalhes do seu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>ID do Usuário</Label>
              <Input value={user?.id || ''} disabled className="font-mono text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configurações Financeiras
          </CardTitle>
          <CardDescription>Defina sua banca e moeda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankroll">Banca Total</Label>
              <Input
                id="bankroll"
                type="number"
                step="0.01"
                value={formData.bankroll}
                onChange={(e) => setFormData({ ...formData, bankroll: e.target.value })}
                placeholder="10000.00"
              />
              <p className="text-sm text-muted-foreground">
                Valor total disponível para apostas
              </p>
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.bankroll && (
            <div className="p-4 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">Banca configurada:</p>
              <p className="text-2xl font-bold">{formatCurrency(parseFloat(formData.bankroll) || 0)}</p>
            </div>
          )}

          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Sobre o Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Versão:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Ambiente:</span>
            <span>Produção</span>
          </div>
          <div className="flex justify-between">
            <span>Banco de Dados:</span>
            <span className="text-green-600">Conectado</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
