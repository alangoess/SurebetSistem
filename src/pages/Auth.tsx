import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, ShieldCheck, BarChart3, Wallet, Target, Zap } from 'lucide-react'
import { toast } from 'sonner'

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function Auth() {
  const { signUp, signIn, captureLead, completeRegistration } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadCaptured, setLeadCaptured] = useState(false)

  const handleLeadCapture = async () => {
    if (!email && !phone) return
    if (leadCaptured) return
    const { error } = await captureLead(email, phone)
    if (!error) setLeadCaptured(true)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !phone) {
      setError('Preencha e-mail e WhatsApp para continuar.')
      return
    }
    setError(null)
    setLoading(true)
    await handleLeadCapture()
    setLoading(false)
    setStep(2)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await completeRegistration(email, phone)
    setLoading(false)
    toast.success('Conta criada! Seu trial de 3 dias começou.')
  }

  const resetSignup = () => {
    setStep(1)
    setEmail('')
    setPhone('')
    setPassword('')
    setError(null)
    setLeadCaptured(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left banner */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,197,94,0.2) 0%, transparent 50%)`
        }} />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">GFV</h1>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Controle sua banca<br />como um profissional
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-md">
            O sistema completo de gestão de apostas que multiplica seus greens e elimina o caos da planilha.
          </p>
          <div className="space-y-4">
            {[
              { icon: Target, text: 'Surebets calculadas automaticamente' },
              { icon: Wallet, text: 'Saldo de cada casa atualizado em tempo real' },
              { icon: BarChart3, text: 'Relatórios e análises detalhadas' },
              { icon: ShieldCheck, text: 'Seus dados protegidos com segurança' },
              { icon: Zap, text: 'Lucros extras e operações organizadas' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-slate-200">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">GFV</CardTitle>
            <CardDescription>Sistema de Gestão de Apostas</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'signin' | 'signup'); resetSignup() }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up - Step 1: Lead Capture */}
              <TabsContent value="signup">
                {step === 1 ? (
                  <form onSubmit={handleStep1Next} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <Input
                        id="email-signup"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={handleLeadCapture}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone-signup">WhatsApp</Label>
                      <Input
                        id="phone-signup"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                        onBlur={handleLeadCapture}
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      Avançar
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Seus dados são salvos automaticamente. Continue para criar sua senha.
                    </p>
                  </form>
                ) : (
                  /* Step 2: Password */
                  <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{email}</span>
                        <button type="button" onClick={() => setStep(1)} className="text-primary hover:underline text-xs">
                          Editar
                        </button>
                      </div>
                      <div className="text-muted-foreground mt-1">{phone}</div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Senha</Label>
                      <Input
                        id="password-signup"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoFocus
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Conta'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Ao criar a conta, seu trial gratuito de 3 dias começa automaticamente.
                    </p>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
