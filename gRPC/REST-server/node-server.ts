import express, { NextFunction, Request, Response } from 'express';
import newsRouter from './node-server.router';
import { HttpException, HttpNotFoundException } from '../error-exceptions/http-error-exceptions.class';

const app = express();
const port = 5050;

app.use(express.json());

app.use('/news', newsRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  return next(new HttpNotFoundException(`${req.method} ${req.url} Not Found`));
});

app.use((err: HttpException, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 || err.message ? err.message : 'Internal server error exception';

  res.status(statusCode).send({
    name: err.name,
    error: message,
    time: new Date(),
  });
});

app.listen(port, () => {
  console.log(`Http Server running at http://localhost:${port}`);
});
