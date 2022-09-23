import { Chess, Move, Square } from "chess.js";
import { SERVER_PORT } from "./shared";

declare function Chessboard(
    selector: string,
    config: {
        draggable?: boolean;
        position?: string;
        onDragStart?(source: string, piece: string, position: string, orientation: string): boolean | undefined;
        onDrop?(source: string, target: string): string | undefined;
        onSnapEnd?(): void;
        onMouseoverSquare?(square: Square, piece: string): void;
        onMouseoutSquare?(square: Square, piece: string): void;
    }
): {
    clear(useAnimation?: boolean): void;
    destroy(): void;
    fen(): string;
    flip(): void;
    move(...moves: string[]): void;
    position(
        newPosition: Record<string, string> | (string & Record<never, never>) | "start",
        useAnimation?: boolean
    ): void;
    position(): Record<string, string>;
    position(type: "fen"): string;
    orientation(): "white" | "black";
    resize(): void;
    start(useAnimation?: boolean): void;
};

const game = new Chess();

let engineThinking = false;

function engineMove() {
    engineThinking = true;

    const position = `position startpos moves ${(game.history({ verbose: true }) as Move[])
        .map(({ from, to }) => `${from}${to}`)
        .join(" ")}`;

    ws.send(position);

    ws.send("d");

    ws.send("go ponder");

    setTimeout(() => {
        ws.send("stop");

        engineThinking = false;
    }, ponder);
}

const board = Chessboard("board", {
    draggable: true,
    position: "start",
    onDragStart(source, piece, position, orientation) {
        if (game.isGameOver()) return false;

        if (
            engineThinking ||
            (game.turn() === "w" && piece.search(/^b/) !== -1) ||
            (game.turn() === "b" && piece.search(/^w/) !== -1)
        )
            return false;

        return undefined;
    },
    onDrop(source, target) {
        document.querySelectorAll<HTMLDivElement>("#board .square-55d63").forEach((s) => (s.style.background = ""));

        if (
            game.move({
                from: source,
                to: target,
            }) === null &&
            game.move({
                from: source,
                to: target,
                promotion: "q",
            }) === null
        ) {
            return "snapback";
        }

        return undefined;
    },
    onSnapEnd() {
        board.position(game.fen());

        if (enabled) engineMove();
    },
    onMouseoverSquare(square, piece) {
        const moves = game.moves({
            square,
            verbose: true,
        });

        if (moves.length === 0) return;

        for (const s of [{ to: square }, ...moves] as Move[]) {
            const e = document.querySelector<HTMLDivElement>(`#board .square-${s.to}`)!;

            e.style.background = e.classList.contains("black-3c85d") ? "#696969" : "#a9a9a9";
        }
    },
    onMouseoutSquare(square, piece) {
        document.querySelectorAll<HTMLDivElement>("#board .square-55d63").forEach((s) => (s.style.background = ""));
    },
});

const logs = document.querySelector<HTMLPreElement>("#logs")!;
const pondertime = document.querySelector<HTMLParagraphElement>("#pondertime")!;
const disabled = document.querySelector<HTMLParagraphElement>("#disabled")!;
let ponder = 1000;
let enabled = true;

document.addEventListener("keypress", (e) => {
    if (e.key === "+") ponder += 500;
    if (e.key === "-") ponder = Math.abs(ponder - 500);

    pondertime.textContent = `ponder time: ${ponder}ms`;

    if (e.key === "~") {
        board.flip();

        if (enabled) engineMove();
    }

    if (e.key === "/") {
        enabled = !enabled;

        disabled.textContent = `engine disabled: ${!enabled}`;
    }
});

const ws = new WebSocket(`ws://${location.hostname}:${SERVER_PORT}`);

ws.addEventListener("message", ({ data }: { data: string }) => {
    logs.textContent += data;
    logs.scrollTop = logs.scrollHeight;

    if (data.includes("bestmove")) {
        const [from, to] = data.slice(data.indexOf("bestmove")).split(" ")[1].match(/.{2}/g)!;

        if (game.move({ from, to }) === null) game.move({ from, to, promotion: "q" });

        board.position(game.fen());
    }
});

//@ts-ignore
globalThis.send = ws.send.bind(ws);
