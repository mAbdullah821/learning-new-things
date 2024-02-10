export class HttpException extends Error {
  statusCode?: number;

  constructor(errorName: string, message: string, statusCode: number) {
    super(message);
    this.name = errorName;
    this.statusCode = statusCode;
  }
}

export class HttpNotFoundException extends HttpException {
  constructor(message: string) {
    super('NotFoundException', message, 404);
  }
}

export class HttpInternalServerErrorException extends HttpException {
  constructor(message: string) {
    super('InternalServerErrorException', message, 500);
  }
}
