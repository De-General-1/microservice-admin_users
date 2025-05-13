import * as opentracing from "opentracing";
import { initTracer } from "jaeger-client";

const config = {
  serviceName: "content-service",
  reporter: {
    logSpans: true,
    agentHost: "localhost",
    agentPort: 6832,
  },
  sampler: {
    type: "const",
    param: 1,
  },
};

const options = {
  logger: {
    info(msg: string) {
      console.log("Jaeger Info:", msg);
    },
    error(msg: string) {
      console.error("Jaeger Error:", msg);
    },
  },
};

const tracer = initTracer(config, options);
opentracing.initGlobalTracer(tracer);

export { tracer };
export const FORMAT_HTTP_HEADERS = opentracing.FORMAT_HTTP_HEADERS;
