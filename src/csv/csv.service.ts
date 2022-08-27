import { Injectable } from '@nestjs/common';
import fs from 'fs';
import { parse } from 'csv-parse';
import { once } from 'lodash';
import axios from 'axios';

const IDENTITY = (input) => input;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {};

@Injectable()
export class CsvService {
  async readCsvFile(
    fileUrl,
    {
      onError = IDENTITY,
      cast = true,
      onData,
      onEnd = NOOP,
      onRecord = IDENTITY,
    },
  ) {
    const csvParser = parse({
      cast,
      cast_date: true,
      columns: true,
      delimiter: ',',
      on_record: onRecord,
    });

    const error = once(onError);

    const { data: stream } = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    });

    csvParser.on('data', onData).on('error', error).on('end', onEnd);
    stream.on('data', (chunk) => csvParser.write(chunk.toString()));
    stream.once('end', () => {
      csvParser.end();
    });
    stream.once('error', error);
  }
}
