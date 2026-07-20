import { useState, useEffect, useCallback } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, MessageSquare, Crown, Clock, Users, Mail, Phone, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

type AdminUser = {
  id: string
  email: string | null
  phone: string | null
  status_badge: 'lead' | 'cliente' | 'expirado'
  is_lifetime: boolean
  is_admin: boolean
  trial_started_at: string | null
  expires_at: string | null
  registration_completed: boolean
  created_at: string
}

type Feedback = Database['public']['Tables']['feedbacks']['Row']
type Lead = Database['public']['Tables']['leads']['Row']

const SUPPORT_WHATSAPP = '5599999999999'
const TRIAL_DAYS = 3

function formatPhoneForWhatsApp(phone: string | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

function getTrialRemaining(user: AdminUser): string {
  if (user.is_lifetime) return 'Vitalício'
  if (user.status_badge === 'cliente' && user.expires_at) {
    const diff = new Date(user.expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expirado'
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return `${days} dias restantes`
  }
  if (user.status_badge === 'expirado') return 'Expirado'
  if (user.trial_started_at) {
    const trialEnd = new Date(user.trial_started_at)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
    const diff = trialEnd.getTime() - Date.now()
    if (diff <= 0) return 'Trial expirado'
    const hours = Math.ceil(diff / (1000 * 60 * 60))
    return `${hours}h restantes`
  }
  return 'Sem trial'
}

function getWhatsAppMessage(user: AdminUser): string {
  const email = user.email ?? ''
  if (user.status_badge === 'lead' && user.trial_started_at) {
    const trialEnd = new Date(user.trial_started_at)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)
    const diff = trialEnd.getTime() - Date.now()
    if (diff > 0 && diff < 1000 * 60 * 60 * 24) {
      return `Olá! Vi que seu trial no GFV está prestes a expirar. Que tal ativar o Plano Pro agora e não perder o ritmo? Seu e-mail é ${email}.`
    }
    if (diff <= 0) {
      return `Olá! Seu trial de 3 dias no GFV expirou. Vamos ativar seu Plano Pro? Seu e-mail é ${email}.`
    }
  }
  if (user.status_badge === 'cliente' && user.expires_at) {
    const diff = new Date(user.expires_at).getTime() - Date.now()
    if (diff > 0 && diff < 1000 * 60 * 60 * 24 * 5) {
      return `Olá! Seu plano Pro no GFV está próximo de expirar. Renove agora e continue operando sem interrupções. Seu e-mail é ${email}.`
    }
    if (diff <= 0) {
      return `Olá! Seu plano Pro no GFV expirou. Vamos renovar? Seu e-mail é ${email}.`
    }
  }
  return `Olá! Tudo bem? Sou da equipe GFV e gostaria de conversar sobre seu acesso. Seu e-mail é ${email}.`
}

function getWhatsAppUrl(user: AdminUser): string {
  const phone = formatPhoneForWhatsApp(user.phone)
  const message = encodeURIComponent(getWhatsAppMessage(user))
  if (phone) return `https://wa.me/${phone}?text=${message}`
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`
}

export function Admin() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: usersData, error: usersError }, { data: fbData, error: fbError }, { data: leadsData, error: leadsError }] = await Promise.all([
        supabase.rpc('get_all_users_for_admin'),
        supabase.from('feedbacks').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
      ])
      if (usersError) throw usersError
      if (fbError) throw fbError
      if (leadsError) throw leadsError
      setUsers(usersData ?? [])
      setFeedbacks(fbData ?? [])
      setLeads(leadsData ?? [])
    } catch (err) {
      console.error('Error loading admin data:', err)
      toast.error('Erro ao carregar dados do admin')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateStatus = async (userId: string, status: 'lead' | 'cliente' | 'expirado') => {
    try {
      const updateData: Record<string, unknown> = { status_badge: status }
      if (status === 'cliente') {
        const expires = new Date()
        expires.setDate(expires.getDate() + 30)
        updateData.expires_at = expires.toISOString()
      }
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId)
      if (error) throw error
      toast.success('Status atualizado')
      loadData()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const toggleLifetime = async (userId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_lifetime: !current })
        .eq('id', userId)
      if (error) throw error
      toast.success(!current ? 'Acesso vitalício ativado' : 'Acesso vitalício desativado')
      loadData()
    } catch {
      toast.error('Erro ao atualizar acesso vitalício')
    }
  }

  const toggleAdmin = async (userId: string, current: boolean) => {
    if (current) {
      const adminCount = users.filter(u => u.is_admin).length
      if (adminCount <= 1) {
        toast.error('Não é possível remover o último administrador')
        return
      }
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !current })
        .eq('id', userId)
      if (error) throw error
      toast.success(!current ? 'Administrador promovido' : 'Administrador removido')
      loadData()
    } catch {
      toast.error('Erro ao atualizar permissão de administrador')
    }
  }

  const exportCSV = () => {
    const headers = ['Email', 'WhatsApp']
    const rows = users
      .filter(u => u.email || u.phone)
      .map(u => [u.email ?? '', u.phone ?? ''])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contatos-gfv.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Contatos exportados')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const leadCount = users.filter(u => u.status_badge === 'lead').length
  const clienteCount = users.filter(u => u.status_badge === 'cliente').length
  const expiredCount = users.filter(u => u.status_badge === 'expirado').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1">Gerencie usuários, acessos e feedbacks do sistema.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{leadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Crown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clienteCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="leads">Leads Abandonados ({leads.filter(l => l.status === 'abandoned').length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Feedbacks ({feedbacks.length})</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usuários Cadastrados</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trial / Plano</TableHead>
                    <TableHead>Vitalício</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{u.email ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{u.phone ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.status_badge === 'cliente' ? 'success' :
                              u.status_badge === 'expirado' ? 'destructive' : 'warning'
                            }
                          >
                            {u.status_badge}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{getTrialRemaining(u)}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleLifetime(u.id, u.is_lifetime)}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              ${u.is_lifetime ? 'bg-blue-600' : 'bg-muted'}
                            `}
                          >
                            <span className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${u.is_lifetime ? 'translate-x-6' : 'translate-x-1'}
                            `} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleAdmin(u.id, u.is_admin)}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              ${u.is_admin ? 'bg-amber-500' : 'bg-muted'}
                            `}
                            title={u.is_admin ? 'Remover admin' : 'Promover a admin'}
                          >
                            <span className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${u.is_admin ? 'translate-x-6' : 'translate-x-1'}
                            `} />
                          </button>
                          {u.is_admin && (
                            <ShieldCheck className="inline-block ml-1.5 h-3.5 w-3.5 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={u.status_badge}
                              onValueChange={(v) => updateStatus(u.id, v as 'lead' | 'cliente' | 'expirado')}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="cliente">Cliente</SelectItem>
                                <SelectItem value="expirado">Expirado</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button asChild size="sm" variant="outline">
                              <a href={getWhatsAppUrl(u)} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads Abandonados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.filter(l => l.status === 'abandoned').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum lead abandonado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.filter(l => l.status === 'abandoned').map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{l.email ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{l.phone ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">{l.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(l.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedbacks Tab */}
        <TabsContent value="feedbacks">
          <Card>
            <CardHeader>
              <CardTitle>Feedbacks Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              {feedbacks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum feedback recebido.</p>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((fb) => (
                    <div key={fb.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{fb.user_email}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fb.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
