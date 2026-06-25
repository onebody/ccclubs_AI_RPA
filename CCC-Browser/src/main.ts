import { AutomationEngine } from './core/AutomationEngine';
import { Logger } from './logger/Logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = Logger.getInstance();

async function main() {
  logger.info('=== CCC-Browser Automation Tool Started ===');

  const engine = new AutomationEngine();

  try {
    await engine.start();

    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    switch (command) {
      case 'login': {
        logger.info('Executing login...');
        const result = await engine.login();
        logger.info('Login result:', result);
        break;
      }
      case 'vehicles': {
        logger.info('Executing get vehicles...');
        const result = await engine.getVehicles();
        logger.info('Vehicles:', JSON.stringify(result.data, null, 2));
        break;
      }
      case 'violations': {
        logger.info('Executing get violations...');
        const result = await engine.getViolations();
        logger.info('Violations:', JSON.stringify(result.data, null, 2));
        break;
      }
      case 'search': {
        const plateNumber = args[1];
        if (!plateNumber) {
          logger.error('Please provide plate number');
          break;
        }
        logger.info('Searching violation for plate: ' + plateNumber);
        const result = await engine.searchViolation(plateNumber);
        logger.info('Search result:', JSON.stringify(result.data, null, 2));
        break;
      }
      case 'full': {
        logger.info('Executing full automation flow...');
        const result = await engine.executeFullFlow();
        if (result.success && result.data) {
          logger.info('Login status:', result.data.login);
          logger.info('Vehicle count:', result.data.vehicles.length);
          logger.info('Violation count:', result.data.violations.length);
        } else {
          logger.error('Flow failed:', result.error);
        }
        break;
      }
      default: {
        logger.error('Unknown command: ' + command);
        logger.info('Available commands: login, vehicles, violations, search [plate], full');
        break;
      }
    }
  } catch (error) {
    logger.error('Main execution error', error);
  } finally {
    await engine.stop();
    logger.info('=== CCC-Browser Automation Tool Exited ===');
  }
}

main().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
