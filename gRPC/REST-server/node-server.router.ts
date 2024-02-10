import { Router, Request, Response, NextFunction } from 'express';
import { newsClient } from '../gRPC-client/news-client';
import { INews } from '../interface';
import {
  HttpInternalServerErrorException,
  HttpNotFoundException,
} from '../error-exceptions/http-error-exceptions.class';
import { gRPCException } from '../error-exceptions';
import { Status } from '@grpc/grpc-js/build/src/constants';

const handleGRPCError = (error: gRPCException, next: NextFunction): void => {
  return error.code === Status.NOT_FOUND
    ? next(new HttpNotFoundException(error.message))
    : error.code === Status.INTERNAL
    ? next(new HttpInternalServerErrorException(error.message))
    : next(new HttpInternalServerErrorException('Unexpected server error'));
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ----------------------------------------------------------------------------
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  newsClient.GetAllNews({}, (err: null | gRPCException, responseData: { newsList: INews[] }) => {
    if (err) return handleGRPCError(err, next);

    res.json(responseData);
  });
});
// ----------------------------------------------------------------------------
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  newsClient.GetNews(req.params, (err: null | gRPCException, responseData: INews) => {
    if (err) return handleGRPCError(err, next);

    res.json(responseData);
  });
});
// ----------------------------------------------------------------------------
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  newsClient.AddNews(req.body, (err: null | gRPCException, responseData: INews) => {
    if (err) return handleGRPCError(err, next);

    res.json(responseData);
  });
});
// ----------------------------------------------------------------------------
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  newsClient.EditNews({ id: req.params['id'], ...req.body }, (err: null | gRPCException, responseData: INews) => {
    if (err) return handleGRPCError(err, next);

    res.json(responseData);
  });
});
// ----------------------------------------------------------------------------
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  newsClient.DeleteNews(req.params, (err: null | gRPCException, responseData: {}) => {
    if (err) return handleGRPCError(err, next);

    res.json({
      message: 'News deleted successfully',
    });
  });
});

export default router;
