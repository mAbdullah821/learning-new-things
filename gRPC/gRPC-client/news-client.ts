import { ServiceClientConstructor, credentials, loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

const PATH = './news.proto';
const hostAndPort = 'localhost:50051';

const packageDefinition = loadSync(PATH);
const NewsService = loadPackageDefinition(packageDefinition).NewsService as ServiceClientConstructor;

export const newsClient = new NewsService(hostAndPort, credentials.createInsecure());
