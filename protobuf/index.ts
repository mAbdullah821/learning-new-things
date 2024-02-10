import { load } from 'protobufjs';
import sizeOf from 'object-sizeof';

const getWorkersPayloads = () => {
  const people: any[] = [];

  for (let i = 0; i < 10; i++) {
    people.push({
      id: i,
      username: `hello ${i}`,
      email: `hello.${i}@email.com`,
      userFullName: {
        firstName: 'hello',
        lastName: `${i}`,
      },
      phones: [`${i}`, `0${i}`, `00${i}`],
    });
  }

  return { people };
};

const main = async () => {
  const root = await load('worker.proto');

  const Workers = root.lookupType('people.Workers');

  const payload = getWorkersPayloads();

  console.log(Workers.verify(payload));
  console.log(`Payload size is ${sizeOf(payload)}`);

  const workersMessage = Workers.create(payload);

  const buffer = Workers.encode(workersMessage).finish();
  // console.log(`Serialized object ${buffer}`);
  console.log(`Buffer size is ${sizeOf(buffer)}`);

  const decodedWorkersMessage = Workers.decode(buffer);

  // console.log(`Deserialized object ${JSON.stringify(decodedWorkersMessage, null, 2)}`);
  // console.log(`Plain object size is ${sizeOf(decodedWorkersMessage)}`);
};

main();
