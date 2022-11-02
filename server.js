import http from 'http';
import winston from 'winston';

import {webApp} from './src/api/http/index.js';
import {WinstonLoggerFacade} from './src/libs/logger/index.js';
import config from './config/index.js';


const logger = new WinstonLoggerFacade(winston, config.logger);
const server = http.createServer(webApp);
server.listen(config.server.port);

server.on('listening', () => {
  logger.info(`Http server listening on port: ${config.server.port}`);
});

server.on('error', (err) => {
  logger.error(`Http server listening error: ${err}`);
  logger.end();
  process.exit(1);
});


