const env = process.env;

const config = {};

// NEAR
config.near = {
  connectionConfig: {
    networkId: env.NEAR_NETWORK_ID,
    nodeUrl: env.NEAR_NODE_URL,
    walletUrl: env.NEAR_WALLET_URL,
    helperUrl: env.NEAR_HELPER_URL,
    explorerUrl: env.NEAR_EXPLORER_URL,
  },
  walletApiOrigin: env.NEAR_WALLET_API_ORIGIN,
};

// logger
config.logger = {
  transports: {
    Console: {
      level: env.LOGGER_TRANSPORT_CONSOLE_LEVEL,
    },
  },
  hostName: env.LOGGER_HOST_NAME,
  serviceName: env.LOGGER_SERVICE_NAME,
};

// server
config.server = {
  port: env.SERVER_PORT,
};

// mongo
config.mongo = {
  url: env.MONGODB_URL,
  options: {
    autoIndex: true,
  },
};
if (env.MONGODB_SSL_ENABLE) {
  config.mongo.options.ssl = true;
}
if (env.MONGODB_USER && env.MONGODB_PASS) {
  config.mongo.options.user = env.MONGODB_USER;
  config.mongo.options.pass = env.MONGODB_PASS;
}

// CORS
config.CORS = {
  defaultCorsOptions: {
    origin: (() => {
      const rawOrigins = env.CORS_ALLOWED_ORIGINS;
      if (!rawOrigins) return true;
      const originsList = rawOrigins.split(' ');
      return originsList.map((origin) => {
        const originUrl = new URL(origin);
        return new RegExp(`${originUrl.protocol}//([A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?\\.)?${originUrl.hostname}`);
      });
    })(),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  },
};


// auth
config.auth = {
  google: {
    clientid: env.GOOGLE_AUTH_CLIENT_ID,
  },
};


export default config;
