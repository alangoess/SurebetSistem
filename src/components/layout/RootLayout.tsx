import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Building2,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  FileText,
  Calculator,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  Star,
  Moon,
  Sun,
  MessageSquare,
  Shield,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const SUPPORT_WHATSAPP = '5599999999999'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/houses', label: 'Casas', icon: Building2 },
  { to: '/operations', label: 'Operações', icon: Receipt },
  { to: '/extra-profits', label: 'Lucros Extras', icon: Star },
  { to: '/cash', label: 'Caixa', icon: Wallet },
  { to: '/deposits', label: 'Depósitos', icon: ArrowDownToLine },
  { to: '/withdrawals', label: 'Saques', icon: ArrowUpFromLine },
  { to: '/history', label: 'Histórico', icon: History },
  { to: '/reports', label: 'Relatórios', icon: FileText },
  { to: '/calculators', label: 'Calculadoras', icon: Calculator },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function TrialBlockedScreen({ email }: { email: string }) {
  const message = encodeURIComponent(
    `Olá! Testei o sistema de gestão de banca por 3 dias, gostei muito e quero fechar o plano Pro. Meu e-mail é: ${email}`
  )
  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
          <Lock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Seu período de teste terminou</h1>
          <p className="text-muted-foreground">
            Você aproveitou seu trial gratuito de 3 dias. Para continuar usando todos os recursos do GFV, ative o Plano Pro.
          </p>
        </div>
        <Button asChild size="lg" className="w-full text-base h-14 bg-green-600 hover:bg-green-700 text-white">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageSquare className="mr-2 h-5 w-5" />
            Falar com o Suporte no WhatsApp
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Ative o Plano Pro em poucos minutos e volte a operar.
        </p>
      </div>
    </div>
  )
}

function FeedbackModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? 'unknown',
        message: message.trim(),
      })
      if (error) throw error
      toast.success('Feedback enviado! Obrigado.')
      setMessage('')
      onOpenChange(false)
    } catch {
      toast.error('Erro ao enviar feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar Bug / Feedback</DialogTitle>
          <DialogDescription>
            Encontrou um problema ou tem uma sugestão? Conte para nós.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="feedback-message">Mensagem</Label>
          <Textarea
            id="feedback-message"
            placeholder="Descreva o problema ou sugestão..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RootLayout() {
  const { user, profile, isAdmin, isBlocked, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Block access if trial expired and not on admin page
  if (isBlocked && !isAdmin && !location.pathname.startsWith('/admin')) {
    return <TrialBlockedScreen email={user?.email ?? ''} />
  }

  const allNavItems = isAdmin
    ? [...navItems, { to: '/admin', label: 'Admin', icon: Shield }]
    : navItems

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <h1 className="ml-4 text-xl font-bold">GFV</h1>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b">
            <h1 className="text-xl font-bold text-primary">GFV</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="hidden lg:flex"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {allNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}

            <button
              onClick={() => { setFeedbackOpen(true); setSidebarOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <MessageSquare className="h-5 w-5" />
              Reportar Bug / Feedback
            </button>
          </nav>

          <div className="p-4 border-t space-y-2">
            {profile?.status_badge === 'lead' && !profile?.is_lifetime && (
              <div className="px-3 py-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs">
                Trial ativo
              </div>
            )}
            {profile?.status_badge === 'cliente' && !profile?.is_lifetime && profile?.expires_at && (
              <div className="px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                Plano Pro ativo
              </div>
            )}
            {profile?.is_lifetime && (
              <div className="px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs">
                Acesso Vitalício
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
              {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={signOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}
