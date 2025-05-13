import initJaegerTracer from "jaeger-client";
import { FORMAT_HTTP_HEADERS, globalTracer } from "opentracing";

const config = {
  serviceName: "product-service",
  reporter: {
    logSpans: true,
    agentHost: process.env.JAEGER_AGENT_HOST || "localhost",
    agentPort: 6832,
  },
  sampler: {
    type: "const",
    param: 1,
  },
};

const options = {
  logger: {
    info: (msg: any) => console.log("JAEGER INFO:", msg),
    error: (msg: any) => console.error("JAEGER ERROR:", msg),
  },
};

const tracer = initJaegerTracer(config, options);

export { tracer, globalTracer, FORMAT_HTTP_HEADERS };
