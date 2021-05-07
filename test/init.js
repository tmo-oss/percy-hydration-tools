const path = require("path");
const tsnode = require("ts-node");
const sms = require("source-map-support");

tsnode.register({
  project: path.resolve(__dirname, '../tsconfig.spec.json'),
  transpileOnly: true
});

sms.install({
  environment: "node",
  hookRequire: true
});
sms.resetRetrieveHandlers();