"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var typeorm_1 = require("typeorm");
var amqplib_1 = require("amqplib");
var product_1 = require("./entity/product");
var client = require("prom-client");
var axios_1 = require("axios");
var collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // this will collect Node.js metrics like memory, CPU
function start() {
    return __awaiter(this, void 0, void 0, function () {
        function updateProductCount() {
            return __awaiter(this, void 0, void 0, function () {
                var count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, productRepository.count()];
                        case 1:
                            count = _a.sent();
                            productCountGauge.set(count);
                            return [2 /*return*/];
                    }
                });
            });
        }
        var db, productRepository, AMQP_URL, connection, channel, app, httpRequestDurationMicroseconds, productLikeCounter, productCountGauge;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, typeorm_1.createConnection()];
                case 1:
                    db = _a.sent();
                    productRepository = db.getMongoRepository(product_1.Product);
                    AMQP_URL = "amqps://hxpyrpng:W7HpIpMJzXrQjQl6LrYPjHR33v7zJ6bi@crow.rmq.cloudamqp.com/hxpyrpng";
                    return [4 /*yield*/, amqplib_1.connect(AMQP_URL)];
                case 2:
                    connection = _a.sent();
                    return [4 /*yield*/, connection.createChannel()];
                case 3:
                    channel = _a.sent();
                    return [4 /*yield*/, channel.assertQueue("product_created", { durable: false })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, channel.assertQueue("product_updated", { durable: false })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, channel.assertQueue("product_deleted", { durable: false })];
                case 6:
                    _a.sent();
                    app = express();
                    app.use(cors({
                        origin: [
                            "http://localhost:3000",
                            "http://localhost:3001",
                            "http://localhost:8080",
                            "http://localhost:4200",
                        ],
                    }));
                    app.use(express.json());
                    channel.consume("product_created", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                        var eventProduct, product;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    eventProduct = JSON.parse(msg.content.toString());
                                    product = new product_1.Product();
                                    product.admin_id = parseInt(eventProduct.id);
                                    product.title = eventProduct.title;
                                    product.image = eventProduct.image;
                                    product.likes = eventProduct.likes;
                                    return [4 /*yield*/, productRepository.save(product)];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, updateProductCount()];
                                case 2:
                                    _a.sent();
                                    console.log("product created");
                                    return [2 /*return*/];
                            }
                        });
                    }); }, { noAck: true });
                    channel.consume("product_updated", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                        var eventProduct, product;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    eventProduct = JSON.parse(msg.content.toString());
                                    return [4 /*yield*/, productRepository.findOne({
                                            admin_id: parseInt(eventProduct.id),
                                        })];
                                case 1:
                                    product = _a.sent();
                                    if (!product) return [3 /*break*/, 4];
                                    productRepository.merge(product, {
                                        title: eventProduct.title,
                                        image: eventProduct.image,
                                        likes: eventProduct.likes,
                                    });
                                    return [4 /*yield*/, productRepository.save(product)];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, updateProductCount()];
                                case 3:
                                    _a.sent();
                                    console.log("product updated");
                                    _a.label = 4;
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }, { noAck: true });
                    channel.consume("product_deleted", function (msg) { return __awaiter(_this, void 0, void 0, function () {
                        var admin_id;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    admin_id = parseInt(msg.content.toString());
                                    return [4 /*yield*/, productRepository.deleteOne({ admin_id: admin_id })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, updateProductCount()];
                                case 2:
                                    _a.sent();
                                    console.log("product deleted");
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    httpRequestDurationMicroseconds = new client.Histogram({
                        name: "http_request_duration_ms",
                        help: "Duration of HTTP requests in ms",
                        labelNames: ["method", "route", "code"],
                        buckets: [50, 100, 300, 500, 1000, 2000],
                    });
                    productLikeCounter = new client.Counter({
                        name: "product_like_total",
                        help: "Total number of product likes",
                    });
                    productCountGauge = new client.Gauge({
                        name: "product_total_count",
                        help: "Total number of products in the database",
                    });
                    app.use(function (req, res, next) {
                        var end = httpRequestDurationMicroseconds.startTimer();
                        res.on("finish", function () {
                            end({ method: req.method, route: req.path, code: res.statusCode });
                        });
                        next();
                    });
                    app.get("/api/products", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var products;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, productRepository.find()];
                                case 1:
                                    products = _a.sent();
                                    res.send(products);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/products/:id/like", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var product;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, productRepository.findOne(req.params.id)];
                                case 1:
                                    product = _a.sent();
                                    if (!product) return [3 /*break*/, 5];
                                    return [4 /*yield*/, axios_1.default.post("http://localhost:8000/api/products/" + product.admin_id + "/like", {})];
                                case 2:
                                    _a.sent();
                                    product.likes++;
                                    return [4 /*yield*/, productRepository.save(product)];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, productRepository.save(product)];
                                case 4:
                                    _a.sent();
                                    res.send(product);
                                    return [3 /*break*/, 6];
                                case 5:
                                    res.status(404).send({ message: "Product not found" });
                                    _a.label = 6;
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.get("/metrics", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    res.set("Content-Type", client.register.contentType);
                                    _b = (_a = res).end;
                                    return [4 /*yield*/, client.register.metrics()];
                                case 1:
                                    _b.apply(_a, [_c.sent()]);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    app.listen(8001, function () {
                        console.log("Listening to port: 8001");
                    });
                    process.on("beforeExit", function () {
                        console.log("closing connection");
                        connection.close();
                    });
                    return [2 /*return*/];
            }
        });
    });
}
start().catch(function (err) { return console.error("Failed to start service:", err); });
