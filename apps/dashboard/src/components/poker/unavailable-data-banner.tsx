/**
 * Banner that shows where data is not yet available from the PPPoker API.
 * Displayed on pages that previously showed rake, chip balance, or transaction history.
 */
export function UnavailableDataBanner() {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
          i
        </div>
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Dados em breve
          </p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
            Rake detalhado, saldo de fichas em tempo real e histórico de
            transações estão sendo integrados diretamente da API PPPoker.
            Esses dados estarão disponíveis em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
