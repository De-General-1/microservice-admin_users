import * as express from "express";
import { Request, Response } from "express";
import { tracer, FORMAT_HTTP_HEADERS } from "./tracer";
import * as opentracing from "opentracing";
import * as cors from "cors";
import { createConnection } from "typeorm";
import { Product } from "./entity/product";
import * as amqp from "amqplib/callback_api";
import * as client from "prom-client";
import span from "opentracing/lib/span";

const app = express();

// ----------- Prometheus metrics -------------
client.collectDefaultMetrics();

const productCount = new client.Gauge({
  name: "product_count",
  help: "Number of products in the system",
});

const productLikeCounter = new client.Counter({
  name: "product_like_total",
  help: "Total number of product likes",
});

const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [50, 100, 300, 500, 1000, 2000],
});

app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.path, code: res.statusCode });
  });
  next();
});

// Tracing middleware

const headers: any = {};
tracer.inject(span, FORMAT_HTTP_HEADERS, headers);

app.use((req, res, next) => {
  const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);
  const span = tracer.startSpan(req.path, { childOf: parentSpanContext });
  span.log({ event: "request_received" });

  req["span"] = span;

  res.on("finish", () => {
    span.log({ event: "request_end", statusCode: res.statusCode });
    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
    span.finish();
  });

  next();
});

createConnection().then((db) => {
  const productRepository = db.getRepository(Product);
  const AMQP_URL = process.env.AMQP_URL;

  amqp.connect(AMQP_URL, (error0, connection) => {
    if (error0) {
      console.log(error0);
      throw error0;
    }

    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      app.use(
        cors({
          origin: [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8080",
            "http://localhost:4200",
          ],
        })
      );

      app.use(express.json());

      app.get("/api/products", async (req: Request, res: Response) => {
        const span = req["span"];
        span.log({ event: "db_query_start", operation: "find_all_products" });
        const products = await productRepository.find();
        span.log({ event: "db_query_end", result_count: products.length });
        productCount.set(products.length);
        res.json(products);
      });

      app.post("/api/products", async (req: Request, res: Response) => {
        const span = req["span"];
        span.log({ event: "creating_product", payload: req.body });

        const product = await productRepository.create(req.body);
        const result = await productRepository.save(product);

        span.log({ event: "product_created", productId: result[0].id });

        productCount.inc();
        channel.sendToQueue(
          "product_created",
          Buffer.from(JSON.stringify(result)),
          { headers }
        );

        span.log({ event: "message_sent", queue: "product_created" });
        return res.send(result);
      });

      app.put("/api/products/:id", async (req: Request, res: Response) => {
        const product = await productRepository.findOne(req.params.id);
        productRepository.merge(product, req.body);
        const result = await productRepository.save(product);
        channel.sendToQueue(
          "product_updated",
          Buffer.from(JSON.stringify(result)),
          { headers }
        );
        return res.send(result);
      });

      app.delete("/api/products/:id", async (req: Request, res: Response) => {
        //tracer
        const span = req["span"];
        span.log({ event: "decrementing_product_count", payload: req.body });
        const result = await productRepository.delete(req.params.id);
        productCount.dec();

        //tracer
        span.log({
          event: "pruduct_count_decremented",
          productId: result[0].id,
        });
        channel.sendToQueue("product_deleted", Buffer.from(req.params.id)),
          { headers };
        return res.send(result);
      });

      app.post(
        "/api/products/:id/like",
        async (req: Request, res: Response) => {
          const span = req["span"];
          span.log({ event: "incrementing_like_count", payload: req.body });
          const product = await productRepository.findOne(req.params.id);
          product.likes++;
          const result = await productRepository.save(product);
          productLikeCounter.inc();
          span.log({
            event: "like_count_incremented",
            productId: result[0].id,
          });
          return res.send(result);
        }
      );

      app.get("/metrics", async (req, res) => {
        res.set("Content-Type", client.register.contentType);
        res.end(await client.register.metrics());
      });

      console.log("Listening to port: 8000");
      app.listen(8000);

      process.on("SIGTERM", () => {
        console.log("SIGTERM received, closing connections");
        connection.close(() => {
          console.log("RabbitMQ connection closed");
          process.exit(0);
        });
      });
    });
  });
});
