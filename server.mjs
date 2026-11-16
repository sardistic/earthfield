// Self-hosted Node entrypoint: serves the same Worker module over plain HTTP.
import {createServer} from 'node:http';
import worker from './worker/main.js';

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

const server = createServer(async (req, res) => {
  try {
    const origin = 'http://' + (req.headers.host || 'localhost');
    const response = await worker.fetch(new Request(new URL(req.url, origin), {method: req.method}));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(new Date().toISOString(), req.method, req.url, error);
    if (!res.headersSent) res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Internal error');
  }
});

server.listen(port, host, () => console.log(`Earth Field listening on ${host}:${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
