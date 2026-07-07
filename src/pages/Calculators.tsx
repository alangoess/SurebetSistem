import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, Percent, DollarSign, TrendingUp } from 'lucide-react'

export function Calculators() {
  // Surebet Calculator
  const [surebetOdds, setSurebetOdds] = useState(['', ''])
  const [surebetStake, setSurebetStake] = useState('')
  const [surebetResult, setSurebetResult] = useState<{
    stakes: number[]
    totalStake: number
    profit: number
    profitPercent: number
    isArbitrage: boolean
  } | null>(null)

  const calculateSurebet = () => {
    const odds = surebetOdds.map((o) => parseFloat(o)).filter((o) => !isNaN(o) && o > 1)
    if (odds.length < 2) return

    const totalImplied = odds.reduce((sum, o) => sum + 1 / o, 0)
    const isArbitrage = totalImplied < 1
    const stake = parseFloat(surebetStake) || 100

    const stakes = odds.map((o) => (stake / o) / totalImplied)
    const totalStake = stakes.reduce((sum, s) => sum + s, 0)
    const guaranteedReturn = Math.min(...odds.map((o, i) => stakes[i] * o))
    const profit = guaranteedReturn - totalStake
    const profitPercent = (profit / totalStake) * 100

    setSurebetResult({
      stakes,
      totalStake,
      profit: isArbitrage ? profit : -profit,
      profitPercent: isArbitrage ? profitPercent : -profitPercent,
      isArbitrage,
    })
  }

  // Freebet Calculator
  const [freebetOdds, setFreebetOdds] = useState(['', ''])
  const [freebetAmount, setFreebetAmount] = useState('')
  const [freebetResult, setFreebetResult] = useState<{
    stakes: number[]
    guaranteedProfit: number
    freebetValue: number
  } | null>(null)

  const calculateFreebet = () => {
    const odds = freebetOdds.map((o) => parseFloat(o)).filter((o) => !isNaN(o) && o > 1)
    if (odds.length < 2) return

    const freebet = parseFloat(freebetAmount) || 100
    const backOdd = odds[0]
    const layOdd = odds[1] || odds[0]

    // Simplified freebet calculation
    const backStake = freebet
    const layStake = (backStake * (backOdd - 1)) / (layOdd - 1)

    const guaranteedProfit = Math.min(
      backStake * (backOdd - 1),
      layStake * (layOdd - 1)
    )

    // For a proper freebet, the guaranteed profit is roughly freebet * (odd - 1) / odd
    const freebetValue = freebet * (backOdd - 1) / backOdd

    setFreebetResult({
      stakes: [backStake, layStake],
      guaranteedProfit: freebetValue,
      freebetValue,
    })
  }

  // Dutching Calculator
  const [dutchingOdds, setDutchingOdds] = useState(['', ''])
  const [dutchingStake, setDutchingStake] = useState('')
  const [dutchingResult, setDutchingResult] = useState<{
    stakes: number[]
    returns: number[]
    guaranteedReturn: number
  } | null>(null)

  const calculateDutching = () => {
    const odds = dutchingOdds.map((o) => parseFloat(o)).filter((o) => !isNaN(o) && o > 1)
    if (odds.length < 2) return

    const totalStake = parseFloat(dutchingStake) || 100

    // Calculate inverse odds
    const inverseOdds = odds.map((o) => 1 / o)
    const totalInverse = inverseOdds.reduce((sum, io) => sum + io, 0)

    // Calculate stakes proportionally
    const stakes = inverseOdds.map((io) => (io / totalInverse) * totalStake)
    const returns = odds.map((o, i) => stakes[i] * o)
    const guaranteedReturn = Math.min(...returns)

    setDutchingResult({
      stakes,
      returns,
      guaranteedReturn,
    })
  }

  // Lay Calculator
  const [layBackOdd, setLayBackOdd] = useState('')
  const [layLayOdd, setLayLayOdd] = useState('')
  const [layBackStake, setLayBackStake] = useState('')
  const [layCommission, setLayCommission] = useState('5')
  const [layResult, setLayResult] = useState<{
    layStake: number
    liability: number
    backProfit: number
    layProfit: number
    guaranteedProfit: number
  } | null>(null)

  const calculateLay = () => {
    const backOdd = parseFloat(layBackOdd)
    const layOdd = parseFloat(layLayOdd) || backOdd * 1.05
    const backStake = parseFloat(layBackStake) || 100
    const commission = parseFloat(layCommission) || 5

    if (!backOdd || backOdd <= 1) return

    // Calculate lay stake for equal profit
    const layStake = (backStake * backOdd) / (layOdd - commission / 100)
    const liability = layStake * (layOdd - 1)

    const backProfit = backStake * (backOdd - 1)
    const layProfit = layStake * (1 - commission / 100)

    const guaranteedProfit = Math.min(backProfit, layProfit)

    setLayResult({
      layStake,
      liability,
      backProfit: backStake * (backOdd - 1),
      layProfit,
      guaranteedProfit,
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calculadoras</h1>
        <p className="text-muted-foreground">Ferramentas para cálculos de apostas</p>
      </div>

      <Tabs defaultValue="surebet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="surebet">Surebet</TabsTrigger>
          <TabsTrigger value="freebet">Freebet</TabsTrigger>
          <TabsTrigger value="dutching">Dutching</TabsTrigger>
          <TabsTrigger value="lay">Lay</TabsTrigger>
        </TabsList>

        {/* Surebet Calculator */}
        <TabsContent value="surebet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Surebet
              </CardTitle>
              <CardDescription>
                Calcule stakes para oportunidades de arbitragem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {surebetOdds.map((odd, index) => (
                  <div key={index} className="space-y-2">
                    <Label>Odd {index + 1}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={odd}
                      onChange={(e) => {
                        const newOdds = [...surebetOdds]
                        newOdds[index] = e.target.value
                        setSurebetOdds(newOdds)
                      }}
                      placeholder="Ex: 2.10"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSurebetOdds([...surebetOdds, ''])}
                  disabled={surebetOdds.length >= 6}
                  className="mt-6"
                >
                  + Adicionar Odd
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Stake Total (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={surebetStake}
                  onChange={(e) => setSurebetStake(e.target.value)}
                  placeholder="100.00"
                />
              </div>

              <Button onClick={calculateSurebet}>Calcular</Button>

              {surebetResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Badge variant={surebetResult.isArbitrage ? 'success' : 'destructive'}>
                      {surebetResult.isArbitrage ? 'ARBITRAGEM DETECTADA' : 'SEM ARBITRAGEM'}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Stakes Individuais</Label>
                      <div className="space-y-1 mt-2">
                        {surebetResult.stakes.map((stake, i) => (
                          <div key={i} className="flex justify-between">
                            <span>Resultado {i + 1}:</span>
                            <span className="font-medium">{formatCurrency(stake)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stake Total:</span>
                        <span className="font-medium">{formatCurrency(surebetResult.totalStake)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lucro Garantido:</span>
                        <span className={`font-bold ${surebetResult.isArbitrage ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(surebetResult.profit))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ROI:</span>
                        <span className={`font-bold ${surebetResult.isArbitrage ? 'text-green-600' : 'text-red-600'}`}>
                          {surebetResult.profitPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Freebet Calculator */}
        <TabsContent value="freebet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Calculadora de Freebet
              </CardTitle>
              <CardDescription>
                Maximize o valor de suas freebets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Odd Back</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={freebetOdds[0]}
                    onChange={(e) => {
                      const newOdds = [...freebetOdds]
                      newOdds[0] = e.target.value
                      setFreebetOdds(newOdds)
                    }}
                    placeholder="Ex: 3.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Odd Lay (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={freebetOdds[1]}
                    onChange={(e) => {
                      const newOdds = [...freebetOdds]
                      newOdds[1] = e.target.value
                      setFreebetOdds(newOdds)
                    }}
                    placeholder="Ex: 3.10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da Freebet</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={freebetAmount}
                  onChange={(e) => setFreebetAmount(e.target.value)}
                  placeholder="100.00"
                />
              </div>

              <Button onClick={calculateFreebet}>Calcular</Button>

              {freebetResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stake Back:</span>
                        <span className="font-medium">{formatCurrency(freebetResult.stakes[0])}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stake Lay:</span>
                        <span className="font-medium">{formatCurrency(freebetResult.stakes[1])}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lucro Garantido:</span>
                        <span className="font-bold text-green-600">{formatCurrency(freebetResult.guaranteedProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Real da Freebet:</span>
                        <span className="font-bold text-green-600">{formatCurrency(freebetResult.freebetValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dutching Calculator */}
        <TabsContent value="dutching">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Calculadora de Dutching
              </CardTitle>
              <CardDescription>
                Distribua stakes entre múltiplas seleções
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {dutchingOdds.map((odd, index) => (
                  <div key={index} className="space-y-2">
                    <Label>Odd {index + 1}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={odd}
                      onChange={(e) => {
                        const newOdds = [...dutchingOdds]
                        newOdds[index] = e.target.value
                        setDutchingOdds(newOdds)
                      }}
                      placeholder="Ex: 2.50"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDutchingOdds([...dutchingOdds, ''])}
                  disabled={dutchingOdds.length >= 6}
                  className="mt-6"
                >
                  + Adicionar Odd
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Stake Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dutchingStake}
                  onChange={(e) => setDutchingStake(e.target.value)}
                  placeholder="100.00"
                />
              </div>

              <Button onClick={calculateDutching}>Calcular</Button>

              {dutchingResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Stakes Individuais</Label>
                      <div className="space-y-1 mt-2">
                        {dutchingResult.stakes.map((stake, i) => (
                          <div key={i} className="flex justify-between">
                            <span>Seleção {i + 1}:</span>
                            <span className="font-medium">{formatCurrency(stake)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retorno por Seleção:</span>
                      </div>
                      {dutchingResult.returns.map((ret, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>Seleção {i + 1}:</span>
                          <span>{formatCurrency(ret)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Retorno Garantido:</span>
                        <span className="font-bold text-green-600">{formatCurrency(dutchingResult.guaranteedReturn)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lay Calculator */}
        <TabsContent value="lay">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Calculadora de Lay
              </CardTitle>
              <CardDescription>
                Calcule stakes para apostas lay em exchanges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Odd Back</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={layBackOdd}
                    onChange={(e) => setLayBackOdd(e.target.value)}
                    placeholder="Ex: 2.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Odd Lay</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={layLayOdd}
                    onChange={(e) => setLayLayOdd(e.target.value)}
                    placeholder="Ex: 2.10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stake Back</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={layBackStake}
                    onChange={(e) => setLayBackStake(e.target.value)}
                    placeholder="100.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comissão da Exchange (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={layCommission}
                    onChange={(e) => setLayCommission(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>

              <Button onClick={calculateLay}>Calcular</Button>

              {layResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stake Lay:</span>
                        <span className="font-medium">{formatCurrency(layResult.layStake)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Responsabilidade:</span>
                        <span className="font-medium">{formatCurrency(layResult.liability)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lucro se Back ganhar:</span>
                        <span className="font-medium">{formatCurrency(layResult.backProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lucro se Lay ganhar:</span>
                        <span className="font-medium">{formatCurrency(layResult.layProfit)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Lucro Garantido:</span>
                        <span className="font-bold text-green-600">{formatCurrency(layResult.guaranteedProfit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
