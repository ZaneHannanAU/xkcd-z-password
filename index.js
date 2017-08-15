/** @overview An XKCD-style password generator for node.js
  */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const {randomInts} = require('random-lib').promise();
const {EventEmitter} = require('events');
const [GENERATE, addOne, DELETE] = ['generate', 'addOne', 'delete']
.map(s => Symbol.for(s))

class xkcdPassword extends EventEmitter {
  /** @constructor xkcdPassword
    * @arg {boolean} autoInit - automatically initialise the password generator by default.
    * @arg {integer as number} numWords - amount of words to generate per bundle
    * @arg {integer as number} minLength - minimum length of words to generate
    * @arg {integer as number} maxLength - maximum length of words to generate
    * @arg {array|undefined} wordList - words to use
    * @arg {array|string|undefined} wordFile - word file(s) to read
    * @arg {array|string|undefined} wordFileZ - zip encoded file(s) to read
    * @arg {function|undefined} filter - a function that ensures a word satisfies all requirements (e.g. not a swear word)
    * @arg {boolean} caseSensitive
    */
  constructor({
    autoInit = true,
    numWords = 4, minLength = 5, maxLength = 8, wordList, wordFileZ,
    wordFile = path.join(__dirname, 'mwords', '113809of.fic'),
    // 113,809 official crosswords --- see
    // http://icon.shef.ac.uk/Moby/mwords.html
    filter = s => s.length >= minLength && s.length <= maxLength,
    caseSensitive = false, readableinputs
  } = {}) {
    super();
    this.ready = false;
    this.onReady = new Promise(res => {
      this.once('ready', () => {
        this.ready = true;
        res(this)
      });
    });

    this.opts = {
      numWords, minLength, maxLength, readableinputs,
      wordFileZ, wordFile, filter, caseSensitive
    };

    this.pending = 0
    if (Array.isArray(wordList)) {
      this.wordList = Array.from(wordList)
      this.emit('ready', this);
    } else {
      this.wordList = [];
      if (autoInit) this.init();
    };
  }

  /** @method init
    * @static
    * @arg opts - {@see xkcdPassword}
    */
  static init(opts = {}) {return new xkcdPassword(opts)}

  /** @method initWithWordlist
  * @static
  * @arg {array} wordList
  * @arg opts - {@see xkcdPassword}
  */
  static initWithWordlist(wordList, opts = {}) {
    if (opts.wordList) opts.wordList = wordList.concat(opts.wordList);
    else opts.wordList = wordList;;

    return new xkcdPassword(opts)
  }

  /** @method add
    * @argument {string as arguments} tx - words to add
    */
  add(...tx) {
    tx.forEach(s => setImmediate(() => {
      if (!this.opts.caseSensitive)
        s = s.toLowerCase()
      ;
      if (this.opts.filter(s) && !this.wordList.includes(s)) {
        this.wordList.push(s)
      };
      return;
    }))
  }

  /** @method addOne
    * @private
    * @arg {string} tx
    */
  [addOne](tx) {
    return this.wordList.push(tx)
  }

  /** @method initialise
    * @private
    */
  init() {
    if (Array.isArray(this.opts.wordFileZ)) {
      this.opts.wordFileZ.forEach(filename => this.uzwords(filename));
    } else if (typeof this.opts.wordFileZ === 'string') {
      this.uzwords(this.opts.wordFileZ)
    }

    if (Array.isArray(this.opts.wordFile)) {
      this.opts.wordFile.forEach(filename => this.words(filename));
    } else if (typeof this.opts.wordFile === 'string') {
      this.words(this.opts.wordFile);
    }

    if (Array.isArray(this.opts.readableinputs)) {
      this.opts.readableinputs.forEach(stream => {
        this.pending++;
        this.readLines(stream);
      })
    } else if (typeof this.opts.readableinputs !== 'undefined') {
      this.pending++;
      this.readLines(this.opts.readableinputs)
    }
  }

  /** @method uzwords
    * @private
    * @arg {string|buffer} filename
    */
  uzwords(filename) {
    this.pending++;
    const streamOut = zlib.createUnzip();
    const streamIn = fs.createReadStream(filename);
    this.readLines(streamIn.pipe(streamOut))
  }

  /** @method words
    * @private
    * @arg {string|buffer} filename
    */
  words(filename) {
    this.pending++;
    const streamIn = fs.createReadStream(filename);
    this.readLines(streamIn)
  }

  /** @method readLines
    * @private
    * @arg {readablestream} input
    */
  readLines(input) {
    const filter = s => this.opts.filter(s);
    const add = s => this[addOne](s);

    const rl = readline.createInterface({input})
    .on('line', line => filter(line) ? add(line) : 0)
    .on('close', () => !--this.pending ? this.emit('ready', this) : -1)
  }

  /** @async
    * @method generate
    * @arg {integer as number} numWords - amount of words to generate
    * @arg {boolean} unique - whether they're unique or not.
    // * @arg {boolean|string} join - to join or not to join.
    * @returns {Promise<array[...string]>} the result from generation
    */
  generate(opts = {}) {
    if (typeof opts === 'number') opts = {numWords: opts};;


    if (this.ready) return this[GENERATE](opts)
    else return new Promise((res, rej) => {
      this.onReady.then(self => self[GENERATE](opts).then(res, rej))
    });;
  }

  [GENERATE]({numWords = this.opts.numWords, unique = true} = {}) {
    if (numWords > this.wordList.length-1) return Promise.reject(
      new RangeError(`Cannot generate ${
        numWords}, only ${this.wordList.length
        -1} available`)
    )

    return randomInts({
      min: 0, max: this.wordList.length-1, num: numWords, unique
    }).then(res => res.map(i => this.wordList[i]))
  }

  delete(...items) {
    return new Promise((res, rej) => {
      if (this.ready) return res(this[DELETE](items))
      else this.onReady.then(self => res(self[DELETE](items)))
    });
  }
  [DELETE](items) {
    const f = items.length;
    const n = this.wordList.length;
    let iter = 0;
    let removed = 0;
    let errs = []
    if ((Math.log2(n) * f) < (n / f)) {
      console.log('Using bIndexOf');
      items.forEach(item => {
        let idx = this.wordList.indexOf(item);
        if (idx > -1) {
          console.log('Found %s at %d', this.wordList[idx], idx);
          if (delete this.wordList[idx]) removed++
        } else {
          errs.push(new Error('Unable to find item ' + item))
        }
      })
    } else {
      this.wordList = this.wordList.filter(
        item => items.includes(item) ? (++removed, false) : true
      )
    }
    return {removed, errs}
  }
}

module.exports = xkcdPassword;
