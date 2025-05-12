import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import { createConnection } from "typeorm";
import { connect, Channel, Connection } from "amqplib";
import { Product } from "./entity/product";
import * as client from "prom-client";
import axios from "axios";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // this will collect Node.js metrics like memory, CPU

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

  channel.consume(
    "product_created",
    async (msg) => {
      const eventProduct: Product = JSON.parse(msg.content.toString());
      const product = new Product();
      product.admin_id = parseInt(eventProduct.id);
      product.title = eventProduct.title;
      product.image = eventProduct.image;
      product.likes = eventProduct.likes;
      await productRepository.save(product);
      await updateProductCount();
      console.log("product created");
    },
    { noAck: true }
  );

  channel.consume(
    "product_updated",
    async (msg) => {
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
        console.log("product updated");
      }
    },
    { noAck: true }
  );

  channel.consume("product_deleted", async (msg) => {
    const admin_id = parseInt(msg.content.toString());
    await productRepository.deleteOne({ admin_id });
    await updateProductCount();
    console.log("product deleted");
  });

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
  app.use((req, res, next) => {
    const end = httpRequestDurationMicroseconds.startTimer();
    res.on("finish", () => {
      end({ method: req.method, route: req.path, code: res.statusCode });
    });
    next();
  });

  app.get("/api/products", async (_req: Request, res: Response) => {
    const products = await productRepository.find();
    res.send(products);
  });

  app.post("/api/products/:id/like", async (req: Request, res: Response) => {
    const product = await productRepository.findOne(req.params.id);
    if (product) {
      await axios.post(
        `http://localhost:8000/api/products/${product.admin_id}/like`,
        {}
      );
      product.likes++;
      await productRepository.save(product);
      await productRepository.save(product);
      res.send(product);
    } else {
      res.status(404).send({ message: "Product not found" });
    }
  });

  app.get("/metrics", async (req: Request, res: Response) => {
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
