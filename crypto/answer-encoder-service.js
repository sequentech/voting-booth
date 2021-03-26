/**
 * This file is part of agora-gui-booth.
 * Copyright (C) 2015-2016  Agora Voting SL <agora@agoravoting.com>

 * agora-gui-booth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.

 * agora-gui-booth  is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with agora-gui-booth.  If not, see <http://www.gnu.org/licenses/>.
**/

/*
 * Encodes/Decodes the answer to a question given the question type.
 *
 * The encoder function always receives answer as a list of answer ids.
 */
angular
  .module('avCrypto')
  .service(
    'AnswerEncoderService',
    function(
      DeterministicJsonStringifyService,
      MixedRadixService
    )
    {
      var stringify = DeterministicJsonStringifyService;
      var mixedRadix = MixedRadixService;

      function toBigIntArray(intArray)
      {
        return _.map(
          intArray,
          function (intValue)
          {
            return new BigInt("" + intValue, 10);
          }
        );
      }

      function fromBigIntArray(bigIntArray)
      {
        return _.map(
          bigIntArray,
          function (bigIntValue)
          {
            return parseInt(bigIntValue.toString(), 10);
          }
        );
      }

      // TODO: deduplicate these functions

      /**
       * @returns true if the url with the specific title and url appears in the
       * urls list.
       */
      function hasUrl(urls, title, url)
      {
        const u = _.find(
          urls,
          function(urlObject)
          {
            return urlObject.title === title && urlObject.url === url;
          }
        );

        return !!u;
      }

      // source https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
      // Marshals a string to an Uint8Array.
      function encodeUTF8(s)
      {
        var i = 0, bytes = new Uint8Array(s.length * 4);
        for (var ci = 0; ci !== s.length; ci++) {
          var c = s.charCodeAt(ci);
          if (c < 128) {
            bytes[i++] = c;
            continue;
          }
          if (c < 2048) {
            bytes[i++] = c >> 6 | 192;
          } else {
            if (c > 0xd7ff && c < 0xdc00) {
              if (++ci >= s.length) {
                throw new Error('UTF-8 encode: incomplete surrogate pair');
              }
              var c2 = s.charCodeAt(ci);
              if (c2 < 0xdc00 || c2 > 0xdfff) {
                throw new Error('UTF-8 encode: second surrogate character 0x' + c2.toString(16) + ' at index ' + ci + ' out of range');
              }
              c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
              bytes[i++] = c >> 18 | 240;
              bytes[i++] = c >> 12 & 63 | 128;
            } else {
              bytes[i++] = c >> 12 | 224;
            }
            bytes[i++] = c >> 6 & 63 | 128;
          }
          bytes[i++] = c & 63 | 128;
        }
        return bytes.subarray(0, i);
      }

      // Unmarshals a string from an Uint8Array.
      function decodeUTF8(bytes)
      {
        var i = 0, s = '';
        while (i < bytes.length) {
          var c = bytes[i++];
          if (c > 127) {
            if (c > 191 && c < 224) {
              if (i >= bytes.length) {
                throw new Error('UTF-8 decode: incomplete 2-byte sequence');
              }
              c = (c & 31) << 6 | bytes[i++] & 63;
            } else if (c > 223 && c < 240) {
              if (i + 1 >= bytes.length) {
                throw new Error('UTF-8 decode: incomplete 3-byte sequence');
              }
              c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else if (c > 239 && c < 248) {
              if (i + 2 >= bytes.length) {
                throw new Error('UTF-8 decode: incomplete 4-byte sequence');
              }
              c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
            } else {
              throw new Error('UTF-8 decode: unknown multibyte start 0x' + c.toString(16) + ' at index ' + (i - 1));
            }
          }
          if (c <= 0xffff) {
            s += String.fromCharCode(c);
          } else if (c <= 0x10ffff) {
            c -= 0x10000;
            s += String.fromCharCode(c >> 10 | 0xd800);
            s += String.fromCharCode(c & 0x3FF | 0xdc00);
          } else {
            throw new Error('UTF-8 decode: code point 0x' + c.toString(16) + ' exceeds UTF-16 reach');
          }
        }
        return s;
      }

      function stringifyBigInt(obj)
      {
        if (Array.isArray(obj)) {
          var serialized = [];
          for(var i = 0; i < obj.length; i++) {
            serialized.push(stringifyBigInt(obj[i]));
          }
          return "[" + serialized.join(",") + "]";
        } else if (typeof(obj) === 'object' && obj.toString && typeof(obj.toString) === 'function') {
          return obj.toString();
        } else {
          return stringify(obj);
        }
      }

      var answerEncoder = function (question)
      {
        const requestedCodec = question.tally_type;
        const numAvailableOptions = question.answers.length;
        var multi = {
          validCodecs: [
            "plurality-at-large",
            "borda-nauru",
            "borda",
            "desborda3",
            "desborda2",
            "desborda",
            "borda-mas-madrid",
            "cumulative"
          ],
          numAvailableOptions: numAvailableOptions,
          question: angular.copy(question),

          /**
           * Obtains the bases related to this question.
           */
          getBases: function ()
          {
            // sort answers by id
            var sortedAnswers = _.sortBy(
              this.question.answers,
              function (option)
              {
                return option.id;
              }
            );

            const validAnwsers = _.filter(
              sortedAnswers,
              function (answer)
              {
                return (
                  !hasUrl(answer.urls, 'invalidVoteFlag', 'true')
                );
              }
            );

            // Calculate the base for answers. It depends on the
            // `question.tally_type`:
            // - plurality-at-large: base 2 (value can be either 0 o 1)
            // - preferential (*bordas*): question.max + 1
            // - cummulative: question.max + 1
            const answerBase = (this.question.tally_type === "plurality-at-large") ?
              2 : this.question.max + 1;

            // Set the initial bases and raw ballot. We will populate the rest
            // next.
            var bases = [2];

            // populate bases using the valid answers list
            _.each(validAnwsers, function (_) { bases.push(answerBase);});

            // populate with byte-sized bases for the \0 end for each write-in
            if (
              this.question.extra_options &&
              this.question.extra_options.allow_writeins
            ) {
              const writeInAnwsers = _.filter(
                sortedAnswers,
                function (answer)
                {
                  return hasUrl(answer.urls, 'isWriteIn', 'true');
                }
              );
              _.each(writeInAnwsers, function (_) { bases.push(256);});
            }

            return bases;
          },

          /**
           * Converts a raw ballot into an encoded number ready to be encrypted.
           * A raw ballot is a list of positive integer numbers representing
           * the ballot, and can be obtained calling to `this.encodeRawBallot()`.
           *
           * Encoding is done using mixed radix encoding. The bases are
           * automatically calculated when instancing this object. The bases
           * used are either the number of points assigned to each answer or the
           * position in which that answer was selected for preferential
           * elections. Please refer to mixed radix documentation to understand
           * how it works or read https://en.wikipedia.org/wiki/Mixed_radix
           *
           * # Basics
           *
           * If in a `plurality-at-large` there are three candidates `A`, `B`,
           * and `C` with answer ids `0`, `1` and `2`, and the voter wants to
           * vote to candidates `A` and `C`, then his ballot choices (obtained
           * using encodeRawBallot) will be  `v = [1, 0, 1]` and the encoded
           * choices will be encoded this way:
           *
           * ```
           * encodedChoices = v[0] + v[1]*b[0] + v[2]*b[0]*b[1]
           * encodedChoices = v[0] + b[0]*(v[1] + b[1]*v[2])
           * encodedChoices = 1 + 2*(0 + 2 * 1) = 1 + 4*1 = 5
           * ```
           *
           * And the bases are `b = [2, 2, 2]`. The reason the bases are 2 here
           * is because plurality-at-large is a non-preferential voting system
           * and each base is representing if the voter chose (then we use
           * `v[x] = 1`) or not (then we use `v[x] = 0`), and the base is in
           * this case max(v[x])+1`.
           *
           * # Preferential systems
           *
           * In a preferential system, the voter can choose a specific ordering.
           * If we reuse the previous example, the voter might have chosen for
           * the first choice in his ballot candidate `A`, and for his second
           * choice candidate `B`. Not choosing a candidate would be encoded as
           * value `0`, so choosing it as first position would be value `1` and
           * so on. If the voter can choose up to 3 candidates, then the base
           * would be `maxChoices+1 = 3+1 = 4`, and thus bases will be
           * `b = [4, 4, 4]` and choices would be `v = [1, 0, 2]` and the
           * encoded choices would be calculated as:
           *
           * ```
           * encodedChoices = v[0] + v[1]*b[1] + v[2]*b[1]*b[2]
           * encodedChoices = v[0] + b[0]*(v[1] + b[1]*v[2])
           * encodedChoices = 1 + 4*(0 + 4*2) = 1 + 16*2 = 33
           * ```
           *
           * # Invalid Ballot Flag
           *
           * What was outlined before is the basics, but actually it does not
           * work exactly like that. The first value (`v[0]`) in the raw ballot
           * does not really represent the vote for the first candidate answer,
           * but it's always a flag saying if the ballot was marked as invalid
           * or not by the voter. Note that this is not the only way to create
           * an invalid ballot. For example the voter could vote to more options
           * than allowed, and that would also be an invalid ballot.
           *
           * We asumes the invalid ballot flag is represented in the question
           * as a answer inside `question.answers` and it is flagged  by having
           * an element in `answer.urls` as
           * `{title: 'invalidVoteFlag', url: 'true'}`.
           *
           * Using the last example of a preferential vote, the bases would not
           * be `b = [4, 4, 4]` but `b = [2, 4, 4, 4]` (the first base encodes
           * always the invalid flag, whose max value is 1 so the base is always
           * 2).
           *
           * The choices would not be `v = [1, 0, 2]` but (if the vote was
           * not marked as invalid) `v = [0, 1, 0, 2]` and thus the encoded
           * choices would be calculated as:
           *
           * ```
           * encodedChoices = v[0] + b[0]*(v[1] + b[1]*(v[2] + b[2]*v[3])
           * encodedChoices = 0 + 2*(1 + 4*(0 + 4*2)) = 2*1 + 2*4*4*2
           * encodedChoices = 2*1 + 32*2 = 66
           * ```
           *
           * # Cumulative voting system
           *
           * In a cumulative voting system, the voter would have a total number
           * of integer points to assign to candidates, and the voter can assign
           * them to the available candidates with a maximum number of options
           * that can be assigned to each candidate.
           *
           * For example, the voter might be able to assign up to 2 points to
           * each candidate and assign a total of 3 points. In practice, the
           * encoding is done in a very similar format as with preferential
           * voting system. For each candidate, the value we assign is a number
           * that represents the points assigned to the candidate, and the base
           * used is the maximum number of assignable points plus one.
           *
           * Retaking the previous example used for plurality-at-large and used
           * for a preferential voting system, if the voter can assign a
           * maximum of 4 points, and he wants to assign 2 points to candidate
           * `A` and 2 points to candidate `C` and he didn't mark his ballot
           * as invalid, then his choices would be `v = [0, 2, 0, 1]`, the bases
           * would be `b = [2, 5, 5, 5]` and the encoded choices would be
           * calculated as:
           *
           * ```
           * encodedChoices = v[0] + b[0]*(v[1] + b[1]*(v[2] + b[2]*v[3])
           * encodedChoices = 0 + 2*(2 + 5*(0 + 5*1)) = 2*2 + 2*5*5*1
           * encodedChoices = 2*2 + 50*1 = 54
           * ```
           *
           * # Write-ins
           *
           * This encoder supports write-ins. The idea of write-ins is that the
           * voter can choose candidates that are not in the preconfigured list
           * of candidates. The maximum number of write-ins allowed is
           * calculated automatically by suppossing the voter tries to
           * distribute his vote entirely just for write-in candidates, which
           * is usually `question.max`.
           *
           * The vote for each write-in is encoded using the same procedure as
           * for normal candidates, in order and as if the write-ins were in
           * the list of candidates. It asumes all write-ins (even if not
           * selected) are in the list of candidates and they are flagged as
           * such simply by an element in `answer.urls` as
           * `{title: 'isWriteIn', url: 'true'}`.
           *
           * For example in a plurality-at-large question example with three
           * candidates `A`, `B` and `C` where the voter can choose up to 2
           * candidates, if the voter wants to cast a valid ballot to his 2
           * write-ins, then the bases, the choices and the encoded choices
           * would be:
           *
           * ```
           * // bases
           * b = [2, 2, 2, 2, 2, 2]
           * // choices
           * v = [0, 0, 0, 0, 1, 1]
           * encodedChoices = 1*2^4 + 1*2^5 = 48
           * ```
           *
           * # Write-in names
           *
           * Of course that's not where a vote with write-ins ends. If the voter
           * voted to the write-ins, we would also have to encode the free text
           * string of the name of the write-ins. This is done by converting the
           * text from UTF-8 to numeric bytes, and encoding each byte using
           * 2^8 = 256 as a base. The separation between the different write-in
           * names is done using an empty byte (so `v[x] = 0`).
           *
           * So if in our case the name of the voter's two write-ins is `D` and
           * `E`, and knowing that character D is encoded as number `68` and E
           * is `69`, then the bases, the choices and the encoded choices
           * would be:
           *
           * ```
           * // bases
           * b = [2, 2, 2, 2, 2, 2, 256, 256, 256, 256]
           * // choices
           * v = [0, 0, 0, 0, 1, 1, 68,  0,   69,  0]
           * encodedChoices = 1*(2**4) + 1*(2**5) + 68*(2**6) + 69*(2**6)*(256**2) = 289411376
           * ```
           */
          encodeToBigInt: function(rawBallot)
          {
            const bigIntRawBallot = {
              choices: _.map(
                rawBallot.choices,
                function (intValue)
                {
                  return new BigInt("" + intValue, 10);
                }
              ),
              bases: _.map(
                rawBallot.bases,
                function (intValue)
                {
                  return new BigInt("" + intValue, 10);
                }
              )
            };
            return mixedRadix.encode(
              /*valueList = */bigIntRawBallot.choices,
              /*baseList = */bigIntRawBallot.bases
            );
          },

          /**
           * Does exactly the reverse of of encodeFromBigInt. It should be
           * such as the following statement is always true:
           *
           * ```
           * data == codec.decodeFromBigInt(
           *   codec.encodeFromBigInt(answer)
           * )
           * ```
           *
           * This function is very useful for sanity checks.
           */
          decodeFromBigInt: function(bigIntBallot)
          {
            var bases = this.getBases();
            const bigIntBases = _.map(
              bases,
              function (intValue)
              {
                return new BigInt("" + intValue, 10);
              }
            );
            const bigIntChoices = mixedRadix.decode(
              /*baseList = */ bigIntBases,
              /*encodedValue = */ bigIntBallot,
              /* lastBase = */ new BigInt("256", 10)
            );
            const choices = fromBigIntArray(bigIntChoices);

            // minor changes are required for the write-ins
            if (
              this.question.extra_options &&
              this.question.extra_options.allow_writeins
            ) {
              // add missing byte bases and last \0 in the choices
              if (bases.length < choices.length)
              {
                choices.push(0);
              }

              for (var index = bases.length + 1; index <= choices.length; index++)
              {
                bases.push(256);
              }
            }
            return {
              choices: choices,
              bases: bases
            };
          },

          /**
           * @returns the ballot choices and the bases to be used for encoding
           * as an object, for example something like:
           *
           * ```
           * {
           *   choices: [0, 0, 0, 0, 1, 1, 68,  0,   69,  0],
           *   bases: [2, 2, 2, 2, 2, 2, 256, 256, 256, 256]
           * }
           * ```
           *
           * Please read the description of the encode function for details on
           * the output format of the raw ballot.
           */
          encodeRawBallot: function()
          {
            // sort answers by id
            var sortedAnswers = _.sortBy(
              this.question.answers,
              function (option)
              {
                return option.id;
              }
            );

            // Separate the answers between:
            // - Invalid vote answer (if any)
            // - Write-ins (if any)
            // - Valid answers (normal answers + write-ins if any)
            const invalidVoteAnswer = _.find(
              sortedAnswers,
              function (answer)
              {
                return hasUrl(answer.urls, 'invalidVoteFlag', 'true');
              }
            );
            const invalidVoteFlag = invalidVoteAnswer && (invalidVoteAnswer.selected > -1) ?
              1 : 0;

            const writeInAnwsers = _.filter(
              sortedAnswers,
              function (answer)
              {
                return hasUrl(answer.urls, 'isWriteIn', 'true');
              }
            );

            const validAnwsers = _.filter(
              sortedAnswers,
              function (answer)
              {
                return (
                  !hasUrl(answer.urls, 'invalidVoteFlag', 'true')
                );
              }
            );

            // Set the initial bases and raw ballot. We will populate the rest
            // next.
            var bases = this.getBases();
            var choices = [invalidVoteFlag];

            // populate rawBallot and bases using the valid answers list
            var tally_type = this.question.tally_type;
            _.each(
              validAnwsers,
              function (answer)
              {
                if (tally_type === 'plurality-at-large')
                {
                  // We just flag if the candidate was selected or not with 1
                  // for selected and 0 otherwise
                  const answerValue = (
                    !angular.isDefined(answer.selected) ||
                    answer.selected === null ||
                    answer.selected === -1
                  ) ? 0 : 1;
                  choices.push(answerValue);
                }
                else
                {
                  // we add 1 because the counting starts with 1, as zero means
                  // this answer was not voted / ranked
                  const answerValue = (
                    !angular.isDefined(answer.selected) ||
                    answer.selected === null
                  ) ? 0 : answer.selected + 1;
                  choices.push(answerValue);
                }
              }
            );

            // Populate the bases and the rawBallot values with the write-ins
            // if there's any. We will through each write-in (if any), and then
            // encode the write-in answer.text string with UTF-8 and use for
            // each byte a specific value with base 256 and end each write-in
            // with a \0 byte. Note that even write-ins.
            if (
              this.question.extra_options &&
              this.question.extra_options.allow_writeins
            )
            {
              _.each(
                writeInAnwsers,
                function (answer)
                {
                  if (!answer.text || answer.text.length === 0)
                  {
                    // we don't do a bases.push(256) as this is done in getBases()
                  // end it with a zero
                    choices.push(0);
                    return;
                  }

                  const encodedText = encodeUTF8(answer.text);
                  _.each(
                    encodedText,
                    function (textByte)
                    {
                      bases.push(256);
                      choices.push(textByte);
                    }
                  );

                  // end it with a zero
                  // we don't do a bases.push(256) as this is done in getBases()
                  choices.push(0);
                }
              );
            }

            return {
              bases: bases,
              choices: choices
            };
          },

          /**
           * Does the opposite of `this.encodeRawBallot`.
           *
           * @returns `this.questions` with the data from the raw ballot.
           */
          decodeRawBallot: function(rawBallot)
          {
            // 1. clone the question and reset the selections
            var question = angular.copy(this.question);
            _.each(
              question.answers,
              function (answer)
              {
                answer.selected = -1;
              }
            );

            // 2. sort & segment answers
            // 2.1. sort answers by id
            var sortedAnswers = _.sortBy(
              question.answers,
              function (option)
              {
                return option.id;
              }
            );

            // 3. Obtain the invalidVote flag and set it.
            const invalidVoteAnswer = _.find(
              sortedAnswers,
              function (answer)
              {
                return hasUrl(answer.urls, 'invalidVoteFlag', 'true');
              }
            );
            if (angular.isDefined(invalidVoteAnswer))
            {
              if(rawBallot.choices[0] > 0)
              {
                invalidVoteAnswer.selected = 0;
              } else {
                invalidVoteAnswer.selected = -1;
              }
            }

            // 4. Do some verifications on the number of choices:
            // Checking that the rawBallot has as many choices as required
            const minNumChoices = question.answers.length;
            if (rawBallot.choices.length < minNumChoices)
            {
              throw new Error('Invalid Ballot: Not enough choices to decode');
            }

            // 5. Obtain the vote for valid answers and populate the selections.
            const validAnwsers = _.filter(
              sortedAnswers,
              function (answer)
              {
                return (
                  !hasUrl(answer.urls, 'invalidVoteFlag', 'true')
                );
              }
            );

            // 5.1. Populate the valid answers. We asume they are in the same
            // order as in rawBallot.choices
            _.each(
              validAnwsers,
              function (answer, index)
              {
                // we add 1 to the index because rawBallot.choice[0] is just the
                // invalidVoteFlag
                const choiceIndex = index + 1;
                answer.selected = rawBallot.choices[choiceIndex] - 1;
              }
            );

            // 6. Filter for the write ins, decode the write-in texts into
            //    UTF-8 and split by the \0 character, finally the text for the
            //    write-ins.
            if (
              this.question.extra_options &&
              this.question.extra_options.allow_writeins
            )
            {
              const writeInAnswers = _.filter(
                sortedAnswers,
                function (answer)
                {
                  return hasUrl(answer.urls, 'isWriteIn', 'true');
                }
              );
              // if no write ins, return
              if (writeInAnswers.length === 0)
              {
                return question;
              }

              // 6.1. Slice the choices to get only the bytes related to the write ins
              const writeInRawBytes = rawBallot.choices.slice(question.answers.length);

              // 6.2. Split the write-in bytes arrays in multiple sub-arrays
              // using byte \0 as a separator.
              var writeInsRawBytesArray = [ [] ];
              _.each(
                writeInRawBytes,
                function (byteElement, index)
                {
                  if(byteElement === 0)
                  {
                    // Start the next write-in byte array, but only if this is
                    // not the last one
                    if (index !== writeInRawBytes.length - 1)
                    {
                      writeInsRawBytesArray.push([]);
                    }
                  }
                  else
                  {
                    const lastIndex = writeInsRawBytesArray.length-1;
                    writeInsRawBytesArray[lastIndex].push(byteElement);
                  }
                }
              );
              if (writeInsRawBytesArray.length !== writeInAnswers.length)
              {
                throw new Error(
                  "Invalid Ballot: invalid number of write-in bytes," +
                  " writeInsRawBytesArray.length = " + writeInsRawBytesArray.length +
                  ", writeInAnswers.length = " + writeInAnswers.length +
                  ", writeInsRawBytesArray = " + stringify(writeInsRawBytesArray)
                );
              }

              // 6.3. Decode each write-in byte array
              const writeInDecoded = _.map(
                writeInsRawBytesArray,
                function (writeInEncodedUtf8)
                {
                  return decodeUTF8(writeInEncodedUtf8);
                }
              );

              // 6.4. Assign the write-in name for each write in
              _.each (
                writeInAnswers,
                function (writeInAnswer, index)
                {
                  writeInAnswer.text = writeInDecoded[index];
                }
              );
            }

            return question;
          },

          /**
           * Sanity check with a specific manual example, to see that encoding
           * and decoding works as expected.
           * 
           * If modulus is given, it will also verify that the biggest encodable
           * number (without write-ins) works, and that the number of bytes left
           * for the current ballot given to the encoder on construction is not
           * negative.
           *
           * @returns true if the test checks out
           */
           sanityCheck: function(modulus)
          {
            try {
              const data = {
                question: {
                  tally_type: "plurality-at-large",
                  max: 3,
                  extra_options: {allow_writeins: true},
                  answers: [
                    {id: 0},
                    {id: 1},
                    {id: 2},
                    {
                      id: 3,
                      urls: [{title: 'invalidVoteFlag', url: 'true'}]
                    },
                    {
                      id: 4,
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    },
                    {
                      id: 5,
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    },
                    {
                      id: 6,
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    }
                  ]
                },
                ballot: {
                  tally_type: "plurality-at-large",
                  max: 3,
                  extra_options: {allow_writeins: true},
                  answers: [
                    {id: 0, selected: 0 },
                    {id: 1, selected: -1},
                    {id: 2, selected: -1},
                    {
                      id: 3,
                      selected: -1,
                      urls: [{title: 'invalidVoteFlag', url: 'true'}]
                    },
                    {
                      id: 4,
                      text: 'E',
                      selected: 0,
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    },
                    {
                      id: 5,
                      selected: -1,
                      text: '',
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    },
                    {
                      id: 6,
                      selected: 0,
                      text: 'Ä bc',
                      urls: [{title: 'isWriteIn', url: 'true'}]
                    }
                  ]
                },
                rawBallot: {
                  bases:     [2, 2, 2, 2, 2, 2, 2, 256, 256, 256, 256, 256, 256, 256, 256, 256],
                  choices:   [0, 1, 0, 0, 1, 0, 1, 69,  0,   0,   195, 132, 32,  98,  99,  0]
                },
                bigIntBallot: new BigInt("916649230342635397842", 10)
              };
              // 1. encode from ballot to rawBallot and test it
              var encoder = answerEncoder(data.ballot);
              const rawBallot = encoder.encodeRawBallot();
              if (stringify(rawBallot) !== stringify(data.rawBallot))
              {
                throw new Error("Sanity Check fail");
              }

              // 2. encode from rawBallot to BigInt and test it
              const bigIntBallot = encoder.encodeToBigInt(rawBallot);
              if (stringifyBigInt(bigIntBallot) !== stringifyBigInt(data.bigIntBallot))
              {
                throw new Error("Sanity Check fail");
              }

              // 3. create a pristine encoder using the question without any selection
              // set, and decode from BigInt to rawBallot and test it
              var decoder = answerEncoder(data.question);
              const decodedRawBallot = decoder.decodeFromBigInt(data.bigIntBallot);
              if (stringify(decodedRawBallot) !== stringify(data.rawBallot))
              {
                throw new Error("Sanity Check fail");
              }

              // 4. decode from raw ballot to ballot and test it
              const decodedBallot = decoder.decodeRawBallot(decodedRawBallot);
              if (stringify(decodedBallot) !== stringify(data.ballot))
              {
                throw new Error("Sanity Check fail");
              }

              // 5. verify modulus
              if (angular.isDefined(modulus))
              {
                // verify that current ballot does not overflow
                const rawBallot = this.encodeRawBallot();
                const intBallot = this.encodeToBigInt(rawBallot);
                /* jshint ignore:start */
                if (modulus.compareTo(intBallot.add(BigInteger.ONE)) <= 0)
                {
                  throw new Error("Sanity Check fail");
                }

                // verify that the bigger normal ballot does not overflow
                const biggestBallot = this.biggestEncodableNormalBallot();
                if (modulus.compareTo(biggestBallot.add(BigInteger.ONE)) <= 0)
                {
                  throw new Error("Sanity Check fail");
                }
                /* jshint ignore:end */
              }
            }
            catch (e)
            {
              return false;
            }

            return true;
          },

          /**
           * @returns the biggest encodable ballot that doesn't include any
           * write-in text (or they are empty strings) encoded as a big int
           * voting to non-write-ins.
           *
           * Used to know if the ballot would overflow, for example during
           * election creation, because it contains too many options.
           */
          biggestEncodableNormalBallot: function()
          {
            const bases = this.getBases();

            // calculate the biggest number that can be encoded with the
            // minumum number of bases, which should be bigger than modulus
            const highestValueList = _.map(
              bases,
              function (base)
              {
                return base - 1;
              }
            );
            const highestBigInt = mixedRadix.encode(
              toBigIntArray(highestValueList),
              toBigIntArray(bases)
            );
            return highestBigInt;
          },

          /**
           * @returns the numbers of ASCII characters left to encode a number
           * not bigger than the BigInt modulus given as input.
           */
          numWriteInBytesLeft: function (modulus)
          {
            // The calculations here do not make sense when there are no
            // write-ins
            if (
              !this.question.extra_options ||
              !this.question.extra_options.allow_writeins
            ) {
              throw new Error("Contest does not have write-ins");
            }

            // Sanity check: modulus needs to be bigger than the biggest
            // encodable normal ballot plus one because the encryption always
            // adds one
            const bases = this.getBases();
            const highestBigInt = this.biggestEncodableNormalBallot();
            /* jshint ignore:start */
            if (modulus.compareTo(highestBigInt.add(BigInteger.ONE)) <= 0)
            {
              throw new Error("modulus too small");
            }
            /* jshint ignore:end */

            // If we decode the modulus minus one, the value will be the highest
            // encodable number plus one, given the set of bases for this 
            // question and using 256 as the lastBase.
            // However, as it overflows the maximum the maximum encodable 
            // number, the last byte (last base) is unusable and it should be
            // discarded. That is why maxBaseLength is obtained by using
            // decodedModulus.length - 1
            const decodedModulus  = mixedRadix.decode(
              /* baseList = */ toBigIntArray(bases),
              /* encodedValue = */ modulus.subtract(new BigInt("1", 10)),
              new BigInt("256", 10)
            );
            const encodedRawBallot = this.encodeRawBallot();
            const maxBaseLength = decodedModulus.length - 1;

            // As we know that the modulus is big enough for a ballot with no
            // write-ins and because we know all extra bases will be bytes,
            // the difference between the number of bases used for encoding the
            // ballot and the number of bases used to encode the modulus is the
            // number of byte bases left
            return maxBaseLength - encodedRawBallot.bases.length;
          }
        };

        var codecs = [multi];

        var foundCodec = _.find(
          codecs,
          function (codec)
          {
            return _.contains(codec.validCodecs, requestedCodec);
          }
        );

        if (!foundCodec)
        {
          throw "unknown answer encoding service requested: " + requestedCodec;
        }

        return foundCodec;
      };
      return answerEncoder;
    })
  ;
