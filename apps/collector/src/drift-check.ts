import { ConsensusCollector } from '@monitor-sefaz/core';
import { Catalog, DEFAULT_MIN_COVERAGE_RATIO } from '@monitor-sefaz/catalog';
import { evaluateDrift } from './driftCheck.js';

/**
 * Guard de drift AO VIVO. Faz uma coleta real (1 fetch por fonte), avalia a saúde
 * por fonte e reporta se alguma fonte OFICIAL veio degradada — o drift de HTML do
 * portal que as fixtures estáticas não pegam.
 *
 * Sai com código 1 quando detecta drift, para o workflow poder sinalizar. O
 * workflow que o invoca é NON-BLOCKING (continue-on-error), separado do pipeline
 * de coleta/deploy — este check nunca deve derrubar a publicação.
 */
async function main(): Promise<void> {
  const ratio = Number(process.env.MIN_COVERAGE_RATIO ?? DEFAULT_MIN_COVERAGE_RATIO);
  const collector = ConsensusCollector.createForNode(new Catalog(), ratio);
  const { sources } = await collector.collectWithDiagnostics();

  const report = evaluateDrift(sources);
  console.log('Diagnóstico de cobertura por fonte (coleta ao vivo):');
  for (const line of report.lines) {
    console.log(line);
  }

  if (report.drift) {
    console.error(
      `\n⚠️  DRIFT: fonte(s) oficial(is) degradada(s): ${report.degradedOfficial.join(', ')}.` +
        ` Provável mudança de HTML do portal — verifique os parsers.`
    );
    process.exit(1);
  }
  console.log('\n✅ Sem drift: todas as fontes oficiais acima do piso de cobertura.');
}

void main();
