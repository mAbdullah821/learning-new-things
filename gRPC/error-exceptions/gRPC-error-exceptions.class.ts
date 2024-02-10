import { Metadata } from '@grpc/grpc-js';
import { Status } from '@grpc/grpc-js/build/src/constants';

export class gRPCException extends Error {
  code?: Status;
  details?: string;
  metadata?: Metadata;

  constructor(errorName: string, message: string, statusCode: Status, details: string) {
    super(message);
    this.code = statusCode;
    this.details = details;
    this.name = errorName;
    this.metadata = new Metadata();
  }
}

export class gRPCNotFoundException extends gRPCException {
  constructor(message: string) {
    super('NotFoundException', message, Status.NOT_FOUND, 'Item not found');
  }
}

export class gRPCInternalServerErrorException extends gRPCException {
  constructor(message: string) {
    super('InternalServerErrorException', message, Status.INTERNAL, 'Server Has internal error');
  }
}
