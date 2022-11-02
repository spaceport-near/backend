import express from 'express';
import winston from 'winston';
import {v4 as uuidv4} from 'uuid';
import cors from 'cors';
import * as nearAPI from 'near-api-js';
import seedUtil from 'near-seed-phrase';
import axios from 'axios';
import mongoose from 'mongoose';
import EventEmitter from 'events';
import {OAuth2Client} from 'google-auth-library';

import {WinstonLoggerFacade} from '../../libs/logger/index.js';
import {AccountDataAccess, AccountService, AccountNetwork} from '../../components/account/index.js';
import {HttpErrorBody} from '../../libs/errors/index.js';
import {RequestInputsParser} from '../../libs/request-inputs-parser/index.js';
import {DataPageComposer} from '../../libs/data-page-composer/index.js';
import {NearAccountFacade} from '../../libs/near-account-facade/index.js';
import {FlatDoc} from '../../libs/flat-doc/index.js';
import {AuthenticationService, AuthenticationNetwork} from '../../libs/authentication/index.js';
import {AuthorizationService, AuthorizationNetwork} from '../../libs/authorization/index.js';


import config from '../../../config/index.js';

// init components
const app = express();
const router = new express.Router();
const logger = new WinstonLoggerFacade(winston, config.logger);
// set flag for use unhandled rejection handler
const eventEmitter = new EventEmitter({captureRejections: true});
// set handler for unhandled rejection(used with async callbacks)
eventEmitter[Symbol.for('nodejs.rejection')] = logger.error.bind(logger);
const nearAccountFacade = new NearAccountFacade(
  nearAPI, config.near.connectionConfig, seedUtil, axios, config.near.walletApiOrigin,
);
nearAccountFacade.connect();
mongoose.connect(config.mongo.url, config.mongo.options);
const accountDataAccess = new AccountDataAccess(mongoose, FlatDoc.makeFlat);
const accountService = new AccountService(accountDataAccess, nearAccountFacade, DataPageComposer.composePageInfo);
const accountNetwork = new AccountNetwork(accountService, HttpErrorBody.compose, RequestInputsParser);
accountService.setEventEmitter(eventEmitter);
eventEmitter.on(accountService.events.undockingInit, logger.info.bind(logger));
eventEmitter.on(accountService.events.undockingSeedused, logger.info.bind(logger));
eventEmitter.on(accountService.events.undocked, logger.info.bind(logger));
eventEmitter.on(accountService.events.undockingError, logger.warn.bind(logger));

const authClient = new OAuth2Client(config.auth.google.clientid);
const authenticationService = AuthenticationService.instantiate(authClient);
const authenticationNetwork = AuthenticationNetwork.instantiate(authenticationService, HttpErrorBody.compose);
const authorizationService = AuthorizationService.instantiate();
const authorizationNetwork = AuthorizationNetwork.instantiate(authorizationService, HttpErrorBody.compose);


// ADD PRE MIDDLEWARES
app.use((req, res, next) => {
  // Try get ip from cloudflare headers
  // then nginx headers(nginx.conf: proxy_set_header  X-Real-IP  $remote_addr;)
  // then native nodejs http headers
  const ip = req.headers['cf-connecting-ip'] ?? req.headers['x-real-ip'] ?? req.socket.remoteAddress;
  const requestId = uuidv4();
  req.requestOpts = logger.composeRequestOpts(requestId, ip);
  logger.debug(`${req.method} ${req.path}`, req.requestOpts);
  next();
});
app.use(cors(config.CORS.defaultCorsOptions));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.use(authenticationNetwork.onRetrieveUser.bind(authenticationNetwork));
app.use(authorizationNetwork.onVerifyAccess.bind(authorizationNetwork));
accountNetwork.registerRoutes(router);
app.use('/api/1.0.0', router);

// HANDLE UNKNOWN ROUTE
app.use((req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  res.status(404).end();
  return next(err);
});

// HANDLE APP ERRORS
app.use((err, req, res, next) => logger.warn(err.stack, req.requestOpts));

// SET APP GLOBAL ERROR HANDLERS
process
  .on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    logger.end();
    process.exit(1);
  })
  .on('uncaughtException', (err, origin) => {
    logger.error(`Uncaught Exception: ${err}, origin: ${origin}`);
    logger.end();
    process.exit(1);
  });


export const webApp = app;
