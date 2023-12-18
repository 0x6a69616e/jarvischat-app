const
  axios = require('axios'),
  {
    Readable,
    Transform
  } = require('stream'),

  { now } = Date,
  { stringify: strfy } = JSON;

function checkStatus(status, content) {
  if (status !== 'ok') {
    throw Error(content);
  } else {
    return status;
  }
}

module.exports = class {
  constructor(config = {}) {
    this.post = axios.create(Object.assign(config, {
      baseURL: 'https://jarvischat.app'
    })).post;
  }

  async new_chat(user_id = Array.from({
    length: 17
  }, () => Math.random().toString(36)[2]).join('')) {
    const {
      data: {
        id_
      }
    } = await this.post('/new_chat', strfy({
      user_id
    }));

    return id_;
  }

  async update_chat_name(chat_id, chat_name) {
    const {
      data: {
        status,
        content
      }
    } = await this.post('/update_chat_name', strfy({
      chat_id,
      chat_name
    }));

    return checkStatus(status, content);
  }

  async chat_api_stream(question, chat_id) {
    const {
      data
    } = await this.post('/chat_api_stream', strfy({
      question,
      chat_id,
      timestamp: now()
    }), {
      responseType: 'stream'
    });

    function modifyChunk(chunk) {
      const
        line = chunk.trimRight(),
        index = line.indexOf(':');

      if (index <= 0) return;

      const field = line.substring(0, index);
      if (field !== 'data') return;

      return line.substring(index + 1).trimLeft();
    }

    const
      transformed = data.pipe(new Transform({
        transform(chunk, encoding, callback) {
          callback(null, strfy(chunk.toString().split(/\n+|\r\n+|\r+/gm).filter(x => x)));
        }
      })),
      readableStream = new Readable({
        read(size) {
          return !0;
        }
      });

    transformed.on('data', chunk => {
      const res = JSON.parse(new TextDecoder().decode(chunk));
      res.map(x => readableStream.push(modifyChunk(x)));
    });

    transformed.on('end', () => readableStream.push(null));

    return {
      handler(callback = x => x) {
        return new Promise((resolve, reject) => {
          let response = [];
          readableStream.on('data', chunk => {
            const res = chunk.toString();
            !callback || callback(res);
            response.push(res);
          });
          readableStream.on('end', () => resolve(response));
          readableStream.on('error', reject);
        });
      },
      parsed: readableStream,
      raw: data
    };
  }

  async update_messages(chat_id, bot_response) {
    const {
      data: {
        status,
        content
      }
    } = await this.post('/update_messages', strfy({
      chat_id,
      bot_response,
      timestamp: now()
    }));

    return checkStatus(status, content);
  }

  async delete_chat(chat_id) {
    const {
      data: {
        status,
        content
      }
    } = await this.post('/delete_chat', strfy({
      chat_id
    }));

    return checkStatus(status, content);
  }
}
