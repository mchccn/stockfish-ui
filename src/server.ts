import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import express from "express";
import { createServer } from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { SERVER_PORT } from "./shared.js";

const app = express();

const server = createServer(app);

const wss = new WebSocketServer({ server });

app.use(express.json());

app.use(express.static(path.resolve(new URL(import.meta.url).pathname, "..", "..", "public")));

server.listen(SERVER_PORT);

const clients = new Map<number, ChildProcessWithoutNullStreams>();

wss.on("connection", (ws) => {
    const id = Date.now();

    console.log(`[info] (${id}) connected`);

    const stockfish = spawn("stockfish");

    stockfish.on("error", console.log);

    stockfish.stdout.on("data", (e) => ws.send(e.toString()));

    clients.set(id, stockfish);

    ws.on("message", (buffer) => {
        const data = buffer.toString();

        stockfish.stdin.write(data + "\n");
    });

    ws.on("close", (code) => {
        console.log(`[info] (${id}) disconnected with code ${code}`);

        stockfish.kill("SIGKILL");

        clients.delete(id);
    });
});
