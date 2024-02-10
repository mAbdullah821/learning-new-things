import { INews, INewsRequest, callbackType } from '../interface';
import { gRPCNotFoundException } from '../error-exceptions';

let newsList: INews[] = [
  { id: '1', title: 'Title 1', body: 'Body 1', postImage: 'Image 1' },
  { id: '2', title: 'Title 2', body: 'Body 2', postImage: 'Image 2' },
];

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ----------------------------------------------------------------------------
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

export const getAllNews = (call: INewsRequest, callback: callbackType) => {
  callback(null, { newsList });
};
// ----------------------------------------------------------------------------
export const getNews = (call: INewsRequest, callback: callbackType) => {
  const id = call.request.id;
  const idx = newsList.findIndex((news) => news.id === id);

  callback(idx === -1 ? new gRPCNotFoundException('Not fount news with id: ' + id) : null, newsList[idx]);
};
// ----------------------------------------------------------------------------
export const addNews = (call: INewsRequest, callback: callbackType) => {
  const news = { ...call.request, id: `${Date.now()}` };
  newsList.push(news);

  callback(null, news);
};
// ----------------------------------------------------------------------------
export const editNews = (call: INewsRequest, callback: callbackType) => {
  const id = call.request.id;
  const idx = newsList.findIndex((news) => news.id === id);

  if (idx !== -1) newsList[idx] = { ...newsList[idx], ...call.request };

  callback(idx === -1 ? new gRPCNotFoundException('Not fount news with id: ' + id) : null, newsList[idx]);
};
// ----------------------------------------------------------------------------
export const deleteNews = (call: INewsRequest, callback: callbackType) => {
  const id = call.request.id;
  const previousLength = newsList.length;

  newsList = newsList.filter((news) => news.id !== id);

  callback(previousLength === newsList.length ? new gRPCNotFoundException('Not fount news with id: ' + id) : null, {});
};
