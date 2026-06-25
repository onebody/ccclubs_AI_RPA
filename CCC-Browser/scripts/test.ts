import { AutomationEngine } from '../src/core/AutomationEngine';
import { Logger } from '../src/logger/Logger';

const logger = Logger.getInstance();

async function runTests() {
  logger.info('=== Automation Tool Tests Started ===');

  const engine = new AutomationEngine();

  const tests = [
    {
      name: 'Start automation engine',
      run: async () => await engine.start(),
    },
    {
      name: 'Stop automation engine',
      run: async () => await engine.stop(),
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    logger.info('Test: ' + test.name);
    try {
      const result = await test.run();
      if (result.success) {
        logger.info('Passed');
        passed++;
      } else {
        logger.error('Failed: ' + result.error);
        failed++;
      }
    } catch (error) {
      logger.error('Failed: ' + (error as Error).message);
      failed++;
    }
  }

  logger.info('=== Tests Completed ===');
  logger.info('Passed: ' + passed + ', Failed: ' + failed);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test run failed:', error);
  process.exit(1);
});
