import { loadSync } from '@grpc/proto-loader';
import { Server, ServerCredentials, loadPackageDefinition, ServiceClientConstructor } from '@grpc/grpc-js';
import { getAllNews, getNews, editNews, deleteNews, addNews } from './server-methods';

const PATH = './news.proto';
const hostAndPort = 'localhost:50051';

const packageDefinition = loadSync(PATH);
const newsProto = loadPackageDefinition(packageDefinition);

const server = new Server();

server.addService((newsProto.NewsService as ServiceClientConstructor).service, {
  GetAllNews: getAllNews,
  GetNews: getNews,
  EditNews: editNews,
  DeleteNews: deleteNews,
  AddNews: addNews,
});

server.bindAsync(hostAndPort, ServerCredentials.createInsecure(), (err, port) => {
  console.log('gRPC Server running at', hostAndPort);
});
