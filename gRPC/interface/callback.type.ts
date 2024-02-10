import { gRPCException } from '../error-exceptions';

export type callbackType = (error: null | gRPCException, response: object) => void;
