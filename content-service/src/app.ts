import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import { createConnection } from "typeorm";
import { connect, Channel, Connection } from "amqplib";
import { Product } from "./entity/product";
import * as client from "prom-client";
import { tracer, FORMAT_HTTP_HEADERS } from "./tracer";
import * as opentracing from "opentracing";
import axios from "axios";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

async function start() {
  const db = await createConnection();
  const productRepository = db.getMongoRepository(Product);

  const AMQP_URL =
    "amqps://hxpyrpng:W7HpIpMJzXrQjQl6LrYPjHR33v7zJ6bi@crow.rmq.cloudamqp.com/hxpyrpng";
  const connection: Connection = await connect(AMQP_URL);
  const channel: Channel = await connection.createChannel();

  await channel.assertQueue("product_created", { durable: false });
  await channel.assertQueue("product_updated", { durable: false });
  await channel.assertQueue("product_deleted", { durable: false });

  const app = express();

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

  // ---- OpenTracing Middleware ----
  app.use((req, res, next) => {
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);
    const span = tracer.startSpan(req.path, {
      childOf: parentSpanContext || undefined,
    });

    span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
    span.setTag(
      opentracing.Tags.SPAN_KIND,
      opentracing.Tags.SPAN_KIND_RPC_SERVER
    );
    span.setTag(opentracing.Tags.HTTP_URL, req.url);

    req["span"] = span;

    res.on("finish", () => {
      span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
      span.log({ event: "request_end" });
      span.finish();
    });

    next();
  });

  // ---- RabbitMQ Consumers ----
  channel.consume(
    "product_created",
    async (msg) => {
      const span = tracer.startSpan("product_created_queue");
      const eventProduct: Product = JSON.parse(msg.content.toString());
      const product = new Product();
      product.admin_id = parseInt(eventProduct.id);
      product.title = eventProduct.title;
      product.image = eventProduct.image;
      product.likes = eventProduct.likes;
      await productRepository.save(product);
      await updateProductCount();
      span.log({ event: "product_created", id: eventProduct.id });
      span.finish();
      console.log("product created");
    },
    { noAck: true }
  );

  channel.consume(
    "product_updated",
    async (msg) => {
      const span = tracer.startSpan("product_updated_queue");
      const eventProduct: Product = JSON.parse(msg.content.toString());
      const product = await productRepository.findOne({
        admin_id: parseInt(eventProduct.id),
      });
      if (product) {
        productRepository.merge(product, {
          title: eventProduct.title,
          image: eventProduct.image,
          likes: eventProduct.likes,
        });
        await productRepository.save(product);
        await updateProductCount();
        span.log({ event: "product_updated", id: eventProduct.id });
      }
      span.finish();
      console.log("product updated");
    },
    { noAck: true }
  );

  channel.consume("product_deleted", async (msg) => {
    const span = tracer.startSpan("product_deleted_queue");
    const admin_id = parseInt(msg.content.toString());
    await productRepository.deleteOne({ admin_id });
    await updateProductCount();
    span.log({ event: "product_deleted", admin_id });
    span.finish();
    console.log("product deleted");
  });

  // ---- Prometheus Metrics ----
  const httpRequestDurationMicroseconds = new client.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "code"],
    buckets: [50, 100, 300, 500, 1000, 2000],
  });

  const productLikeCounter = new client.Counter({
    name: "product_like_total",
    help: "Total number of product likes",
  });

  const productCountGauge = new client.Gauge({
    name: "product_total_count",
    help: "Total number of products in the database",
  });

  async function updateProductCount() {
    const count = await productRepository.count();
    productCountGauge.set(count);
  }

  // ---- Prometheus Timer Middleware ----
  app.use((req, res, next) => {
    const end = httpRequestDurationMicroseconds.startTimer();
    res.on("finish", () => {
      end({ method: req.method, route: req.path, code: res.statusCode });
    });
    next();
  });

  // ---- Routes ----
  app.get("/api/products", async (req: Request, res: Response) => {
    const span = req["span"];
    const products = await productRepository.find();
    span.log({ event: "products_fetched", count: products.length });
    res.send(products);
  });

  app.post("/api/products/:id/like", async (req: Request, res: Response) => {
    const span = req["span"];
    const product = await productRepository.findOne(req.params.id);
    if (product) {
      const likeSpan = tracer.startSpan("axios_like_request", {
        childOf: span,
      });

      await axios.post(
        `http://localhost:8000/api/products/${product.admin_id}/like`,
        {},
        {
          headers: (() => {
            const headers = {};
            tracer.inject(likeSpan, FORMAT_HTTP_HEADERS, headers);
            return headers;
          })(),
        }
      );

      likeSpan.finish();

      product.likes++;
      await productRepository.save(product);
      productLikeCounter.inc();
      span.log({ event: "product_liked", productId: product.admin_id });
      res.send(product);
    } else {
      span.setTag(opentracing.Tags.ERROR, true);
      span.log({ event: "product_not_found", id: req.params.id });
      res.status(404).send({ message: "Product not found" });
    }
  });

  app.get("/metrics", async (_req: Request, res: Response) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  app.listen(8001, () => {
    console.log("Listening to port: 8001");
  });

  process.on("beforeExit", () => {
    console.log("closing connection");
    connection.close();
  });
}

start().catch((err) => console.error("Failed to start service:", err));
