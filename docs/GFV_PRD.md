# GFV - Product Requirements Document (PRD)

## 1. Visão Geral

O GFV é um sistema web para substituir uma planilha de gerenciamento de
operações de apostas esportivas. O objetivo é automatizar cálculos,
controlar saldo das casas, registrar operações, gerar dashboards e
relatórios.

## 2. Objetivos

-   Eliminar controles manuais.
-   Centralizar todas as operações.
-   Atualizar saldos automaticamente.
-   Exibir indicadores financeiros em tempo real.
-   Permitir expansão futura.

## 3. Stack

-   Frontend: React + TypeScript + Tailwind + shadcn/ui
-   Backend: Supabase
-   Banco: PostgreSQL
-   Autenticação: Supabase Auth

## 4. Módulos

-   Dashboard
-   Operações
-   Casas de Apostas
-   Depósitos
-   Saques
-   Calculadoras
-   Histórico
-   Relatórios
-   Configurações

## 5. Dashboard

Cards: - Lucro do dia - Lucro da semana - Lucro do mês - ROI - Total
apostado - Total retornado - Saldo da caixa - Saldo total nas casas -
Operações realizadas

Gráficos: - Evolução da banca - Lucro por dia - Lucro por casa -
Distribuição por casa

## 6. Casas de Apostas

Campos: - Nome - Logo - Cor - Saldo - Status - Observações

Regras: - Nunca permitir saldo negativo. - Atualização automática após
operações, depósitos e saques.

## 7. Operações

Uma operação contém uma ou mais entradas.

Cabeçalho: - Data - Retorno desejado - Observações - Status

Entradas: - Casa - Mercado - Seleção - Tipo (Dinheiro Real ou Freebet) -
Odd - Valor Apostado

Cálculos: - Valor investido - Retorno bruto - Lucro líquido - ROI -
Total de dinheiro real - Total em freebets

## 8. Depósitos e Saques

Registrar: - Casa - Valor - Data - Observação

Atualizar saldos automaticamente.

## 9. Histórico

Filtros: - Período - Casa - Mercado - Tipo - Lucro

Exportação: - Excel - PDF - CSV

## 10. Calculadoras

-   Surebet
-   Freebet
-   Dutching
-   Lay

## 11. Banco de Dados

Tabelas: - users - houses - operations - operation_entries - deposits -
withdrawals - transfers - settings

Relacionamentos: - operation -\> many operation_entries - house -\> many
operation_entries - house -\> deposits/withdrawals

## 12. UX

Objetivo: registrar uma operação em menos de 1 minuto.

## 13. Roadmap

Fase 1: Autenticação + Layout Fase 2: Casas Fase 3: Operações Fase 4:
Dashboard Fase 5: Histórico Fase 6: Relatórios Fase 7: Calculadoras
